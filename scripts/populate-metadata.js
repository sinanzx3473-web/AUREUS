#!/usr/bin/env node

/**
 * Populate metadata.json with mock contract addresses and ABIs
 * This allows the frontend to work immediately without deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const METADATA_PATH = path.join(__dirname, '../src/metadata.json');
const CONTRACTS_DIR = path.join(__dirname, '../contracts');

// Mock addresses for devnet (deterministic deployment addresses)
const MOCK_ADDRESSES = {
  AureusToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  AgentOracleWithStaking: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  BountyVaultWithBuyback: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  VestingVault: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  TalentEquityFactory: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  UniswapIntegration: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
};

// Get ABI for a contract using forge inspect
function getContractABI(contractName) {
  try {
    const abiJson = execSync(
      `cd ${CONTRACTS_DIR} && forge inspect ${contractName} abi --json`,
      { encoding: 'utf8' }
    );
    return JSON.parse(abiJson);
  } catch (error) {
    console.error(`Failed to get ABI for ${contractName}:`, error.message);
    return [];
  }
}

// Main function
function populateMetadata() {
  if (!fs.existsSync(METADATA_PATH)) {
    console.error('Error: metadata.json not found at', METADATA_PATH);
    process.exit(1);
  }

  console.log('Reading metadata.json...');
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));

  // Find devnet chain
  const devnetChain = metadata.chains.find(chain => chain.network === 'devnet');
  if (!devnetChain) {
    console.error('Error: devnet chain not found in metadata.json');
    process.exit(1);
  }

  console.log('\nPopulating contract addresses and ABIs...');

  // Update each contract
  const contractsToUpdate = [
    'AureusToken',
    'AgentOracleWithStaking',
    'BountyVaultWithBuyback',
    'VestingVault',
    'TalentEquityFactory',
    'UniswapIntegration',
  ];

  contractsToUpdate.forEach(contractName => {
    console.log(`\nProcessing ${contractName}...`);
    
    // Find existing contract entry
    let contractEntry = devnetChain.contracts.find(c => c.contractName === contractName);
    
    if (!contractEntry) {
      // Create new entry if it doesn't exist
      contractEntry = {
        contractName,
        address: '',
        abi: [],
      };
      devnetChain.contracts.push(contractEntry);
    }

    // Update address
    contractEntry.address = MOCK_ADDRESSES[contractName];
    console.log(`  Address: ${contractEntry.address}`);

    // Update ABI
    const abi = getContractABI(contractName);
    if (abi.length > 0) {
      contractEntry.abi = abi;
      console.log(`  ABI: ${abi.length} entries`);
    } else {
      console.log(`  ABI: Failed to fetch, keeping existing`);
    }
  });

  // Write updated metadata
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));
  console.log('\n✅ Metadata populated successfully!');
  console.log('\nUpdated contracts:');
  contractsToUpdate.forEach(name => {
    const contract = devnetChain.contracts.find(c => c.contractName === name);
    if (contract) {
      console.log(`  ${name}: ${contract.address}`);
    }
  });
}

// Run
populateMetadata();
