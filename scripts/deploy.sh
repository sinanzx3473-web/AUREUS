#!/bin/bash

# Takumi Deployment Script
# Usage: ./scripts/deploy.sh <network> [action]
# Networks: sepolia, polygon-mumbai, polygon
# Actions: deploy (default), upgrade, verify

set -e

NETWORK=${1:-sepolia}
ACTION=${2:-deploy}

echo "🚀 Takumi Deployment Script"
echo "Network: $NETWORK"
echo "Action: $ACTION"
echo ""

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    exit 1
fi

# Set RPC URL based on network
case $NETWORK in
    sepolia)
        RPC_URL=${RPC_URL_SEPOLIA:-"https://eth-sepolia.g.alchemy.com/v2/$ALCHEMY_API_KEY"}
        CHAIN_ID=11155111
        ;;
    polygon-mumbai)
        RPC_URL=${RPC_URL_MUMBAI:-"https://polygon-mumbai.g.alchemy.com/v2/$ALCHEMY_API_KEY"}
        CHAIN_ID=80001
        ;;
    polygon)
        RPC_URL=${RPC_URL_POLYGON:-"https://polygon-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY"}
        CHAIN_ID=137
        ;;
    *)
        echo "❌ Error: Unknown network $NETWORK"
        exit 1
        ;;
esac

echo "RPC URL: $RPC_URL"
echo "Chain ID: $CHAIN_ID"
echo ""

cd contracts

# Create deployments directory
mkdir -p deployments

# Run tests first
echo "🧪 Running tests..."
forge test -vv
echo "✅ Tests passed"
echo ""

# Execute deployment action
case $ACTION in
    deploy)
        echo "📦 Deploying contracts..."
        forge script script/DeployUpgradeable.s.sol:DeployUpgradeable \
            --rpc-url $RPC_URL \
            --broadcast \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY \
            -vvvv
        echo "✅ Deployment complete"
        ;;
    
    upgrade)
        echo "⬆️  Upgrading contracts..."
        forge script script/Upgrade.s.sol:Upgrade \
            --rpc-url $RPC_URL \
            --broadcast \
            --verify \
            --etherscan-api-key $ETHERSCAN_API_KEY \
            -vvvv
        echo "✅ Upgrade complete"
        ;;
    
    verify)
        echo "🔍 Verifying contracts..."
        DEPLOYMENT_FILE="./deployments/$NETWORK.json"
        
        if [ ! -f "$DEPLOYMENT_FILE" ]; then
            echo "❌ Error: Deployment file not found: $DEPLOYMENT_FILE"
            exit 1
        fi
        
        SKILL_PROFILE_IMPL=$(jq -r '.SkillProfileImpl' $DEPLOYMENT_FILE)
        SKILL_CLAIM_IMPL=$(jq -r '.SkillClaimImpl' $DEPLOYMENT_FILE)
        ENDORSEMENT_IMPL=$(jq -r '.EndorsementImpl' $DEPLOYMENT_FILE)
        VERIFIER_REGISTRY_IMPL=$(jq -r '.VerifierRegistryImpl' $DEPLOYMENT_FILE)
        
        forge verify-contract $SKILL_PROFILE_IMPL src/SkillProfile.sol:SkillProfile \
            --chain-id $CHAIN_ID \
            --etherscan-api-key $ETHERSCAN_API_KEY
        
        forge verify-contract $SKILL_CLAIM_IMPL src/SkillClaim.sol:SkillClaim \
            --chain-id $CHAIN_ID \
            --etherscan-api-key $ETHERSCAN_API_KEY
        
        forge verify-contract $ENDORSEMENT_IMPL src/Endorsement.sol:Endorsement \
            --chain-id $CHAIN_ID \
            --etherscan-api-key $ETHERSCAN_API_KEY
        
        forge verify-contract $VERIFIER_REGISTRY_IMPL src/VerifierRegistry.sol:VerifierRegistry \
            --chain-id $CHAIN_ID \
            --etherscan-api-key $ETHERSCAN_API_KEY
        
        echo "✅ Verification complete"
        ;;
    
    *)
        echo "❌ Error: Unknown action $ACTION"
        exit 1
        ;;
esac

echo ""
echo "📄 Deployment details saved to: contracts/deployments/$NETWORK.json"
echo ""
echo "🎉 Done!"
