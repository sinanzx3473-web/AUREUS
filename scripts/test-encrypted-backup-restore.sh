#!/bin/bash
# Encrypted Backup and Restore Test Script
# Tests complete backup encryption and restore workflow to verify integrity

set -e

echo "=================================================="
echo "Encrypted Backup & Restore Test"
echo "=================================================="
echo "Started: $(date)"
echo ""

# Configuration
TEST_DIR="/tmp/takumi_backup_test_$(date +%s)"
BACKUP_DIR="${TEST_DIR}/backups"
ENCRYPTION_KEY_FILE="${TEST_DIR}/encryption.key"
TEST_DB_NAME="takumi_test_$(date +%s)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Setup test environment
echo "Setting up test environment..."
mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEST_DIR}/contracts"

# Generate test encryption key (256-bit = 64 hex characters)
echo "Generating test encryption key..."
openssl rand -hex 32 > "${ENCRYPTION_KEY_FILE}"
chmod 600 "${ENCRYPTION_KEY_FILE}"
success "Encryption key generated: ${ENCRYPTION_KEY_FILE}"

# Verify key file permissions
KEY_PERMS=$(stat -c %a "${ENCRYPTION_KEY_FILE}" 2>/dev/null || stat -f %A "${ENCRYPTION_KEY_FILE}" 2>/dev/null)
if [ "${KEY_PERMS}" = "600" ]; then
  success "Key file permissions verified: ${KEY_PERMS}"
else
  error "Key file has incorrect permissions: ${KEY_PERMS}"
fi

echo ""
echo "=================================================="
echo "Test 1: Database Backup Encryption"
echo "=================================================="

# Create test database
echo "Creating test database..."
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -U postgres -d postgres -c "CREATE DATABASE ${TEST_DB_NAME};" 2>/dev/null || true

# Add test data
echo "Adding test data..."
PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -U postgres -d "${TEST_DB_NAME}" <<EOF
CREATE TABLE test_profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO test_profiles (name, email) VALUES
  ('Alice Test', 'alice@test.com'),
  ('Bob Test', 'bob@test.com'),
  ('Charlie Test', 'charlie@test.com');
EOF

# Count records before backup
RECORD_COUNT=$(PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT COUNT(*) FROM test_profiles;")
echo "Test records created: ${RECORD_COUNT}"

# Create encrypted backup
echo "Creating encrypted backup..."
export BACKUP_DIR="${BACKUP_DIR}"
export BACKUP_ENCRYPTION_ENABLED=true
export BACKUP_ENCRYPTION_KEY_FILE="${ENCRYPTION_KEY_FILE}"
export DB_NAME="${TEST_DB_NAME}"
export DB_PASSWORD="${DB_PASSWORD:-postgres}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/takumi_db_${TIMESTAMP}.sql.gz"
ENCRYPTED_FILE="${BACKUP_DIR}/takumi_db_${TIMESTAMP}.sql.gz.enc"

# Perform backup
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h localhost \
  -p 5432 \
  -U postgres \
  -d "${TEST_DB_NAME}" \
  --format=plain \
  --no-owner \
  --no-acl \
  2>&1 | gzip > "${BACKUP_FILE}"

if [ ! -f "${BACKUP_FILE}" ]; then
  error "Backup file was not created"
fi
success "Backup created: ${BACKUP_FILE}"

# Encrypt backup
echo "Encrypting backup..."
ENCRYPTION_KEY=$(cat "${ENCRYPTION_KEY_FILE}")
IV=$(openssl rand -hex 12)

openssl enc -aes-256-gcm \
  -in "${BACKUP_FILE}" \
  -out "${ENCRYPTED_FILE}" \
  -K "${ENCRYPTION_KEY}" \
  -iv "${IV}" \
  -pbkdf2

echo "${IV}" > "${ENCRYPTED_FILE}.iv"
sha256sum "${ENCRYPTED_FILE}" > "${ENCRYPTED_FILE}.sha256"

if [ ! -f "${ENCRYPTED_FILE}" ]; then
  error "Encrypted backup was not created"
fi
success "Backup encrypted: ${ENCRYPTED_FILE}"

# Remove unencrypted backup
rm -f "${BACKUP_FILE}"
success "Unencrypted backup removed"

echo ""
echo "=================================================="
echo "Test 2: Encrypted Backup Integrity Verification"
echo "=================================================="

# Verify checksum
echo "Verifying checksum..."
if sha256sum -c "${ENCRYPTED_FILE}.sha256" 2>/dev/null; then
  success "Checksum verification passed"
else
  error "Checksum verification failed"
fi

# Verify IV file exists
if [ -f "${ENCRYPTED_FILE}.iv" ]; then
  success "IV file exists"
else
  error "IV file not found"
fi

echo ""
echo "=================================================="
echo "Test 3: Encrypted Backup Decryption & Restore"
echo "=================================================="

# Drop test database
echo "Dropping test database to simulate data loss..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d postgres -c "DROP DATABASE ${TEST_DB_NAME};"
success "Test database dropped"

# Decrypt backup
echo "Decrypting backup..."
DECRYPTED_FILE="/tmp/restore_test_${TIMESTAMP}.sql.gz"
IV=$(cat "${ENCRYPTED_FILE}.iv")

openssl enc -aes-256-gcm -d \
  -in "${ENCRYPTED_FILE}" \
  -out "${DECRYPTED_FILE}" \
  -K "${ENCRYPTION_KEY}" \
  -iv "${IV}" \
  -pbkdf2

if [ ! -f "${DECRYPTED_FILE}" ]; then
  error "Decryption failed"
fi
success "Backup decrypted successfully"

# Test gzip integrity
if gunzip -t "${DECRYPTED_FILE}" 2>/dev/null; then
  success "Decrypted file is valid gzip"
else
  error "Decrypted file is not valid gzip - wrong key or corrupted"
fi

# Restore database
echo "Restoring database..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d postgres -c "CREATE DATABASE ${TEST_DB_NAME};"

gunzip -c "${DECRYPTED_FILE}" | PGPASSWORD="${DB_PASSWORD}" psql \
  -h localhost \
  -p 5432 \
  -U postgres \
  -d "${TEST_DB_NAME}" \
  --single-transaction

success "Database restored"

# Verify restored data
echo "Verifying restored data..."
RESTORED_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT COUNT(*) FROM test_profiles;")

if [ "${RESTORED_COUNT}" -eq "${RECORD_COUNT}" ]; then
  success "Data integrity verified: ${RESTORED_COUNT} records restored"
else
  error "Data mismatch: expected ${RECORD_COUNT}, got ${RESTORED_COUNT}"
fi

# Verify specific record
ALICE_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d "${TEST_DB_NAME}" -t -c "SELECT COUNT(*) FROM test_profiles WHERE name = 'Alice Test';")
if [ "${ALICE_EXISTS}" -eq "1" ]; then
  success "Sample record verified: Alice Test found"
else
  error "Sample record not found"
fi

echo ""
echo "=================================================="
echo "Test 4: Wrong Key Detection"
echo "=================================================="

# Generate wrong key
WRONG_KEY_FILE="${TEST_DIR}/wrong.key"
openssl rand -hex 32 > "${WRONG_KEY_FILE}"

echo "Testing decryption with wrong key..."
WRONG_DECRYPTED="/tmp/wrong_decrypt_${TIMESTAMP}.sql.gz"
WRONG_KEY=$(cat "${WRONG_KEY_FILE}")

openssl enc -aes-256-gcm -d \
  -in "${ENCRYPTED_FILE}" \
  -out "${WRONG_DECRYPTED}" \
  -K "${WRONG_KEY}" \
  -iv "${IV}" \
  -pbkdf2 2>/dev/null || true

if [ -f "${WRONG_DECRYPTED}" ]; then
  if gunzip -t "${WRONG_DECRYPTED}" 2>/dev/null; then
    error "Wrong key should not produce valid output"
  else
    success "Wrong key correctly produces invalid output"
    rm -f "${WRONG_DECRYPTED}"
  fi
else
  success "Decryption with wrong key failed as expected"
fi

echo ""
echo "=================================================="
echo "Test 5: Contract Snapshot Encryption"
echo "=================================================="

# Create test contract snapshot
echo "Creating test contract snapshot..."
SNAPSHOT_DIR="${BACKUP_DIR}"
SNAPSHOT_FILE="${SNAPSHOT_DIR}/contract_snapshot_${TIMESTAMP}.tar.gz"
ENCRYPTED_SNAPSHOT="${SNAPSHOT_DIR}/contract_snapshot_${TIMESTAMP}.tar.gz.enc"

# Create test contract files
mkdir -p "${TEST_DIR}/contracts/src"
mkdir -p "${TEST_DIR}/contracts/out"
echo "// Test contract" > "${TEST_DIR}/contracts/src/Test.sol"
echo '{"test": "metadata"}' > "${TEST_DIR}/contracts/out/metadata.json"

# Create snapshot
tar -czf "${SNAPSHOT_FILE}" -C "${TEST_DIR}/contracts" .
success "Contract snapshot created"

# Encrypt snapshot
echo "Encrypting contract snapshot..."
SNAPSHOT_IV=$(openssl rand -hex 12)

openssl enc -aes-256-gcm \
  -in "${SNAPSHOT_FILE}" \
  -out "${ENCRYPTED_SNAPSHOT}" \
  -K "${ENCRYPTION_KEY}" \
  -iv "${SNAPSHOT_IV}" \
  -pbkdf2

echo "${SNAPSHOT_IV}" > "${ENCRYPTED_SNAPSHOT}.iv"
sha256sum "${ENCRYPTED_SNAPSHOT}" > "${ENCRYPTED_SNAPSHOT}.sha256"

if [ ! -f "${ENCRYPTED_SNAPSHOT}" ]; then
  error "Encrypted snapshot was not created"
fi
success "Contract snapshot encrypted"

# Decrypt and verify
echo "Decrypting contract snapshot..."
DECRYPTED_SNAPSHOT="/tmp/snapshot_restore_${TIMESTAMP}.tar.gz"
SNAPSHOT_IV=$(cat "${ENCRYPTED_SNAPSHOT}.iv")

openssl enc -aes-256-gcm -d \
  -in "${ENCRYPTED_SNAPSHOT}" \
  -out "${DECRYPTED_SNAPSHOT}" \
  -K "${ENCRYPTION_KEY}" \
  -iv "${SNAPSHOT_IV}" \
  -pbkdf2

if tar -tzf "${DECRYPTED_SNAPSHOT}" >/dev/null 2>&1; then
  success "Decrypted snapshot is valid tar archive"
else
  error "Decrypted snapshot is not valid tar"
fi

echo ""
echo "=================================================="
echo "Cleanup"
echo "=================================================="

# Cleanup test database
echo "Cleaning up test database..."
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};" 2>/dev/null || true

# Cleanup temporary files
echo "Cleaning up temporary files..."
rm -f "${DECRYPTED_FILE}"
rm -f "${DECRYPTED_SNAPSHOT}"
rm -f "${WRONG_KEY_FILE}"

# Keep test backups for inspection
echo "Test backups preserved in: ${TEST_DIR}"
echo "To cleanup: rm -rf ${TEST_DIR}"

echo ""
echo "=================================================="
echo "Test Summary"
echo "=================================================="
success "All encryption and restore tests passed!"
echo ""
echo "Test Results:"
echo "  ✅ Database backup encryption: PASSED"
echo "  ✅ Encrypted backup integrity: PASSED"
echo "  ✅ Encrypted backup decryption: PASSED"
echo "  ✅ Data restore verification: PASSED"
echo "  ✅ Wrong key detection: PASSED"
echo "  ✅ Contract snapshot encryption: PASSED"
echo ""
echo "Encryption Details:"
echo "  Algorithm: AES-256-GCM"
echo "  Key Size: 256 bits"
echo "  IV Size: 96 bits (12 bytes)"
echo "  Test Key: ${ENCRYPTION_KEY_FILE}"
echo "  Test Backups: ${TEST_DIR}"
echo ""
echo "Completed: $(date)"
echo "=================================================="
