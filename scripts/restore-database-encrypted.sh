#!/bin/bash
# Encrypted Database Restore Script for Takumi Platform
# Restores PostgreSQL database from AES-256-GCM encrypted backup with verification

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/takumi/database}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-takumi}"
DB_USER="${DB_USER:-postgres}"
ENCRYPTION_KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <encrypted_backup_file>"
  echo ""
  echo "Available encrypted backups:"
  ls -lh "${BACKUP_DIR}"/takumi_db_*.sql.gz.enc 2>/dev/null | tail -n 10 || echo "No encrypted backups found"
  exit 1
fi

ENCRYPTED_FILE="$1"

# Verify encrypted backup file exists
if [ ! -f "${ENCRYPTED_FILE}" ]; then
  echo "ERROR: Encrypted backup file not found: ${ENCRYPTED_FILE}"
  exit 1
fi

# Verify encryption key is available
if [ -z "${ENCRYPTION_KEY_FILE}" ]; then
  echo "ERROR: BACKUP_ENCRYPTION_KEY_FILE must be set to decrypt backup"
  echo "See docs/SECURITY_SECRETS.md for key management instructions"
  exit 1
fi

if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
  echo "ERROR: Encryption key file not found: ${ENCRYPTION_KEY_FILE}"
  exit 1
fi

# Verify checksum if available
if [ -f "${ENCRYPTED_FILE}.sha256" ]; then
  echo "Verifying encrypted backup integrity..."
  if sha256sum -c "${ENCRYPTED_FILE}.sha256"; then
    echo "✅ Checksum verification passed"
  else
    echo "ERROR: Checksum verification failed!"
    exit 1
  fi
else
  echo "WARNING: No checksum file found, skipping integrity check"
fi

# Verify IV file exists
IV_FILE="${ENCRYPTED_FILE}.iv"
if [ ! -f "${IV_FILE}" ]; then
  echo "ERROR: IV file not found: ${IV_FILE}"
  echo "Cannot decrypt without initialization vector"
  exit 1
fi

# Confirmation prompt
echo "WARNING: This will restore the database from encrypted backup and overwrite current data!"
echo "Encrypted backup: ${ENCRYPTED_FILE}"
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

# Decrypt backup
echo "Decrypting backup..."
DECRYPTED_FILE="/tmp/takumi_restore_${TIMESTAMP}.sql.gz"

# Read encryption key and IV
ENCRYPTION_KEY=$(cat "${ENCRYPTION_KEY_FILE}")
IV=$(cat "${IV_FILE}")

# Decrypt using AES-256-GCM
openssl enc -aes-256-gcm -d \
  -in "${ENCRYPTED_FILE}" \
  -out "${DECRYPTED_FILE}" \
  -K "${ENCRYPTION_KEY}" \
  -iv "${IV}" \
  -pbkdf2

# Verify decrypted file
if [ ! -f "${DECRYPTED_FILE}" ]; then
  echo "ERROR: Decryption failed - output file not created"
  exit 1
fi

# Test gzip integrity
if ! gunzip -t "${DECRYPTED_FILE}" 2>/dev/null; then
  echo "ERROR: Decrypted file is not a valid gzip file"
  echo "This may indicate wrong encryption key or corrupted backup"
  rm -f "${DECRYPTED_FILE}"
  exit 1
fi

echo "✅ Backup decrypted successfully"

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

# Restore from decrypted backup
echo "Restoring database from decrypted backup..."
gunzip -c "${DECRYPTED_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --single-transaction

# Cleanup decrypted file (security)
echo "Removing decrypted temporary file..."
rm -f "${DECRYPTED_FILE}"

echo "✅ Database restore completed successfully at $(date)"
echo "Pre-restore backup available at: ${PRE_RESTORE_BACKUP}"
