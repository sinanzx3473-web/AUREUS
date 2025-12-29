#!/bin/bash

# Deploy contracts and update metadata.json
# Usage: ./scripts/deploy-and-update.sh [network]

set -e

NETWORK=${1:-sepolia}
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"

echo "Deploying to $NETWORK..."

# Run deployment and capture output
forge script contracts/script/GenesisDeploy.s.sol:GenesisDeploy \
  --rpc-url $NETWORK \
  --broadcast \
  --verify \
  -vvvv | tee "$LOG_FILE"

echo ""
echo "Updating metadata.json with deployed addresses..."

# Update metadata from deployment logs
node scripts/update-metadata.js "$LOG_FILE"

echo ""
echo "Deployment complete! Log saved to: $LOG_FILE"
