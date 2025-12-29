#!/bin/bash
# Database Backup Script for Takumi Platform
# Automates PostgreSQL database backups with AES-256-GCM encryption, rotation and compression

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/takumi/database}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-takumi}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/takumi_db_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_DIR}/takumi_db_${TIMESTAMP}.sql.gz.enc"

# Encryption configuration
ENCRYPTION_ENABLED="${BACKUP_ENCRYPTION_ENABLED:-true}"
ENCRYPTION_KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"  # Path to encryption key file

# Validate encryption key is available if encryption is enabled
if [ "${ENCRYPTION_ENABLED}" = "true" ]; then
  if [ -z "${ENCRYPTION_KEY_FILE}" ]; then
    echo "ERROR: BACKUP_ENCRYPTION_KEY_FILE must be set when BACKUP_ENCRYPTION_ENABLED=true"
    echo "See docs/SECURITY_SECRETS.md for key management instructions"
    exit 1
  fi
  
  if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
    echo "ERROR: Encryption key file not found: ${ENCRYPTION_KEY_FILE}"
    exit 1
  fi
  
  # Verify key file permissions (must be 0600 or 0400)
  KEY_PERMS=$(stat -c %a "${ENCRYPTION_KEY_FILE}" 2>/dev/null || stat -f %A "${ENCRYPTION_KEY_FILE}" 2>/dev/null)
  if [ "${KEY_PERMS}" != "600" ] && [ "${KEY_PERMS}" != "400" ]; then
    echo "ERROR: Encryption key file has insecure permissions: ${KEY_PERMS}"
    echo "Run: chmod 600 ${ENCRYPTION_KEY_FILE}"
    exit 1
  fi
fi

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup at $(date)"
echo "Backup file: ${BACKUP_FILE}"

# Perform backup with compression
echo "Creating database dump..."
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=plain \
  --no-owner \
  --no-acl \
  --verbose \
  2>&1 | gzip > "${BACKUP_FILE}"

# Verify backup was created
if [ -f "${BACKUP_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "Compressed backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "ERROR: Backup file was not created!"
  exit 1
fi

# Encrypt backup if enabled
if [ "${ENCRYPTION_ENABLED}" = "true" ]; then
  echo "Encrypting backup with AES-256-GCM..."
  
  # Read encryption key from file
  ENCRYPTION_KEY=$(cat "${ENCRYPTION_KEY_FILE}")
  
  # Generate random IV (96 bits for GCM)
  IV=$(openssl rand -hex 12)
  
  # Encrypt using AES-256-GCM
  openssl enc -aes-256-gcm \
    -in "${BACKUP_FILE}" \
    -out "${ENCRYPTED_FILE}" \
    -K "${ENCRYPTION_KEY}" \
    -iv "${IV}" \
    -pbkdf2
  
  # Store IV alongside encrypted file for decryption
  echo "${IV}" > "${ENCRYPTED_FILE}.iv"
  
  # Verify encrypted file was created
  if [ -f "${ENCRYPTED_FILE}" ]; then
    ENCRYPTED_SIZE=$(du -h "${ENCRYPTED_FILE}" | cut -f1)
    echo "Encrypted backup created: ${ENCRYPTED_FILE} (${ENCRYPTED_SIZE})"
  else
    echo "ERROR: Encrypted backup file was not created!"
    exit 1
  fi
  
  # Create checksum of encrypted file
  sha256sum "${ENCRYPTED_FILE}" > "${ENCRYPTED_FILE}.sha256"
  echo "Encrypted checksum created: ${ENCRYPTED_FILE}.sha256"
  
  # Remove unencrypted backup for security
  echo "Removing unencrypted backup..."
  rm -f "${BACKUP_FILE}"
  
  # Update BACKUP_FILE variable to point to encrypted file
  FINAL_BACKUP="${ENCRYPTED_FILE}"
else
  # Create checksum for unencrypted backup
  sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
  echo "Checksum created: ${BACKUP_FILE}.sha256"
  FINAL_BACKUP="${BACKUP_FILE}"
fi

# Remove old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "takumi_db_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "takumi_db_*.sql.gz.enc" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "takumi_db_*.sql.gz.sha256" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "takumi_db_*.sql.gz.enc.sha256" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${BACKUP_DIR}" -name "takumi_db_*.sql.gz.enc.iv" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# List current backups
echo "Current backups:"
if [ "${ENCRYPTION_ENABLED}" = "true" ]; then
  ls -lh "${BACKUP_DIR}"/takumi_db_*.sql.gz.enc 2>/dev/null | tail -n 10 || echo "No encrypted backups found"
else
  ls -lh "${BACKUP_DIR}"/takumi_db_*.sql.gz 2>/dev/null | tail -n 10 || echo "No backups found"
fi

echo "Database backup completed at $(date)"
echo "Final backup: ${FINAL_BACKUP}"
