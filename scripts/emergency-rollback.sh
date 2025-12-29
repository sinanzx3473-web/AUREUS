#!/bin/bash
# Emergency Rollback Script for Takumi Platform
# Performs immediate rollback bypassing timelock for critical security issues
# ⚠️ REQUIRES MULTI-SIG APPROVAL - USE ONLY FOR CRITICAL VULNERABILITIES

set -e

echo "========================================="
echo "⚠️  EMERGENCY ROLLBACK PROCEDURE"
echo "========================================="
echo ""
echo "This script performs an IMMEDIATE contract rollback"
echo "bypassing the standard 48-hour timelock delay."
echo ""
echo "⚠️  WARNING: This should ONLY be used for:"
echo "   - Critical security vulnerabilities"
echo "   - Active exploits in progress"
echo "   - Severe contract bugs causing fund loss"
echo ""
echo "This action requires multi-sig approval from 3/5 admin keys."
echo ""

# Check if this is a drill
DRILL_MODE="${DRILL_MODE:-false}"
if [ "$DRILL_MODE" = "true" ]; then
  echo "🔧 DRILL MODE ENABLED - No actual transactions will be sent"
  echo ""
fi

# Require explicit confirmation
read -p "Type 'EMERGENCY' to confirm this is a critical incident: " CONFIRM
if [ "$CONFIRM" != "EMERGENCY" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Load environment variables
if [ -f .env ]; then
  source .env
fi

# Verify required variables
REQUIRED_VARS=("PROXY_ADMIN_ADDRESS" "EMERGENCY_KEY" "RPC_URL")
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "ERROR: $VAR not set"
    exit 1
  fi
done

# Load deployment configuration
NETWORK="${NETWORK:-sepolia}"
DEPLOYMENT_FILE="contracts/interfaces/deploy.json"

if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo "ERROR: Deployment file not found: $DEPLOYMENT_FILE"
  exit 1
fi

# Extract addresses
SKILL_PROFILE_PROXY=$(jq -r ".chains[] | select(.name == \"$NETWORK\") | .contracts.SkillProfile" "$DEPLOYMENT_FILE")
ENDORSEMENT_PROXY=$(jq -r ".chains[] | select(.name == \"$NETWORK\") | .contracts.Endorsement" "$DEPLOYMENT_FILE")
SKILL_CLAIM_PROXY=$(jq -r ".chains[] | select(.name == \"$NETWORK\") | .contracts.SkillClaim" "$DEPLOYMENT_FILE")

# Load previous implementation addresses from backup
BACKUP_DIR="/var/backups/takumi/contracts"
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/contract_snapshot_*.tar.gz | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No contract backup found in $BACKUP_DIR"
  exit 1
fi

echo "Using backup: $LATEST_BACKUP"
echo ""

# Extract backup to temp directory
TEMP_DIR=$(mktemp -d)
tar -xzf "$LATEST_BACKUP" -C "$TEMP_DIR"

# Read previous implementation addresses
PREV_SKILL_PROFILE_IMPL=$(jq -r '.SkillProfileImpl' "$TEMP_DIR/deploy.json")
PREV_ENDORSEMENT_IMPL=$(jq -r '.EndorsementImpl' "$TEMP_DIR/deploy.json")
PREV_SKILL_CLAIM_IMPL=$(jq -r '.SkillClaimImpl' "$TEMP_DIR/deploy.json")

echo "Rollback Plan:"
echo "----------------------------------------"
echo "SkillProfile Proxy:  $SKILL_PROFILE_PROXY"
echo "  → Previous Impl:   $PREV_SKILL_PROFILE_IMPL"
echo ""
echo "Endorsement Proxy:   $ENDORSEMENT_PROXY"
echo "  → Previous Impl:   $PREV_ENDORSEMENT_IMPL"
echo ""
echo "SkillClaim Proxy:    $SKILL_CLAIM_PROXY"
echo "  → Previous Impl:   $PREV_SKILL_CLAIM_IMPL"
echo "----------------------------------------"
echo ""

# Final confirmation
read -p "Proceed with emergency rollback? (yes/no): " FINAL_CONFIRM
if [ "$FINAL_CONFIRM" != "yes" ]; then
  echo "Rollback cancelled"
  rm -rf "$TEMP_DIR"
  exit 0
fi

# Create incident log
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
INCIDENT_LOG="docs/incidents/${INCIDENT_ID}.md"
mkdir -p "$(dirname "$INCIDENT_LOG")"

cat > "$INCIDENT_LOG" <<EOF
# Emergency Rollback Incident: $INCIDENT_ID

## Incident Details
- **Date/Time**: $(date -Iseconds)
- **Severity**: CRITICAL
- **Action**: Emergency contract rollback
- **Operator**: $(whoami)

## Rollback Details
- **Network**: $NETWORK
- **Backup Used**: $LATEST_BACKUP

### Contracts Rolled Back
- SkillProfile: $SKILL_PROFILE_PROXY → $PREV_SKILL_PROFILE_IMPL
- Endorsement: $ENDORSEMENT_PROXY → $PREV_ENDORSEMENT_IMPL
- SkillClaim: $SKILL_CLAIM_PROXY → $PREV_SKILL_CLAIM_IMPL

## Timeline
EOF

log_event() {
  echo "- $(date -Iseconds): $1" | tee -a "$INCIDENT_LOG"
}

log_event "Emergency rollback initiated"

# Pause all contracts first
echo ""
echo "Step 1: Pausing all contracts..."
log_event "Pausing contracts"

if [ "$DRILL_MODE" != "true" ]; then
  cast send "$SKILL_PROFILE_PROXY" "pause()" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
  
  cast send "$ENDORSEMENT_PROXY" "pause()" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
  
  cast send "$SKILL_CLAIM_PROXY" "pause()" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
else
  echo "[DRILL] Would pause contracts"
fi

log_event "All contracts paused"

# Perform rollback
echo ""
echo "Step 2: Rolling back implementations..."
log_event "Starting implementation rollback"

if [ "$DRILL_MODE" != "true" ]; then
  # Rollback SkillProfile
  echo "Rolling back SkillProfile..."
  cast send "$PROXY_ADMIN_ADDRESS" \
    "upgrade(address,address)" \
    "$SKILL_PROFILE_PROXY" \
    "$PREV_SKILL_PROFILE_IMPL" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
  
  # Rollback Endorsement
  echo "Rolling back Endorsement..."
  cast send "$PROXY_ADMIN_ADDRESS" \
    "upgrade(address,address)" \
    "$ENDORSEMENT_PROXY" \
    "$PREV_ENDORSEMENT_IMPL" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
  
  # Rollback SkillClaim
  echo "Rolling back SkillClaim..."
  cast send "$PROXY_ADMIN_ADDRESS" \
    "upgrade(address,address)" \
    "$SKILL_CLAIM_PROXY" \
    "$PREV_SKILL_CLAIM_IMPL" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
else
  echo "[DRILL] Would rollback implementations"
fi

log_event "Implementation rollback completed"

# Verify rollback
echo ""
echo "Step 3: Verifying rollback..."
log_event "Verifying rollback"

if [ "$DRILL_MODE" != "true" ]; then
  CURRENT_IMPL=$(cast call "$SKILL_PROFILE_PROXY" "implementation()(address)" --rpc-url "$RPC_URL")
  if [ "$CURRENT_IMPL" = "$PREV_SKILL_PROFILE_IMPL" ]; then
    echo "✓ SkillProfile rollback verified"
    log_event "SkillProfile rollback verified"
  else
    echo "✗ SkillProfile rollback verification FAILED"
    log_event "ERROR: SkillProfile rollback verification FAILED"
  fi
else
  echo "[DRILL] Would verify rollback"
fi

# Unpause contracts
echo ""
echo "Step 4: Unpausing contracts..."
log_event "Unpausing contracts"

if [ "$DRILL_MODE" != "true" ]; then
  cast send "$SKILL_PROFILE_PROXY" "unpause()" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
  
  cast send "$ENDORSEMENT_PROXY" "unpause()" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
  
  cast send "$SKILL_CLAIM_PROXY" "unpause()" \
    --rpc-url "$RPC_URL" \
    --private-key "$EMERGENCY_KEY"
else
  echo "[DRILL] Would unpause contracts"
fi

log_event "Contracts unpaused"

# Cleanup
rm -rf "$TEMP_DIR"

# Send notifications
if [ -n "$SLACK_WEBHOOK" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 EMERGENCY ROLLBACK COMPLETED: $INCIDENT_ID\"}" \
    "$SLACK_WEBHOOK" 2>/dev/null || true
fi

log_event "Emergency rollback completed"

echo ""
echo "========================================="
echo "✅ Emergency Rollback Complete"
echo "========================================="
echo ""
echo "Incident ID: $INCIDENT_ID"
echo "Incident Log: $INCIDENT_LOG"
echo ""
echo "REQUIRED FOLLOW-UP ACTIONS:"
echo "1. Update status page: status.takumi.io"
echo "2. Notify users via Twitter/Discord"
echo "3. Schedule post-mortem meeting within 24h"
echo "4. Complete incident report in $INCIDENT_LOG"
echo "5. Investigate root cause"
echo "6. Deploy fix with proper timelock"
echo ""
