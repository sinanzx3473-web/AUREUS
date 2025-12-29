#!/bin/bash
# Quarterly Offsite Backup Restore Test
# Validates offsite backup integrity and restore procedures

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/takumi}"
TEST_RESTORE_DIR="${BACKUP_ROOT}/test_restore"
OFFSITE_PROVIDER="${OFFSITE_PROVIDER:-s3}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Test database configuration
TEST_DB_NAME="takumi_restore_test_${TIMESTAMP}"
TEST_DB_USER="${POSTGRES_USER:-postgres}"
TEST_DB_HOST="${POSTGRES_HOST:-localhost}"
TEST_DB_PORT="${POSTGRES_PORT:-5432}"

# Logging
LOG_FILE="${BACKUP_ROOT}/logs/offsite_restore_test_${TIMESTAMP}.log"
REPORT_FILE="${BACKUP_ROOT}/reports/offsite_restore_test_${TIMESTAMP}.json"
mkdir -p "$(dirname "${LOG_FILE}")"
mkdir -p "$(dirname "${REPORT_FILE}")"

log() {
  echo "[$(date -Iseconds)] $1" | tee -a "${LOG_FILE}"
}

error_exit() {
  log "ERROR: $1"
  cleanup_test_resources
  generate_failure_report "$1"
  exit 1
}

# Cleanup test resources
cleanup_test_resources() {
  log "Cleaning up test resources..."
  
  # Drop test database
  if psql -h "${TEST_DB_HOST}" -p "${TEST_DB_PORT}" -U "${TEST_DB_USER}" -lqt | cut -d \| -f 1 | grep -qw "${TEST_DB_NAME}"; then
    log "Dropping test database: ${TEST_DB_NAME}"
    psql -h "${TEST_DB_HOST}" -p "${TEST_DB_PORT}" -U "${TEST_DB_USER}" -c "DROP DATABASE ${TEST_DB_NAME};" >> "${LOG_FILE}" 2>&1 || true
  fi
  
  # Remove test restore directory
  if [ -d "${TEST_RESTORE_DIR}" ]; then
    log "Removing test restore directory"
    rm -rf "${TEST_RESTORE_DIR}"
  fi
  
  log "✓ Cleanup completed"
}

# Get latest offsite backup
get_latest_backup() {
  local backup_type="$1"  # database or contracts
  
  log "Finding latest ${backup_type} backup from ${OFFSITE_PROVIDER}..."
  
  case "${OFFSITE_PROVIDER}" in
    s3)
      aws s3 ls "s3://${S3_BUCKET}/${backup_type}/" --region "${S3_REGION}" | \
        grep -E "\.enc$" | \
        sort -r | \
        head -n 1 | \
        awk '{print $4}'
      ;;
    gcs)
      gsutil ls "gs://${GCS_BUCKET}/${backup_type}/*.enc" | \
        xargs -n1 basename | \
        sort -r | \
        head -n 1
      ;;
    azure)
      az storage blob list \
        --container-name "${AZURE_CONTAINER}" \
        --prefix "${backup_type}/" \
        --query "[?ends_with(name, '.enc')].name" \
        --output tsv | \
        xargs -n1 basename | \
        sort -r | \
        head -n 1
      ;;
    *)
      error_exit "Unknown offsite provider: ${OFFSITE_PROVIDER}"
      ;;
  esac
}

# Test database restore
test_database_restore() {
  log "========================================="
  log "Testing database restore from offsite"
  log "========================================="
  
  # Get latest database backup
  local latest_backup=$(get_latest_backup "database")
  if [ -z "${latest_backup}" ]; then
    error_exit "No database backups found in offsite storage"
  fi
  
  log "Latest backup: ${latest_backup}"
  
  # Create test restore directory
  mkdir -p "${TEST_RESTORE_DIR}/database"
  
  # Download backup
  log "Downloading backup..."
  case "${OFFSITE_PROVIDER}" in
    s3)
      aws s3 cp "s3://${S3_BUCKET}/database/${latest_backup}" \
        "${TEST_RESTORE_DIR}/database/${latest_backup}" \
        --region "${S3_REGION}" >> "${LOG_FILE}" 2>&1 || error_exit "Download failed"
      
      aws s3 cp "s3://${S3_BUCKET}/database/${latest_backup}.sha256" \
        "${TEST_RESTORE_DIR}/database/${latest_backup}.sha256" \
        --region "${S3_REGION}" >> "${LOG_FILE}" 2>&1 || true
      ;;
    gcs)
      gsutil cp "gs://${GCS_BUCKET}/database/${latest_backup}" \
        "${TEST_RESTORE_DIR}/database/${latest_backup}" >> "${LOG_FILE}" 2>&1 || error_exit "Download failed"
      
      gsutil cp "gs://${GCS_BUCKET}/database/${latest_backup}.sha256" \
        "${TEST_RESTORE_DIR}/database/${latest_backup}.sha256" >> "${LOG_FILE}" 2>&1 || true
      ;;
    azure)
      az storage blob download \
        --container-name "${AZURE_CONTAINER}" \
        --name "database/${latest_backup}" \
        --file "${TEST_RESTORE_DIR}/database/${latest_backup}" >> "${LOG_FILE}" 2>&1 || error_exit "Download failed"
      ;;
  esac
  
  log "✓ Download completed"
  
  # Verify integrity
  if [ -f "${TEST_RESTORE_DIR}/database/${latest_backup}.sha256" ]; then
    log "Verifying backup integrity..."
    cd "${TEST_RESTORE_DIR}/database"
    if sha256sum -c "${latest_backup}.sha256" >> "${LOG_FILE}" 2>&1; then
      log "✓ Integrity verified"
    else
      error_exit "Integrity check failed"
    fi
    cd - > /dev/null
  fi
  
  # Decrypt backup
  log "Decrypting backup..."
  local decrypted_file="${TEST_RESTORE_DIR}/database/${latest_backup%.enc}"
  if openssl enc -d -aes-256-cbc \
    -in "${TEST_RESTORE_DIR}/database/${latest_backup}" \
    -out "${decrypted_file}" \
    -pass file:"${ENCRYPTION_KEY_FILE}" \
    -pbkdf2 >> "${LOG_FILE}" 2>&1; then
    log "✓ Decryption successful"
  else
    error_exit "Decryption failed"
  fi
  
  # Create test database
  log "Creating test database: ${TEST_DB_NAME}"
  psql -h "${TEST_DB_HOST}" -p "${TEST_DB_PORT}" -U "${TEST_DB_USER}" \
    -c "CREATE DATABASE ${TEST_DB_NAME};" >> "${LOG_FILE}" 2>&1 || error_exit "Failed to create test database"
  
  # Restore to test database
  log "Restoring backup to test database..."
  gunzip -c "${decrypted_file}" | \
    psql -h "${TEST_DB_HOST}" -p "${TEST_DB_PORT}" -U "${TEST_DB_USER}" -d "${TEST_DB_NAME}" \
    >> "${LOG_FILE}" 2>&1 || error_exit "Database restore failed"
  
  log "✓ Database restored successfully"
  
  # Validate restored data
  log "Validating restored data..."
  local table_count=$(psql -h "${TEST_DB_HOST}" -p "${TEST_DB_PORT}" -U "${TEST_DB_USER}" -d "${TEST_DB_NAME}" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
  
  if [ "${table_count}" -gt 0 ]; then
    log "✓ Found ${table_count} tables in restored database"
  else
    error_exit "No tables found in restored database"
  fi
  
  # Check for critical tables
  local critical_tables=("profiles" "endorsements" "skill_claims")
  for table in "${critical_tables[@]}"; do
    if psql -h "${TEST_DB_HOST}" -p "${TEST_DB_PORT}" -U "${TEST_DB_USER}" -d "${TEST_DB_NAME}" \
      -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}');" | grep -q "t"; then
      
      local row_count=$(psql -h "${TEST_DB_HOST}" -p "${TEST_DB_PORT}" -U "${TEST_DB_USER}" -d "${TEST_DB_NAME}" \
        -t -c "SELECT COUNT(*) FROM ${table};" | xargs)
      log "✓ Table '${table}' exists with ${row_count} rows"
    else
      log "WARNING: Critical table '${table}' not found"
    fi
  done
  
  log "✓ Database restore test passed"
}

# Test contract restore
test_contract_restore() {
  log "========================================="
  log "Testing contract restore from offsite"
  log "========================================="
  
  # Get latest contract snapshot
  local latest_snapshot=$(get_latest_backup "contracts")
  if [ -z "${latest_snapshot}" ]; then
    log "WARNING: No contract snapshots found in offsite storage"
    return 0
  fi
  
  log "Latest snapshot: ${latest_snapshot}"
  
  # Create test restore directory
  mkdir -p "${TEST_RESTORE_DIR}/contracts"
  
  # Download snapshot
  log "Downloading snapshot..."
  case "${OFFSITE_PROVIDER}" in
    s3)
      aws s3 cp "s3://${S3_BUCKET}/contracts/${latest_snapshot}" \
        "${TEST_RESTORE_DIR}/contracts/${latest_snapshot}" \
        --region "${S3_REGION}" >> "${LOG_FILE}" 2>&1 || error_exit "Download failed"
      
      aws s3 cp "s3://${S3_BUCKET}/contracts/${latest_snapshot}.sha256" \
        "${TEST_RESTORE_DIR}/contracts/${latest_snapshot}.sha256" \
        --region "${S3_REGION}" >> "${LOG_FILE}" 2>&1 || true
      ;;
    gcs)
      gsutil cp "gs://${GCS_BUCKET}/contracts/${latest_snapshot}" \
        "${TEST_RESTORE_DIR}/contracts/${latest_snapshot}" >> "${LOG_FILE}" 2>&1 || error_exit "Download failed"
      ;;
    azure)
      az storage blob download \
        --container-name "${AZURE_CONTAINER}" \
        --name "contracts/${latest_snapshot}" \
        --file "${TEST_RESTORE_DIR}/contracts/${latest_snapshot}" >> "${LOG_FILE}" 2>&1 || error_exit "Download failed"
      ;;
  esac
  
  log "✓ Download completed"
  
  # Verify integrity
  if [ -f "${TEST_RESTORE_DIR}/contracts/${latest_snapshot}.sha256" ]; then
    log "Verifying snapshot integrity..."
    cd "${TEST_RESTORE_DIR}/contracts"
    if sha256sum -c "${latest_snapshot}.sha256" >> "${LOG_FILE}" 2>&1; then
      log "✓ Integrity verified"
    else
      error_exit "Integrity check failed"
    fi
    cd - > /dev/null
  fi
  
  # Decrypt snapshot
  log "Decrypting snapshot..."
  local decrypted_file="${TEST_RESTORE_DIR}/contracts/${latest_snapshot%.enc}"
  if openssl enc -d -aes-256-cbc \
    -in "${TEST_RESTORE_DIR}/contracts/${latest_snapshot}" \
    -out "${decrypted_file}" \
    -pass file:"${ENCRYPTION_KEY_FILE}" \
    -pbkdf2 >> "${LOG_FILE}" 2>&1; then
    log "✓ Decryption successful"
  else
    error_exit "Decryption failed"
  fi
  
  # Extract and validate
  log "Extracting snapshot..."
  local extract_dir="${TEST_RESTORE_DIR}/contracts/extracted"
  mkdir -p "${extract_dir}"
  tar -xzf "${decrypted_file}" -C "${extract_dir}" >> "${LOG_FILE}" 2>&1 || error_exit "Extraction failed"
  
  log "✓ Snapshot extracted successfully"
  
  # Validate contract files
  local contract_count=$(find "${extract_dir}" -name "*.sol" -type f | wc -l)
  if [ "${contract_count}" -gt 0 ]; then
    log "✓ Found ${contract_count} contract files"
  else
    log "WARNING: No contract files found in snapshot"
  fi
  
  log "✓ Contract restore test passed"
}

# Generate success report
generate_success_report() {
  cat > "${REPORT_FILE}" <<EOF
{
  "test_timestamp": "${TIMESTAMP}",
  "test_date": "$(date -Iseconds)",
  "status": "SUCCESS",
  "offsite_provider": "${OFFSITE_PROVIDER}",
  "tests": {
    "database_restore": {
      "status": "passed",
      "backup_file": "$(get_latest_backup database)",
      "test_database": "${TEST_DB_NAME}",
      "validation": "completed"
    },
    "contract_restore": {
      "status": "passed",
      "snapshot_file": "$(get_latest_backup contracts)",
      "validation": "completed"
    }
  },
  "next_test_due": "$(date -d '90 days' -Iseconds 2>/dev/null || date -v+90d -Iseconds)",
  "log_file": "${LOG_FILE}"
}
EOF
  
  log "Test report generated: ${REPORT_FILE}"
}

# Generate failure report
generate_failure_report() {
  local error_message="$1"
  
  cat > "${REPORT_FILE}" <<EOF
{
  "test_timestamp": "${TIMESTAMP}",
  "test_date": "$(date -Iseconds)",
  "status": "FAILED",
  "error": "${error_message}",
  "offsite_provider": "${OFFSITE_PROVIDER}",
  "log_file": "${LOG_FILE}"
}
EOF
  
  log "Failure report generated: ${REPORT_FILE}"
}

# Send notification
send_notification() {
  local status="$1"
  local message="$2"
  
  if [ -n "${SLACK_WEBHOOK}" ]; then
    local emoji="✅"
    [ "${status}" = "FAILED" ] && emoji="❌"
    
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"${emoji} Quarterly Offsite Restore Test: ${status}\n${message}\"}" \
      "${SLACK_WEBHOOK}" 2>/dev/null || true
  fi
}

# Main execution
main() {
  log "========================================="
  log "Quarterly Offsite Backup Restore Test"
  log "Provider: ${OFFSITE_PROVIDER}"
  log "========================================="
  
  # Verify prerequisites
  if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
    error_exit "Encryption key not found at ${ENCRYPTION_KEY_FILE}"
  fi
  
  # Run tests
  test_database_restore
  test_contract_restore
  
  # Cleanup
  cleanup_test_resources
  
  # Generate success report
  generate_success_report
  
  log "========================================="
  log "All restore tests passed successfully"
  log "========================================="
  
  send_notification "SUCCESS" "All offsite backup restore tests completed successfully"
  
  # Display summary
  echo ""
  echo "Test Summary:"
  cat "${REPORT_FILE}"
}

# Execute main function
main
