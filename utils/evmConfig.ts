import { defineChain } from 'viem';
import metadata from '../metadata.json';

// Define custom Codenut devnet chain
export const codenутDevnet = defineChain({
  id: 20258,
  name: 'Codenut Devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://dev-rpc.codenut.dev'],
    },
    public: {
      http: ['https://dev-rpc.codenut.dev'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://dev-explorer.codenut.dev' },
  },
  testnet: true,
});

// Get the active chain from environment or default to devnet
const activeNetwork = import.meta.env.VITE_CHAIN || 'devnet';

// Find the chain configuration from metadata
const chainConfig = metadata.chains.find(chain => chain.network === activeNetwork);

if (!chainConfig) {
  throw new Error(`Chain configuration not found for network: ${activeNetwork}`);
}

// Extract contract configurations
const contractsArray = chainConfig.contracts;

// Create contract configuration object
export const contracts = {
  skillProfile: {
    address: contractsArray.find(c => c.contractName === 'SkillProfile')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'SkillProfile')?.abi || [],
  },
  skillClaim: {
    address: contractsArray.find(c => c.contractName === 'SkillClaim')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'SkillClaim')?.abi || [],
  },
  endorsement: {
    address: contractsArray.find(c => c.contractName === 'Endorsement')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'Endorsement')?.abi || [],
  },
  verifierRegistry: {
    address: contractsArray.find(c => c.contractName === 'VerifierRegistry')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'VerifierRegistry')?.abi || [],
  },
  aureusToken: {
    address: contractsArray.find(c => c.contractName === 'AureusToken')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'AureusToken')?.abi || [],
  },
  talentEquityFactory: {
    address: contractsArray.find(c => c.contractName === 'TalentEquityFactory')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'TalentEquityFactory')?.abi || [],
  },
  agentOracleWithStaking: {
    address: contractsArray.find(c => c.contractName === 'AgentOracleWithStaking')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'AgentOracleWithStaking')?.abi || [],
  },
  bountyVaultWithBuyback: {
    address: contractsArray.find(c => c.contractName === 'BountyVaultWithBuyback')?.address as `0x${string}`,
    abi: contractsArray.find(c => c.contractName === 'BountyVaultWithBuyback')?.abi || [],
  },
};

// Export chain configuration
export const chainId = parseInt(chainConfig.chainId);
export const rpcUrl = chainConfig.rpc_url;
export const networkName = chainConfig.network;

// Helper function to get contract address by name
export function getContractAddress(contractName: keyof typeof contracts): `0x${string}` | undefined {
  return contracts[contractName]?.address;
}

// Validate all contracts are present
const requiredContracts = ['skillProfile', 'skillClaim', 'endorsement', 'verifierRegistry', 'aureusToken', 'talentEquityFactory', 'agentOracleWithStaking', 'bountyVaultWithBuyback'];
for (const contractName of requiredContracts) {
  const contract = contracts[contractName as keyof typeof contracts];
  if (!contract.address) {
    console.warn(`Warning: ${contractName} contract address not found in metadata`);
  }
}
