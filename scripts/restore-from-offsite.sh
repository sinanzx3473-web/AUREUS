#!/bin/bash
# Restore from Offsite Backup Script
# Downloads and restores encrypted backups from remote storage

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/takumi}"
OFFSITE_PROVIDER="${OFFSITE_PROVIDER:-s3}"
S3_BUCKET="${S3_BUCKET:-}"
S3_REGION="${S3_REGION:-us-east-1}"
GCS_BUCKET="${GCS_BUCKET:-}"
AZURE_CONTAINER="${AZURE_CONTAINER:-}"
RESTORE_DIR="${BACKUP_ROOT}/offsite_restore"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Encryption settings
ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE:-/etc/takumi/backup-encryption.key}"

# Logging
LOG_FILE="${BACKUP_ROOT}/logs/offsite_restore_${TIMESTAMP}.log"
mkdir -p "$(dirname "${LOG_FILE}")"

log() {
  echo "[$(date -Iseconds)] $1" | tee -a "${LOG_FILE}"
}

error_exit() {
  log "ERROR: $1"
  exit 1
}

# Verify encryption key exists
verify_encryption_key() {
  if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
    error_exit "Encryption key not found at ${ENCRYPTION_KEY_FILE}"
  fi
}

# List available backups from S3
list_s3_backups() {
  local backup_type="$1"  # database, contracts, files
  
  log "Listing ${backup_type} backups from S3..."
  aws s3 ls "s3://${S3_BUCKET}/${backup_type}/" --region "${S3_REGION}" | \
    grep -E "\.enc$" | \
    awk '{print $4}' | \
    sort -r
}

# List available backups from GCS
list_gcs_backups() {
  local backup_type="$1"
  
  log "Listing ${backup_type} backups from GCS..."
  gsutil ls "gs://${GCS_BUCKET}/${backup_type}/*.enc" | \
    xargs -n1 basename | \
    sort -r
}

# List available backups from Azure
list_azure_backups() {
  local backup_type="$1"
  
  log "Listing ${backup_type} backups from Azure..."
  az storage blob list \
    --container-name "${AZURE_CONTAINER}" \
    --prefix "${backup_type}/" \
    --query "[?ends_with(name, '.enc')].name" \
    --output tsv | \
    xargs -n1 basename | \
    sort -r
}

# Download from S3
download_from_s3() {
  local remote_path="$1"
  local local_path="$2"
  
  log "Downloading from S3: s3://${S3_BUCKET}/${remote_path}"
  
  if aws s3 cp "s3://${S3_BUCKET}/${remote_path}" "${local_path}" \
    --region "${S3_REGION}" \
    >> "${LOG_FILE}" 2>&1; then
    
    # Download checksum if available
    aws s3 cp "s3://${S3_BUCKET}/${remote_path}.sha256" "${local_path}.sha256" \
      --region "${S3_REGION}" \
      >> "${LOG_FILE}" 2>&1 || true
    
    log "✓ Download completed: ${local_path}"
    return 0
  else
    error_exit "S3 download failed for ${remote_path}"
  fi
}

# Download from GCS
download_from_gcs() {
  local remote_path="$1"
  local local_path="$2"
  
  log "Downloading from GCS: gs://${GCS_BUCKET}/${remote_path}"
  
  if gsutil cp "gs://${GCS_BUCKET}/${remote_path}" "${local_path}" >> "${LOG_FILE}" 2>&1; then
    gsutil cp "gs://${GCS_BUCKET}/${remote_path}.sha256" "${local_path}.sha256" >> "${LOG_FILE}" 2>&1 || true
    log "✓ Download completed: ${local_path}"
    return 0
  else
    error_exit "GCS download failed for ${remote_path}"
  fi
}

# Download from Azure
download_from_azure() {
  local remote_path="$1"
  local local_path="$2"
  
  log "Downloading from Azure: ${AZURE_CONTAINER}/${remote_path}"
  
  if az storage blob download \
    --container-name "${AZURE_CONTAINER}" \
    --name "${remote_path}" \
    --file "${local_path}" \
    >> "${LOG_FILE}" 2>&1; then
    
    az storage blob download \
      --container-name "${AZURE_CONTAINER}" \
      --name "${remote_path}.sha256" \
      --file "${local_path}.sha256" \
      >> "${LOG_FILE}" 2>&1 || true
    
    log "✓ Download completed: ${local_path}"
    return 0
  else
    error_exit "Azure download failed for ${remote_path}"
  fi
}

# Generic download dispatcher
download_file() {
  local remote_path="$1"
  local local_path="$2"
  
  case "${OFFSITE_PROVIDER}" in
    s3)
      download_from_s3 "${remote_path}" "${local_path}"
      ;;
    gcs)
      download_from_gcs "${remote_path}" "${local_path}"
      ;;
    azure)
      download_from_azure "${remote_path}" "${local_path}"
      ;;
    *)
      error_exit "Unknown offsite provider: ${OFFSITE_PROVIDER}"
      ;;
  esac
}

# Verify downloaded file integrity
verify_integrity() {
  local file_path="$1"
  
  if [ -f "${file_path}.sha256" ]; then
    log "Verifying integrity: ${file_path}"
    if sha256sum -c "${file_path}.sha256" >> "${LOG_FILE}" 2>&1; then
      log "✓ Integrity verified"
      return 0
    else
      error_exit "Integrity check failed for ${file_path}"
    fi
  else
    log "WARNING: No checksum file found, skipping integrity check"
  fi
}

# Decrypt backup file
decrypt_file() {
  local encrypted_file="$1"
  local decrypted_file="${encrypted_file%.enc}"
  
  log "Decrypting: ${encrypted_file}"
  
  if openssl enc -d -aes-256-cbc \
    -in "${encrypted_file}" \
    -out "${decrypted_file}" \
    -pass file:"${ENCRYPTION_KEY_FILE}" \
    -pbkdf2 >> "${LOG_FILE}" 2>&1; then
    
    log "✓ Decryption completed: ${decrypted_file}"
    echo "${decrypted_file}"
    return 0
  else
    error_exit "Decryption failed for ${encrypted_file}"
  fi
}

# Restore database from offsite backup
restore_database() {
  local backup_name="$1"
  
  log "========================================="
  log "Restoring database from offsite backup"
  log "========================================="
  
  # Create restore directory
  mkdir -p "${RESTORE_DIR}/database"
  
  # Download encrypted backup
  local remote_path="database/${backup_name}"
  local local_encrypted="${RESTORE_DIR}/database/${backup_name}"
  download_file "${remote_path}" "${local_encrypted}"
  
  # Verify integrity
  verify_integrity "${local_encrypted}"
  
  # Decrypt backup
  local decrypted_file=$(decrypt_file "${local_encrypted}")
  
  # Restore using existing restore script
  log "Executing database restore..."
  bash "${SCRIPT_DIR}/restore-database-encrypted.sh" "${decrypted_file}"
  
  log "✓ Database restored successfully"
}

# Restore contracts from offsite backup
restore_contracts() {
  local snapshot_name="$1"
  
  log "========================================="
  log "Restoring contracts from offsite backup"
  log "========================================="
  
  # Create restore directory
  mkdir -p "${RESTORE_DIR}/contracts"
  
  # Download encrypted snapshot
  local remote_path="contracts/${snapshot_name}"
  local local_encrypted="${RESTORE_DIR}/contracts/${snapshot_name}"
  download_file "${remote_path}" "${local_encrypted}"
  
  # Verify integrity
  verify_integrity "${local_encrypted}"
  
  # Decrypt snapshot
  local decrypted_file=$(decrypt_file "${local_encrypted}")
  
  # Restore using existing restore script
  log "Executing contract restore..."
  bash "${SCRIPT_DIR}/restore-contracts-encrypted.sh" "${decrypted_file}"
  
  log "✓ Contracts restored successfully"
}

# Interactive restore menu
interactive_restore() {
  echo "========================================="
  echo "Offsite Backup Restore"
  echo "Provider: ${OFFSITE_PROVIDER}"
  echo "========================================="
  echo ""
  echo "Select restore type:"
  echo "1) Database"
  echo "2) Contracts"
  echo "3) Both (Full Restore)"
  echo "4) List available backups"
  echo "5) Exit"
  echo ""
  read -p "Enter choice [1-5]: " choice
  
  case $choice in
    1)
      # List database backups
      echo ""
      echo "Available database backups:"
      case "${OFFSITE_PROVIDER}" in
        s3) list_s3_backups "database" ;;
        gcs) list_gcs_backups "database" ;;
        azure) list_azure_backups "database" ;;
      esac
      echo ""
      read -p "Enter backup filename to restore: " db_backup
      restore_database "${db_backup}"
      ;;
    2)
      # List contract snapshots
      echo ""
      echo "Available contract snapshots:"
      case "${OFFSITE_PROVIDER}" in
        s3) list_s3_backups "contracts" ;;
        gcs) list_gcs_backups "contracts" ;;
        azure) list_azure_backups "contracts" ;;
      esac
      echo ""
      read -p "Enter snapshot filename to restore: " contract_snapshot
      restore_contracts "${contract_snapshot}"
      ;;
    3)
      # Full restore
      echo ""
      echo "Available database backups:"
      case "${OFFSITE_PROVIDER}" in
        s3) list_s3_backups "database" ;;
        gcs) list_gcs_backups "database" ;;
        azure) list_azure_backups "database" ;;
      esac
      echo ""
      read -p "Enter database backup filename: " db_backup
      
      echo ""
      echo "Available contract snapshots:"
      case "${OFFSITE_PROVIDER}" in
        s3) list_s3_backups "contracts" ;;
        gcs) list_gcs_backups "contracts" ;;
        azure) list_azure_backups "contracts" ;;
      esac
      echo ""
      read -p "Enter contract snapshot filename: " contract_snapshot
      
      restore_database "${db_backup}"
      restore_contracts "${contract_snapshot}"
      ;;
    4)
      # List all backups
      echo ""
      echo "=== Database Backups ==="
      case "${OFFSITE_PROVIDER}" in
        s3) list_s3_backups "database" ;;
        gcs) list_gcs_backups "database" ;;
        azure) list_azure_backups "database" ;;
      esac
      
      echo ""
      echo "=== Contract Snapshots ==="
      case "${OFFSITE_PROVIDER}" in
        s3) list_s3_backups "contracts" ;;
        gcs) list_gcs_backups "contracts" ;;
        azure) list_azure_backups "contracts" ;;
      esac
      
      echo ""
      interactive_restore
      ;;
    5)
      log "Restore cancelled by user"
      exit 0
      ;;
    *)
      echo "Invalid choice"
      interactive_restore
      ;;
  esac
}

# Main execution
main() {
  log "========================================="
  log "Offsite Backup Restore Tool"
  log "Provider: ${OFFSITE_PROVIDER}"
  log "========================================="
  
  # Verify prerequisites
  verify_encryption_key
  
  # Check if specific backup was provided as argument
  if [ $# -eq 2 ]; then
    local restore_type="$1"
    local backup_name="$2"
    
    case "${restore_type}" in
      database)
        restore_database "${backup_name}"
        ;;
      contracts)
        restore_contracts "${backup_name}"
        ;;
      *)
        error_exit "Invalid restore type: ${restore_type}"
        ;;
    esac
  else
    # Interactive mode
    interactive_restore
  fi
  
  log "========================================="
  log "Restore completed successfully"
  log "========================================="
}

# Execute main function
main "$@"
