#!/bin/bash
# Encrypted Smart Contract Restore Script for Takumi Platform
# Restores contract artifacts and metadata from AES-256-GCM encrypted snapshot

set -e

# Configuration
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/var/backups/takumi/contracts}"
CONTRACTS_DIR="${CONTRACTS_DIR:-./contracts}"
ENCRYPTION_KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"

# Check if snapshot file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <encrypted_snapshot_file>"
  echo ""
  echo "Available encrypted snapshots:"
  ls -lh "${SNAPSHOT_DIR}"/contract_snapshot_*.tar.gz.enc 2>/dev/null | tail -n 10 || echo "No encrypted snapshots found"
  exit 1
fi

ENCRYPTED_FILE="$1"

# Verify encrypted snapshot file exists
if [ ! -f "${ENCRYPTED_FILE}" ]; then
  echo "ERROR: Encrypted snapshot file not found: ${ENCRYPTED_FILE}"
  exit 1
fi

# Verify encryption key is available
if [ -z "${ENCRYPTION_KEY_FILE}" ]; then
  echo "ERROR: BACKUP_ENCRYPTION_KEY_FILE must be set to decrypt snapshot"
  echo "See docs/SECURITY_SECRETS.md for key management instructions"
  exit 1
fi

if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
  echo "ERROR: Encryption key file not found: ${ENCRYPTION_KEY_FILE}"
  exit 1
fi

# Verify checksum if available
if [ -f "${ENCRYPTED_FILE}.sha256" ]; then
  echo "Verifying encrypted snapshot integrity..."
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

# Decrypt snapshot
echo "Decrypting snapshot..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DECRYPTED_FILE="/tmp/contract_snapshot_${TIMESTAMP}.tar.gz"

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

# Test tar integrity
if ! tar -tzf "${DECRYPTED_FILE}" >/dev/null 2>&1; then
  echo "ERROR: Decrypted file is not a valid tar archive"
  echo "This may indicate wrong encryption key or corrupted snapshot"
  rm -f "${DECRYPTED_FILE}"
  exit 1
fi

echo "✅ Snapshot decrypted successfully"

# Extract snapshot metadata
TEMP_DIR=$(mktemp -d)
tar -xzf "${DECRYPTED_FILE}" -C "${TEMP_DIR}"
SNAPSHOT_CONTENT=$(ls "${TEMP_DIR}")

if [ -f "${TEMP_DIR}/${SNAPSHOT_CONTENT}/snapshot_metadata.json" ]; then
  echo "Snapshot metadata:"
  cat "${TEMP_DIR}/${SNAPSHOT_CONTENT}/snapshot_metadata.json" | jq .
fi

# Confirmation prompt
echo ""
echo "WARNING: This will restore contract artifacts from encrypted snapshot!"
echo "Encrypted snapshot: ${ENCRYPTED_FILE}"
echo "Target directory: ${CONTRACTS_DIR}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  rm -rf "${TEMP_DIR}"
  rm -f "${DECRYPTED_FILE}"
  exit 0
fi

# Create backup of current state
echo "Creating backup of current contract state..."
BACKUP_FILE="${SNAPSHOT_DIR}/pre_restore_${TIMESTAMP}.tar.gz"
tar -czf "${BACKUP_FILE}" -C "${CONTRACTS_DIR}" . 2>/dev/null || true
echo "Current state backed up to: ${BACKUP_FILE}"

# Restore artifacts
echo "Restoring contract artifacts..."
if [ -d "${TEMP_DIR}/${SNAPSHOT_CONTENT}/out" ]; then
  rm -rf "${CONTRACTS_DIR}/out"
  cp -r "${TEMP_DIR}/${SNAPSHOT_CONTENT}/out" "${CONTRACTS_DIR}/"
  echo "✓ Artifacts restored"
fi

# Restore metadata
echo "Restoring deployment metadata..."
if [ -f "${TEMP_DIR}/${SNAPSHOT_CONTENT}/metadata.json" ]; then
  mkdir -p "${CONTRACTS_DIR}/interfaces"
  cp "${TEMP_DIR}/${SNAPSHOT_CONTENT}/metadata.json" "${CONTRACTS_DIR}/interfaces/"
  echo "✓ metadata.json restored"
fi

if [ -f "${TEMP_DIR}/${SNAPSHOT_CONTENT}/deploy.json" ]; then
  mkdir -p "${CONTRACTS_DIR}/interfaces"
  cp "${TEMP_DIR}/${SNAPSHOT_CONTENT}/deploy.json" "${CONTRACTS_DIR}/interfaces/"
  echo "✓ deploy.json restored"
fi

# Restore source code (optional)
if [ -d "${TEMP_DIR}/${SNAPSHOT_CONTENT}/src" ]; then
  read -p "Restore source code? (yes/no): " RESTORE_SRC
  if [ "$RESTORE_SRC" = "yes" ]; then
    rm -rf "${CONTRACTS_DIR}/src"
    cp -r "${TEMP_DIR}/${SNAPSHOT_CONTENT}/src" "${CONTRACTS_DIR}/"
    echo "✓ Source code restored"
  fi
fi

# Cleanup temporary files (security)
echo "Removing decrypted temporary files..."
rm -rf "${TEMP_DIR}"
rm -f "${DECRYPTED_FILE}"

echo ""
echo "✅ Contract restore completed successfully at $(date)"
echo "Pre-restore backup available at: ${BACKUP_FILE}"
echo ""
echo "Next steps:"
echo "1. Verify contract addresses in ${CONTRACTS_DIR}/interfaces/metadata.json"
echo "2. Update frontend configuration if needed"
echo "3. Test contract interactions"
