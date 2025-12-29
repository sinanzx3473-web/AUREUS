#!/bin/bash

# Takumi Rollback Script
# Usage: ./scripts/rollback.sh <network> <backup-file>
# Example: ./scripts/rollback.sh sepolia deployments/sepolia.backup.json

set -e

NETWORK=${1}
BACKUP_FILE=${2}

if [ -z "$NETWORK" ] || [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./scripts/rollback.sh <network> <backup-file>"
    exit 1
fi

echo "⚠️  Takumi Rollback Script"
echo "Network: $NETWORK"
echo "Backup file: $BACKUP_FILE"
echo ""

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

# Set RPC URL based on network
case $NETWORK in
    sepolia)
        RPC_URL=${RPC_URL_SEPOLIA:-"https://eth-sepolia.g.alchemy.com/v2/$ALCHEMY_API_KEY"}
        ;;
    polygon-mumbai)
        RPC_URL=${RPC_URL_MUMBAI:-"https://polygon-mumbai.g.alchemy.com/v2/$ALCHEMY_API_KEY"}
        ;;
    polygon)
        RPC_URL=${RPC_URL_POLYGON:-"https://polygon-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"}
        ;;
    *)
        echo "❌ Error: Unknown network $NETWORK"
        exit 1
        ;;
esac

echo "⚠️  WARNING: This will rollback contract implementations to previous versions"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

cd contracts

# Read previous implementation addresses from backup
SKILL_PROFILE_IMPL=$(jq -r '.SkillProfileImpl' ../$BACKUP_FILE)
SKILL_CLAIM_IMPL=$(jq -r '.SkillClaimImpl' ../$BACKUP_FILE)
ENDORSEMENT_IMPL=$(jq -r '.EndorsementImpl' ../$BACKUP_FILE)
VERIFIER_REGISTRY_IMPL=$(jq -r '.VerifierRegistryImpl' ../$BACKUP_FILE)

# Read proxy addresses from current deployment
CURRENT_DEPLOYMENT="./deployments/$NETWORK.json"
SKILL_PROFILE_PROXY=$(jq -r '.SkillProfileProxy' $CURRENT_DEPLOYMENT)
SKILL_CLAIM_PROXY=$(jq -r '.SkillClaimProxy' $CURRENT_DEPLOYMENT)
ENDORSEMENT_PROXY=$(jq -r '.EndorsementProxy' $CURRENT_DEPLOYMENT)
VERIFIER_REGISTRY_PROXY=$(jq -r '.VerifierRegistryProxy' $CURRENT_DEPLOYMENT)

echo "Rolling back to implementations:"
echo "  SkillProfile: $SKILL_PROFILE_IMPL"
echo "  SkillClaim: $SKILL_CLAIM_IMPL"
echo "  Endorsement: $ENDORSEMENT_IMPL"
echo "  VerifierRegistry: $VERIFIER_REGISTRY_IMPL"
echo ""

# Rollback SkillProfile
echo "Rolling back SkillProfile..."
cast send $SKILL_PROFILE_PROXY \
    "upgradeToAndCall(address,bytes)" \
    $SKILL_PROFILE_IMPL \
    "0x" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

# Rollback SkillClaim
echo "Rolling back SkillClaim..."
cast send $SKILL_CLAIM_PROXY \
    "upgradeToAndCall(address,bytes)" \
    $SKILL_CLAIM_IMPL \
    "0x" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

# Rollback Endorsement
echo "Rolling back Endorsement..."
cast send $ENDORSEMENT_PROXY \
    "upgradeToAndCall(address,bytes)" \
    $ENDORSEMENT_IMPL \
    "0x" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

# Rollback VerifierRegistry
echo "Rolling back VerifierRegistry..."
cast send $VERIFIER_REGISTRY_PROXY \
    "upgradeToAndCall(address,bytes)" \
    $VERIFIER_REGISTRY_IMPL \
    "0x" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

echo ""
echo "✅ Rollback complete"
echo "🎉 Done!"
