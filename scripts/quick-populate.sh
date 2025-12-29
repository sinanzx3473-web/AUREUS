#!/bin/bash

# Quick script to populate metadata.json with mock addresses and real ABIs
# This unblocks the frontend immediately

cd "$(dirname "$0")/.."

echo "Extracting contract ABIs..."
cd contracts
forge inspect AureusToken abi --json > /tmp/aureus.json
forge inspect AgentOracleWithStaking abi --json > /tmp/agent.json
forge inspect BountyVaultWithBuyback abi --json > /tmp/bounty.json
cd ..

echo "Creating update script..."
cat > /tmp/update-meta.js << 'EOF'
const fs = require('fs');

const metadata = JSON.parse(fs.readFileSync('src/metadata.json', 'utf8'));
const devnet = metadata.chains.find(c => c.network === 'devnet');

const aureusAbi = JSON.parse(fs.readFileSync('/tmp/aureus.json', 'utf8'));
const agentAbi = JSON.parse(fs.readFileSync('/tmp/agent.json', 'utf8'));
const bountyAbi = JSON.parse(fs.readFileSync('/tmp/bounty.json', 'utf8'));

// Add or update AureusToken
let aureus = devnet.contracts.find(c => c.contractName === 'AureusToken');
if (!aureus) {
  aureus = { contractName: 'AureusToken', address: '', abi: [] };
  devnet.contracts.push(aureus);
}
aureus.address = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
aureus.abi = aureusAbi;

// Add or update AgentOracleWithStaking
let agent = devnet.contracts.find(c => c.contractName === 'AgentOracleWithStaking');
if (!agent) {
  agent = { contractName: 'AgentOracleWithStaking', address: '', abi: [] };
  devnet.contracts.push(agent);
}
agent.address = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
agent.abi = agentAbi;

// Add or update BountyVaultWithBuyback
let bounty = devnet.contracts.find(c => c.contractName === 'BountyVaultWithBuyback');
if (!bounty) {
  bounty = { contractName: 'BountyVaultWithBuyback', address: '', abi: [] };
  devnet.contracts.push(bounty);
}
bounty.address = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
bounty.abi = bountyAbi;

fs.writeFileSync('src/metadata.json', JSON.stringify(metadata, null, 2));
console.log('✅ Metadata updated with mock addresses and real ABIs');
console.log('  AureusToken:', aureus.address);
console.log('  AgentOracleWithStaking:', agent.address);
console.log('  BountyVaultWithBuyback:', bounty.address);
EOF

echo "Running update..."
node /tmp/update-meta.js

echo "✅ Done! Frontend should now load without warnings."
