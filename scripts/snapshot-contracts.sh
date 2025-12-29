#!/bin/bash
# Smart Contract Snapshot Script for Takumi Platform
# Creates encrypted snapshots of contract state and deployment metadata with AES-256-GCM

set -e

# Configuration
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/var/backups/takumi/contracts}"
CONTRACTS_DIR="${CONTRACTS_DIR:-./contracts}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_FILE="${SNAPSHOT_DIR}/contract_snapshot_${TIMESTAMP}.tar.gz"
ENCRYPTED_FILE="${SNAPSHOT_DIR}/contract_snapshot_${TIMESTAMP}.tar.gz.enc"
NETWORK="${NETWORK:-sepolia}"

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

# Create snapshot directory if it doesn't exist
mkdir -p "${SNAPSHOT_DIR}"

echo "Starting contract snapshot at $(date)"
echo "Network: ${NETWORK}"
echo "Snapshot file: ${SNAPSHOT_FILE}"

# Create temporary directory for snapshot
TEMP_DIR=$(mktemp -d)
SNAPSHOT_TEMP="${TEMP_DIR}/snapshot_${TIMESTAMP}"
mkdir -p "${SNAPSHOT_TEMP}"

# Copy contract artifacts
echo "Copying contract artifacts..."
if [ -d "${CONTRACTS_DIR}/out" ]; then
  cp -r "${CONTRACTS_DIR}/out" "${SNAPSHOT_TEMP}/"
fi

# Copy deployment metadata
echo "Copying deployment metadata..."
if [ -f "${CONTRACTS_DIR}/interfaces/metadata.json" ]; then
  cp "${CONTRACTS_DIR}/interfaces/metadata.json" "${SNAPSHOT_TEMP}/"
fi

if [ -f "${CONTRACTS_DIR}/interfaces/deploy.json" ]; then
  cp "${CONTRACTS_DIR}/interfaces/deploy.json" "${SNAPSHOT_TEMP}/"
fi

# Export contract state from blockchain
echo "Exporting contract state from ${NETWORK}..."

# Read contract addresses from metadata
if [ -f "${CONTRACTS_DIR}/interfaces/metadata.json" ]; then
  # Extract contract addresses for the specified network
  SKILL_PROFILE_ADDR=$(jq -r ".chains[] | select(.name == \"${NETWORK}\") | .contracts.SkillProfile" "${CONTRACTS_DIR}/interfaces/metadata.json")
  SKILL_CLAIM_ADDR=$(jq -r ".chains[] | select(.name == \"${NETWORK}\") | .contracts.SkillClaim" "${CONTRACTS_DIR}/interfaces/metadata.json")
  ENDORSEMENT_ADDR=$(jq -r ".chains[] | select(.name == \"${NETWORK}\") | .contracts.Endorsement" "${CONTRACTS_DIR}/interfaces/metadata.json")
  VERIFIER_REGISTRY_ADDR=$(jq -r ".chains[] | select(.name == \"${NETWORK}\") | .contracts.VerifierRegistry" "${CONTRACTS_DIR}/interfaces/metadata.json")
  
  # Create state export file
  STATE_FILE="${SNAPSHOT_TEMP}/contract_state.json"
  cat > "${STATE_FILE}" <<EOF
{
  "network": "${NETWORK}",
  "timestamp": "${TIMESTAMP}",
  "contracts": {
    "SkillProfile": "${SKILL_PROFILE_ADDR}",
    "SkillClaim": "${SKILL_CLAIM_ADDR}",
    "Endorsement": "${ENDORSEMENT_ADDR}",
    "VerifierRegistry": "${VERIFIER_REGISTRY_ADDR}"
  }
}
EOF
  
  echo "Contract addresses exported to ${STATE_FILE}"
fi

# Copy source code
echo "Copying contract source code..."
if [ -d "${CONTRACTS_DIR}/src" ]; then
  cp -r "${CONTRACTS_DIR}/src" "${SNAPSHOT_TEMP}/"
fi

# Copy test files
echo "Copying test files..."
if [ -d "${CONTRACTS_DIR}/test" ]; then
  cp -r "${CONTRACTS_DIR}/test" "${SNAPSHOT_TEMP}/"
fi

# Copy deployment scripts
echo "Copying deployment scripts..."
if [ -d "${CONTRACTS_DIR}/script" ]; then
  cp -r "${CONTRACTS_DIR}/script" "${SNAPSHOT_TEMP}/"
fi

# Copy configuration files
echo "Copying configuration files..."
if [ -f "${CONTRACTS_DIR}/foundry.toml" ]; then
  cp "${CONTRACTS_DIR}/foundry.toml" "${SNAPSHOT_TEMP}/"
fi

# Create snapshot metadata
METADATA_FILE="${SNAPSHOT_TEMP}/snapshot_metadata.json"
cat > "${METADATA_FILE}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "network": "${NETWORK}",
  "created_at": "$(date -Iseconds)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF

# Create compressed archive
echo "Creating compressed archive..."
tar -czf "${SNAPSHOT_FILE}" -C "${TEMP_DIR}" "snapshot_${TIMESTAMP}"

# Cleanup temporary directory
rm -rf "${TEMP_DIR}"

# Verify snapshot was created
if [ -f "${SNAPSHOT_FILE}" ]; then
  SNAPSHOT_SIZE=$(du -h "${SNAPSHOT_FILE}" | cut -f1)
  echo "Snapshot completed successfully: ${SNAPSHOT_FILE} (${SNAPSHOT_SIZE})"
else
  echo "ERROR: Snapshot file was not created!"
  exit 1
fi

# Encrypt snapshot if enabled
if [ "${ENCRYPTION_ENABLED}" = "true" ]; then
  echo "Encrypting snapshot with AES-256-GCM..."
  
  # Read encryption key from file
  ENCRYPTION_KEY=$(cat "${ENCRYPTION_KEY_FILE}")
  
  # Generate random IV (96 bits for GCM)
  IV=$(openssl rand -hex 12)
  
  # Encrypt using AES-256-GCM
  openssl enc -aes-256-gcm \
    -in "${SNAPSHOT_FILE}" \
    -out "${ENCRYPTED_FILE}" \
    -K "${ENCRYPTION_KEY}" \
    -iv "${IV}" \
    -pbkdf2
  
  # Store IV alongside encrypted file for decryption
  echo "${IV}" > "${ENCRYPTED_FILE}.iv"
  
  # Verify encrypted file was created
  if [ -f "${ENCRYPTED_FILE}" ]; then
    ENCRYPTED_SIZE=$(du -h "${ENCRYPTED_FILE}" | cut -f1)
    echo "Encrypted snapshot created: ${ENCRYPTED_FILE} (${ENCRYPTED_SIZE})"
  else
    echo "ERROR: Encrypted snapshot file was not created!"
    exit 1
  fi
  
  # Create checksum of encrypted file
  sha256sum "${ENCRYPTED_FILE}" > "${ENCRYPTED_FILE}.sha256"
  echo "Encrypted checksum created: ${ENCRYPTED_FILE}.sha256"
  
  # Remove unencrypted snapshot for security
  echo "Removing unencrypted snapshot..."
  rm -f "${SNAPSHOT_FILE}"
  
  # Update SNAPSHOT_FILE variable to point to encrypted file
  FINAL_SNAPSHOT="${ENCRYPTED_FILE}"
else
  # Create checksum for unencrypted snapshot
  sha256sum "${SNAPSHOT_FILE}" > "${SNAPSHOT_FILE}.sha256"
  echo "Checksum created: ${SNAPSHOT_FILE}.sha256"
  FINAL_SNAPSHOT="${SNAPSHOT_FILE}"
fi

# Remove old snapshots (keep last 30 days)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
echo "Cleaning up snapshots older than ${RETENTION_DAYS} days..."
find "${SNAPSHOT_DIR}" -name "contract_snapshot_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${SNAPSHOT_DIR}" -name "contract_snapshot_*.tar.gz.enc" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${SNAPSHOT_DIR}" -name "contract_snapshot_*.tar.gz.sha256" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${SNAPSHOT_DIR}" -name "contract_snapshot_*.tar.gz.enc.sha256" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "${SNAPSHOT_DIR}" -name "contract_snapshot_*.tar.gz.enc.iv" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# List current snapshots
echo "Current snapshots:"
if [ "${ENCRYPTION_ENABLED}" = "true" ]; then
  ls -lh "${SNAPSHOT_DIR}"/contract_snapshot_*.tar.gz.enc 2>/dev/null | tail -n 10 || echo "No encrypted snapshots found"
else
  ls -lh "${SNAPSHOT_DIR}"/contract_snapshot_*.tar.gz 2>/dev/null | tail -n 10 || echo "No snapshots found"
fi

echo "Contract snapshot completed at $(date)"
echo "Final snapshot: ${FINAL_SNAPSHOT}"
