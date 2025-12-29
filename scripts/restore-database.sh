#!/bin/bash
# Database Restore Script for Takumi Platform
# Restores PostgreSQL database from backup with AES-256-GCM decryption support

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/takumi/database}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-takumi}"
DB_USER="${DB_USER:-postgres}"

# Encryption configuration
ENCRYPTION_KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"  # Path to encryption key file

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh "${BACKUP_DIR}"/takumi_db_*.sql.gz* 2>/dev/null | grep -E '\.(sql\.gz|sql\.gz\.enc)$' | tail -n 10
  exit 1
fi

BACKUP_FILE="$1"
IS_ENCRYPTED=false

# Detect if backup is encrypted
if [[ "${BACKUP_FILE}" == *.enc ]]; then
  IS_ENCRYPTED=true
  echo "Detected encrypted backup file"
  
  # Validate encryption key is available
  if [ -z "${ENCRYPTION_KEY_FILE}" ]; then
    echo "ERROR: BACKUP_ENCRYPTION_KEY_FILE must be set to decrypt encrypted backups"
    echo "See docs/SECURITY_SECRETS.md for key management instructions"
    exit 1
  fi
  
  if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
    echo "ERROR: Encryption key file not found: ${ENCRYPTION_KEY_FILE}"
    exit 1
  fi
  
  # Verify IV file exists
  if [ ! -f "${BACKUP_FILE}.iv" ]; then
    echo "ERROR: IV file not found: ${BACKUP_FILE}.iv"
    echo "Encrypted backups require an IV file for decryption"
    exit 1
  fi
fi

# Verify backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Verify checksum if available
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "Verifying backup integrity..."
  if sha256sum -c "${BACKUP_FILE}.sha256"; then
    echo "Checksum verification passed"
  else
    echo "ERROR: Checksum verification failed!"
    exit 1
  fi
else
  echo "WARNING: No checksum file found, skipping integrity check"
fi

# Decrypt backup if encrypted
DECRYPTED_FILE="${BACKUP_FILE}"
if [ "${IS_ENCRYPTED}" = true ]; then
  echo "Decrypting backup..."
  
  # Read encryption key and IV
  ENCRYPTION_KEY=$(cat "${ENCRYPTION_KEY_FILE}")
  IV=$(cat "${BACKUP_FILE}.iv")
  
  # Create temporary file for decrypted backup
  DECRYPTED_FILE=$(mktemp)
  
  # Decrypt using AES-256-GCM
  openssl enc -aes-256-gcm -d \
    -in "${BACKUP_FILE}" \
    -out "${DECRYPTED_FILE}" \
    -K "${ENCRYPTION_KEY}" \
    -iv "${IV}" \
    -pbkdf2
  
  if [ ! -f "${DECRYPTED_FILE}" ] || [ ! -s "${DECRYPTED_FILE}" ]; then
    echo "ERROR: Decryption failed!"
    rm -f "${DECRYPTED_FILE}"
    exit 1
  fi
  
  echo "Decryption successful"
fi

# Confirmation prompt
echo "WARNING: This will restore the database from backup and overwrite current data!"
echo "Backup file: ${BACKUP_FILE}"
echo "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Create a pre-restore backup
echo "Creating pre-restore backup..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_${TIMESTAMP}.sql.gz"
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=plain \
  --no-owner \
  --no-acl \
  2>&1 | gzip > "${PRE_RESTORE_BACKUP}"
echo "Pre-restore backup saved: ${PRE_RESTORE_BACKUP}"

# Terminate active connections
echo "Terminating active database connections..."
PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Dropping and recreating database..."
PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS ${DB_NAME};"

PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d postgres \
  -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
echo "Restoring database from backup..."
gunzip -c "${DECRYPTED_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --single-transaction

# Cleanup decrypted temporary file if it was created
if [ "${IS_ENCRYPTED}" = true ]; then
  echo "Cleaning up decrypted temporary file..."
  rm -f "${DECRYPTED_FILE}"
fi

echo "Database restore completed successfully at $(date)"
echo "Pre-restore backup available at: ${PRE_RESTORE_BACKUP}"
