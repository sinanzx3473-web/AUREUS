#!/bin/bash
# Smart Contract Restore Script for Takumi Platform
# Restores contract artifacts and metadata from snapshot with AES-256-GCM decryption support

set -e

# Configuration
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/var/backups/takumi/contracts}"
CONTRACTS_DIR="${CONTRACTS_DIR:-./contracts}"

# Encryption configuration
ENCRYPTION_KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"  # Path to encryption key file

# Check if snapshot file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <snapshot_file>"
  echo ""
  echo "Available snapshots:"
  ls -lh "${SNAPSHOT_DIR}"/contract_snapshot_*.tar.gz* 2>/dev/null | grep -E '\.(tar\.gz|tar\.gz\.enc)$' | tail -n 10
  exit 1
fi

SNAPSHOT_FILE="$1"
IS_ENCRYPTED=false

# Detect if snapshot is encrypted
if [[ "${SNAPSHOT_FILE}" == *.enc ]]; then
  IS_ENCRYPTED=true
  echo "Detected encrypted snapshot file"
  
  # Validate encryption key is available
  if [ -z "${ENCRYPTION_KEY_FILE}" ]; then
    echo "ERROR: BACKUP_ENCRYPTION_KEY_FILE must be set to decrypt encrypted snapshots"
    echo "See docs/SECURITY_SECRETS.md for key management instructions"
    exit 1
  fi
  
  if [ ! -f "${ENCRYPTION_KEY_FILE}" ]; then
    echo "ERROR: Encryption key file not found: ${ENCRYPTION_KEY_FILE}"
    exit 1
  fi
  
  # Verify IV file exists
  if [ ! -f "${SNAPSHOT_FILE}.iv" ]; then
    echo "ERROR: IV file not found: ${SNAPSHOT_FILE}.iv"
    echo "Encrypted snapshots require an IV file for decryption"
    exit 1
  fi
fi

# Verify snapshot file exists
if [ ! -f "${SNAPSHOT_FILE}" ]; then
  echo "ERROR: Snapshot file not found: ${SNAPSHOT_FILE}"
  exit 1
fi

# Verify checksum if available
if [ -f "${SNAPSHOT_FILE}.sha256" ]; then
  echo "Verifying snapshot integrity..."
  if sha256sum -c "${SNAPSHOT_FILE}.sha256"; then
    echo "Checksum verification passed"
  else
    echo "ERROR: Checksum verification failed!"
    exit 1
  fi
else
  echo "WARNING: No checksum file found, skipping integrity check"
fi

# Decrypt snapshot if encrypted
DECRYPTED_FILE="${SNAPSHOT_FILE}"
if [ "${IS_ENCRYPTED}" = true ]; then
  echo "Decrypting snapshot..."
  
  # Read encryption key and IV
  ENCRYPTION_KEY=$(cat "${ENCRYPTION_KEY_FILE}")
  IV=$(cat "${SNAPSHOT_FILE}.iv")
  
  # Create temporary file for decrypted snapshot
  DECRYPTED_FILE=$(mktemp)
  
  # Decrypt using AES-256-GCM
  openssl enc -aes-256-gcm -d \
    -in "${SNAPSHOT_FILE}" \
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
echo "WARNING: This will restore contract artifacts from snapshot!"
echo "Snapshot file: ${SNAPSHOT_FILE}"
echo "Target directory: ${CONTRACTS_DIR}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  rm -rf "${TEMP_DIR}"
  exit 0
fi

# Create backup of current state
echo "Creating backup of current contract state..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
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

# Cleanup temporary directory and decrypted file
rm -rf "${TEMP_DIR}"
if [ "${IS_ENCRYPTED}" = true ]; then
  echo "Cleaning up decrypted temporary file..."
  rm -f "${DECRYPTED_FILE}"
fi

echo ""
echo "Contract restore completed successfully at $(date)"
echo "Pre-restore backup available at: ${BACKUP_FILE}"
echo ""
echo "Next steps:"
echo "1. Verify contract addresses in ${CONTRACTS_DIR}/interfaces/metadata.json"
echo "2. Update frontend configuration if needed"
echo "3. Test contract interactions"
