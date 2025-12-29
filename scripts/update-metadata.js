#!/usr/bin/env node

/**
 * Update metadata.json with deployed contract addresses
 * Reads deployment logs and updates the metadata file
 */

const fs = require('fs');
const path = require('path');

const METADATA_PATH = path.join(__dirname, '../src/metadata.json');

// Parse deployment logs from stdin or file
function parseDeploymentLogs(logContent) {
  const addresses = {};
  
  // Match patterns like: "aureusToken: 0x..."
  const patterns = [
    /aureusToken:\s*(0x[a-fA-F0-9]{40})/,
    /agentOracleWithStaking:\s*(0x[a-fA-F0-9]{40})/,
    /bountyVaultWithBuyback:\s*(0x[a-fA-F0-9]{40})/
  ];
  
  patterns.forEach(pattern => {
    const match = logContent.match(pattern);
    if (match) {
      const contractName = pattern.source.split(':')[0];
      addresses[contractName] = match[1];
    }
  });
  
  return addresses;
}

// Update metadata.json with new addresses
function updateMetadata(addresses) {
  if (!fs.existsSync(METADATA_PATH)) {
    console.error('Error: metadata.json not found at', METADATA_PATH);
    process.exit(1);
  }
  
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  
  // Find the chain and update contract addresses
  metadata.chains.forEach(chain => {
    if (chain.contracts) {
      chain.contracts.forEach(contract => {
        const addressKey = Object.keys(addresses).find(key => 
          contract.contractName === key || 
          contract.contractName === key.charAt(0).toUpperCase() + key.slice(1)
        );
        
        if (addressKey && addresses[addressKey]) {
          contract.address = addresses[addressKey];
          console.log(`Updated ${contract.contractName}: ${addresses[addressKey]}`);
        }
      });
    }
  });
  
  // Write updated metadata
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));
  console.log('\nMetadata updated successfully!');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node update-metadata.js <deployment-log-file>');
    console.log('   or: forge script ... | node update-metadata.js');
    process.exit(1);
  }
  
  let logContent = '';
  
  if (args[0] === '-') {
    // Read from stdin
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => logContent += chunk);
    process.stdin.on('end', () => {
      const addresses = parseDeploymentLogs(logContent);
      updateMetadata(addresses);
    });
  } else {
    // Read from file
    const logFile = args[0];
    if (!fs.existsSync(logFile)) {
      console.error('Error: Log file not found:', logFile);
      process.exit(1);
    }
    logContent = fs.readFileSync(logFile, 'utf8');
    const addresses = parseDeploymentLogs(logContent);
    updateMetadata(addresses);
  }
}

module.exports = { parseDeploymentLogs, updateMetadata };
