#!/bin/bash
# Offsite Backup Replication Script
# Replicates encrypted backups to remote S3/cloud storage with verification

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/takumi}"
OFFSITE_PROVIDER="${OFFSITE_PROVIDER:-s3}"  # s3, gcs, azure
S3_BUCKET="${S3_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
GCS_BUCKET="${GCS_BUCKET:-}"
AZURE_CONTAINER="${AZURE_CONTAINER:-}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Encryption settings
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/takumi/backup-encryption.key}"
ENCRYPTION_ALGORITHM="AES-256-CBC"

# Logging
LOG_FILE="${BACKUP_ROOT}/logs/offsite_replication_${TIMESTAMP}.log"
mkdir -p "$(dirname "${LOG_FILE}")"

log() {
  echo "[$(date -Iseconds)] $1" | tee -a "${LOG_FILE}"
}

error_exit() {
  log "ERROR: $1"
  notify_failure "$1"
  exit 1
}

notify_failure() {
  if [ -n "${SLACK_WEBHOOK}" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"❌ Offsite replication failed: $1\"}" \
      "${SLACK_WEBHOOK}" 2>/dev/null || true
  fi
}

notify_success() {
  if [ -n "${SLACK_WEBHOOK}" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"✅ Offsite replication completed: $1\"}" \
      "${SLACK_WEBHOOK}" 2>/dev/null || true
  fi
}

# Verify encryption key exists
verify_encryption_key() {
  if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
    error_exit "Encryption key not found at ${ENCRYPTION_KEY_FILE}"
  fi
  
  # Verify key permissions (should be 600)
  KEY_PERMS=$(stat -c %a "${ENCRYPTION_KEY_FILE}" 2>/dev/null || stat -f %A "${ENCRYPTION_KEY_FILE}")
  if [ "${KEY_PERMS}" != "600" ]; then
    log "WARNING: Encryption key has insecure permissions (${KEY_PERMS}), should be 600"
  fi
}

# Upload to S3 with encryption verification
upload_to_s3() {
  local source_file="$1"
  local dest_path="$2"
  
  if [ -z "${S3_BUCKET}" ]; then
    error_exit "S3_BUCKET not configured"
  fi
  
  log "Uploading to S3: s3://${S3_BUCKET}/${dest_path}"
  
  # Upload with server-side encryption
  if aws s3 cp "${source_file}" "s3://${S3_BUCKET}/${dest_path}" \
    --region "${S3_REGION}" \
    --storage-class STANDARD_IA \
    --server-side-encryption AES256 \
    --metadata "backup-timestamp=${TIMESTAMP},encryption=aes256-cbc" \
    >> "${LOG_FILE}" 2>&1; then
    
    # Upload checksum
    aws s3 cp "${source_file}.sha256" "s3://${S3_BUCKET}/${dest_path}.sha256" \
      --region "${S3_REGION}" \
      --server-side-encryption AES256 \
      >> "${LOG_FILE}" 2>&1 || true
    
    # Verify upload
    REMOTE_SIZE=$(aws s3 ls "s3://${S3_BUCKET}/${dest_path}" --region "${S3_REGION}" | awk '{print $3}')
    LOCAL_SIZE=$(stat -c%s "${source_file}" 2>/dev/null || stat -f%z "${source_file}")
    
    if [ "${REMOTE_SIZE}" = "${LOCAL_SIZE}" ]; then
      log "✓ Upload verified: ${dest_path} (${LOCAL_SIZE} bytes)"
      return 0
    else
      error_exit "Upload verification failed: size mismatch (local: ${LOCAL_SIZE}, remote: ${REMOTE_SIZE})"
    fi
  else
    error_exit "S3 upload failed for ${source_file}"
  fi
}

# Upload to Google Cloud Storage
upload_to_gcs() {
  local source_file="$1"
  local dest_path="$2"
  
  if [ -z "${GCS_BUCKET}" ]; then
    error_exit "GCS_BUCKET not configured"
  fi
  
  log "Uploading to GCS: gs://${GCS_BUCKET}/${dest_path}"
  
  if gsutil -m cp "${source_file}" "gs://${GCS_BUCKET}/${dest_path}" >> "${LOG_FILE}" 2>&1; then
    gsutil -m cp "${source_file}.sha256" "gs://${GCS_BUCKET}/${dest_path}.sha256" >> "${LOG_FILE}" 2>&1 || true
    log "✓ GCS upload completed: ${dest_path}"
    return 0
  else
    error_exit "GCS upload failed for ${source_file}"
  fi
}

# Upload to Azure Blob Storage
upload_to_azure() {
  local source_file="$1"
  local dest_path="$2"
  
  if [ -z "${AZURE_CONTAINER}" ]; then
    error_exit "AZURE_CONTAINER not configured"
  fi
  
  log "Uploading to Azure: ${AZURE_CONTAINER}/${dest_path}"
  
  if az storage blob upload \
    --container-name "${AZURE_CONTAINER}" \
    --file "${source_file}" \
    --name "${dest_path}" \
    --tier Cool \
    >> "${LOG_FILE}" 2>&1; then
    
    az storage blob upload \
      --container-name "${AZURE_CONTAINER}" \
      --file "${source_file}.sha256" \
      --name "${dest_path}.sha256" \
      >> "${LOG_FILE}" 2>&1 || true
    
    log "✓ Azure upload completed: ${dest_path}"
    return 0
  else
    error_exit "Azure upload failed for ${source_file}"
  fi
}

# Generic upload dispatcher
upload_file() {
  local source_file="$1"
  local dest_path="$2"
  
  case "${OFFSITE_PROVIDER}" in
    s3)
      upload_to_s3 "${source_file}" "${dest_path}"
      ;;
    gcs)
      upload_to_gcs "${source_file}" "${dest_path}"
      ;;
    azure)
      upload_to_azure "${source_file}" "${dest_path}"
      ;;
    *)
      error_exit "Unknown offsite provider: ${OFFSITE_PROVIDER}"
      ;;
  esac
}

# Replicate database backups
replicate_database_backups() {
  log "Replicating database backups..."
  
  local db_backup_dir="${BACKUP_ROOT}/database"
  if [ ! -d "${db_backup_dir}" ]; then
    log "WARNING: Database backup directory not found"
    return 0
  fi
  
  # Find encrypted backups from last 7 days
  local backup_count=0
  while IFS= read -r backup_file; do
    if [ -f "${backup_file}" ]; then
      local filename=$(basename "${backup_file}")
      upload_file "${backup_file}" "database/${filename}"
      ((backup_count++))
    fi
  done < <(find "${db_backup_dir}" -name "takumi_db_*.sql.gz.enc" -type f -mtime -7)
  
  log "✓ Replicated ${backup_count} database backup(s)"
}

# Replicate contract snapshots
replicate_contract_snapshots() {
  log "Replicating contract snapshots..."
  
  local contract_backup_dir="${BACKUP_ROOT}/contracts"
  if [ ! -d "${contract_backup_dir}" ]; then
    log "WARNING: Contract backup directory not found"
    return 0
  fi
  
  # Find encrypted snapshots from last 7 days
  local snapshot_count=0
  while IFS= read -r snapshot_file; do
    if [ -f "${snapshot_file}" ]; then
      local filename=$(basename "${snapshot_file}")
      upload_file "${snapshot_file}" "contracts/${filename}"
      ((snapshot_count++))
    fi
  done < <(find "${contract_backup_dir}" -name "contract_snapshot_*.tar.gz.enc" -type f -mtime -7)
  
  log "✓ Replicated ${snapshot_count} contract snapshot(s)"
}

# Replicate file storage backups
replicate_file_backups() {
  log "Replicating file storage backups..."
  
  local file_backup_dir="${BACKUP_ROOT}/files"
  if [ ! -d "${file_backup_dir}" ]; then
    log "No file backups to replicate"
    return 0
  fi
  
  # Find encrypted file backups from last 7 days
  local file_count=0
  while IFS= read -r file_backup; do
    if [ -f "${file_backup}" ]; then
      local filename=$(basename "${file_backup}")
      upload_file "${file_backup}" "files/${filename}"
      ((file_count++))
    fi
  done < <(find "${file_backup_dir}" -name "files_*.tar.gz.enc" -type f -mtime -7)
  
  log "✓ Replicated ${file_count} file backup(s)"
}

# Cleanup old offsite backups
cleanup_old_backups() {
  log "Cleaning up old offsite backups (retention: ${RETENTION_DAYS} days)..."
  
  local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)
  
  case "${OFFSITE_PROVIDER}" in
    s3)
      # List and delete old S3 objects
      for prefix in "database/" "contracts/" "files/"; do
        aws s3 ls "s3://${S3_BUCKET}/${prefix}" --region "${S3_REGION}" | \
          awk '{print $4}' | \
          while read -r object; do
            # Extract date from filename (format: *_YYYYMMDD_*)
            if [[ "${object}" =~ _([0-9]{8})_ ]]; then
              local file_date="${BASH_REMATCH[1]}"
              if [ "${file_date}" -lt "${cutoff_date}" ]; then
                log "Deleting old backup: ${prefix}${object}"
                aws s3 rm "s3://${S3_BUCKET}/${prefix}${object}" --region "${S3_REGION}" >> "${LOG_FILE}" 2>&1 || true
              fi
            fi
          done
      done
      ;;
    gcs)
      # GCS lifecycle policies handle retention automatically
      log "GCS lifecycle policies manage retention"
      ;;
    azure)
      # Azure lifecycle management handles retention
      log "Azure lifecycle management handles retention"
      ;;
  esac
  
  log "✓ Cleanup completed"
}

# Generate replication report
generate_report() {
  local report_file="${BACKUP_ROOT}/reports/offsite_replication_${TIMESTAMP}.json"
  mkdir -p "$(dirname "${report_file}")"
  
  cat > "${report_file}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "provider": "${OFFSITE_PROVIDER}",
  "destination": {
    "s3_bucket": "${S3_BUCKET}",
    "s3_region": "${S3_REGION}",
    "gcs_bucket": "${GCS_BUCKET}",
    "azure_container": "${AZURE_CONTAINER}"
  },
  "encryption": {
    "algorithm": "${ENCRYPTION_ALGORITHM}",
    "key_file": "${ENCRYPTION_KEY_FILE}"
  },
  "retention_days": ${RETENTION_DAYS},
  "status": "success",
  "log_file": "${LOG_FILE}"
}
EOF
  
  log "Replication report: ${report_file}"
}

# Main execution
main() {
  log "========================================="
  log "Starting offsite backup replication"
  log "Provider: ${OFFSITE_PROVIDER}"
  log "========================================="
  
  # Verify prerequisites
  verify_encryption_key
  
  # Replicate all backup types
  replicate_database_backups
  replicate_contract_snapshots
  replicate_file_backups
  
  # Cleanup old backups
  cleanup_old_backups
  
  # Generate report
  generate_report
  
  log "========================================="
  log "Offsite replication completed successfully"
  log "========================================="
  
  notify_success "All backups replicated to ${OFFSITE_PROVIDER}"
}

# Execute main function
main
