# Takumi Smart Contracts - Deployment Guide

## Overview

This guide covers deploying Takumi smart contracts to Ethereum Sepolia testnet and mainnet using Foundry.

**EIP-6780 Compliance**: All Takumi contracts are fully compliant with EIP-6780 (Cancun hard fork). The `selfdestruct` opcode has been removed and replaced with pausable patterns and owner revocation for secure lifecycle management.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Private key with sufficient ETH for gas
- Alchemy or Infura API key
- Etherscan API key for verification

## Environment Setup

### Required Environment Variables

Create a `.env` file in the `contracts/` directory. **All values must be provided - no defaults are used in production code.**

```bash
# Deployer Wallet (REQUIRED)
# Your private key for deploying contracts - NEVER commit this to git
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# RPC URLs (REQUIRED)
# Get API keys from Alchemy: https://www.alchemy.com/
RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
RPC_URL_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
RPC_URL_MUMBAI=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY

# Block Explorer API Keys (REQUIRED for verification)
# Etherscan: https://etherscan.io/myapikey
# Polygonscan: https://polygonscan.com/myapikey
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY
```

### Security Best Practices

**CRITICAL**: 
- ✅ **DO**: Use `.env` files for all secrets and credentials
- ✅ **DO**: Add `.env` to `.gitignore` (already configured)
- ✅ **DO**: Use different keys for testnet and mainnet
- ✅ **DO**: Rotate keys regularly
- ❌ **NEVER**: Commit `.env` files to version control
- ❌ **NEVER**: Use default or example values in production
- ❌ **NEVER**: Share private keys or API keys

### Generating Secure Keys

```bash
# Generate a new Ethereum wallet (save the private key)
cast wallet new

# Generate random secrets for backend services
openssl rand -base64 32  # For JWT secrets
openssl rand -hex 32     # For API keys
```

## Quick Start

### 1. Deploy to Sepolia Testnet

```bash
# From project root
./scripts/deploy.sh sepolia deploy
```

### 2. Verify Contracts on Etherscan

```bash
./scripts/deploy.sh sepolia verify
```

### 3. Upgrade Contracts

```bash
./scripts/deploy.sh sepolia upgrade
```

## Detailed Deployment Steps

### Step 1: Compile Contracts

```bash
cd contracts
forge build
```

Expected output:
```
[⠊] Compiling...
[⠒] Compiling 4 files with 0.8.29
[⠢] Solc 0.8.29 finished in 2.34s
Compiler run successful!
```

### Step 2: Run Tests

```bash
forge test -vv
```

All tests must pass before deployment.

### Step 3: Deploy Contracts

The deployment uses the UUPS proxy pattern for upgradeability:

```bash
# Sepolia testnet
NETWORK=sepolia forge script script/DeployUpgradeable.s.sol:DeployUpgradeable \
    --rpc-url $RPC_URL_SEPOLIA \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv
```

This will:
1. Deploy implementation contracts
2. Deploy proxy contracts
3. Initialize proxies with admin address
4. Verify contracts on Etherscan
5. Save deployment addresses to `deployments/sepolia.json`

### Step 4: Verify Deployment

Check the deployment file:

```bash
cat contracts/deployments/sepolia.json
```

Expected structure:
```json
{
  "SkillProfileProxy": "0x...",
  "SkillProfileImpl": "0x...",
  "SkillClaimProxy": "0x...",
  "SkillClaimImpl": "0x...",
  "EndorsementProxy": "0x...",
  "EndorsementImpl": "0x...",
  "VerifierRegistryProxy": "0x...",
  "VerifierRegistryImpl": "0x..."
}
```

### Step 5: Verify on Etherscan

Contracts are automatically verified during deployment. To manually verify:

```bash
./scripts/deploy.sh sepolia verify
```

Or verify individual contracts:

```bash
forge verify-contract <CONTRACT_ADDRESS> \
    src/SkillProfile.sol:SkillProfile \
    --chain-id 11155111 \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

## Network Configuration

### Sepolia Testnet
- **Chain ID**: 11155111
- **RPC**: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
- **Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com

### Ethereum Mainnet
- **Chain ID**: 1
- **RPC**: https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
- **Explorer**: https://etherscan.io

### Polygon Mumbai Testnet
- **Chain ID**: 80001
- **RPC**: https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY
- **Explorer**: https://mumbai.polygonscan.com
- **Faucet**: https://faucet.polygon.technology

### Polygon Mainnet
- **Chain ID**: 137
- **RPC**: https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
- **Explorer**: https://polygonscan.com

## Contract Addresses

### Sepolia Testnet (Current Deployment)

```
SkillProfile Proxy:      0x1ed840f44b6250c53c609e15b52c2b556b85720b
SkillClaim Proxy:        0x6aa07700b624591e6c442767a45e0b943538cc70
Endorsement Proxy:       0x585d6169cecd878564915f6191e8033dfdc7ecdc
VerifierRegistry Proxy:  0xb55b3631e11b770a3462217a304ab1911312eb06
```

**Note**: Always use proxy addresses for contract interactions.

## EIP-6780 Compliance

### What Changed

With the Cancun hard fork (EIP-6780), the `selfdestruct` opcode behavior changed significantly:

- **Before EIP-6780**: `selfdestruct` could delete contract code and transfer balance at any time
- **After EIP-6780**: `selfdestruct` only works within the same transaction as contract creation

### Takumi's Approach

All Takumi contracts have been refactored to remove `selfdestruct` usage:

1. **TemporaryDeployFactory**: 
   - ❌ Old: Used `selfdestruct` to clean up after deployment
   - ✅ New: Uses pausable pattern with `revokeFactory()` function
   - Factory remains on-chain but can be permanently disabled
   - Owner can renounce ownership after deployment

2. **Core Contracts** (SkillProfile, SkillClaim, Endorsement, VerifierRegistry):
   - Already used pausable patterns
   - No `selfdestruct` usage
   - Fully EIP-6780 compliant

### Factory Lifecycle Management

The `TemporaryDeployFactory` now supports secure lifecycle management:

```solidity
// Deploy contracts
TemporaryDeployFactory factory = new TemporaryDeployFactory();

// Get deployed contract addresses
address[] memory contracts = factory.getDeployedContracts();

// Pause factory (reversible)
factory.pause();

// Permanently revoke factory (irreversible)
factory.revokeFactory();
// - Sets revoked = true
// - Pauses factory permanently
// - Renounces ownership
// - Emits FactoryRevoked event
```

### Benefits of New Approach

1. **EIP-6780 Compliant**: Works on all networks post-Cancun
2. **Transparent**: Factory contract remains visible on-chain
3. **Auditable**: All deployment history preserved
4. **Secure**: Owner can permanently disable factory
5. **Flexible**: Supports pause/unpause before revocation

## Upgrading Contracts

### Pre-Upgrade Checklist

1. ✅ All tests passing
2. ✅ Security audit completed
3. ✅ Backup current deployment file
4. ✅ Test upgrade on testnet first
5. ✅ Prepare rollback plan

### Upgrade Process

1. **Backup Current Deployment**:
```bash
cp contracts/deployments/sepolia.json contracts/deployments/sepolia.backup.$(date +%Y%m%d_%H%M%S).json
```

2. **Deploy New Implementation**:
```bash
./scripts/deploy.sh sepolia upgrade
```

3. **Verify Upgrade**:
```bash
# Check new implementation address
cast implementation <PROXY_ADDRESS> --rpc-url $RPC_URL_SEPOLIA
```

### Rollback Procedure

If upgrade fails or issues are detected:

```bash
./scripts/rollback.sh sepolia contracts/deployments/sepolia.backup.YYYYMMDD_HHMMSS.json
```

This will:
1. Read previous implementation addresses from backup
2. Call `upgradeToAndCall` on each proxy
3. Restore previous contract versions

## Gas Optimization

### Deployment Costs (Sepolia)

| Contract | Deployment Gas | Estimated Cost (20 gwei) |
|----------|---------------|--------------------------|
| SkillProfile | ~2,500,000 | ~0.05 ETH |
| SkillClaim | ~2,200,000 | ~0.044 ETH |
| Endorsement | ~2,400,000 | ~0.048 ETH |
| VerifierRegistry | ~2,600,000 | ~0.052 ETH |
| **Total** | **~9,700,000** | **~0.194 ETH** |

### Optimization Tips

1. Use `--optimize` flag (already enabled in foundry.toml)
2. Set `optimizer_runs = 200` for balanced optimization
3. Deploy during low gas periods
4. Use multicall for batch operations

## Verification Procedures

### Manual Verification Steps

1. **Check Contract Code**:
   - Visit Etherscan contract page
   - Verify "Contract" tab shows verified checkmark
   - Review source code matches repository

2. **Test Contract Functions**:
```bash
# Read contract state
cast call <PROXY_ADDRESS> "totalProfiles()(uint256)" --rpc-url $RPC_URL_SEPOLIA

# Test write function (requires wallet)
cast send <PROXY_ADDRESS> \
    "createProfile(string,string,string)" \
    "Test User" "Bio" "ipfs://..." \
    --rpc-url $RPC_URL_SEPOLIA \
    --private-key $PRIVATE_KEY
```

3. **Verify Proxy Pattern**:
```bash
# Check implementation address
cast implementation <PROXY_ADDRESS> --rpc-url $RPC_URL_SEPOLIA

# Check admin
cast call <PROXY_ADDRESS> "admin()(address)" --rpc-url $RPC_URL_SEPOLIA
```

### Automated Verification

The CI/CD pipeline automatically:
- Runs all tests before deployment
- Verifies contracts on Etherscan
- Updates deployment registry
- Creates deployment artifacts

## Troubleshooting

### Common Issues

**Issue**: "Insufficient funds for gas"
```bash
# Solution: Check wallet balance
cast balance <YOUR_ADDRESS> --rpc-url $RPC_URL_SEPOLIA
```

**Issue**: "Nonce too low"
```bash
# Solution: Reset nonce or wait for pending transactions
cast nonce <YOUR_ADDRESS> --rpc-url $RPC_URL_SEPOLIA
```

**Issue**: "Contract verification failed"
```bash
# Solution: Manually verify with constructor arguments
forge verify-contract <ADDRESS> \
    src/SkillProfile.sol:SkillProfile \
    --chain-id 11155111 \
    --constructor-args $(cast abi-encode "constructor(address)" <ADMIN_ADDRESS>) \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

**Issue**: "RPC request failed"
```bash
# Solution: Check RPC endpoint
curl -X POST $RPC_URL_SEPOLIA \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Getting Help

- **Documentation**: https://book.getfoundry.sh
- **Discord**: https://discord.gg/foundry
- **GitHub Issues**: https://github.com/foundry-rs/foundry/issues

## Security Considerations

### Pre-Deployment Security Checklist

- [ ] All tests passing (unit, integration, fuzz)
- [ ] Slither static analysis completed
- [ ] Manual code review performed
- [ ] Access control properly configured
- [ ] Upgrade mechanisms tested
- [ ] Emergency pause functionality verified
- [ ] Rate limiting implemented where needed
- [ ] EIP-6780 compliance verified (no selfdestruct usage)
- [ ] Factory revocation tested on testnet

### Post-Deployment Security

1. **Transfer Admin Rights**:
```bash
# Transfer to multisig wallet
cast send <PROXY_ADDRESS> \
    "grantRole(bytes32,address)" \
    $(cast keccak "ADMIN_ROLE") \
    <MULTISIG_ADDRESS> \
    --rpc-url $RPC_URL_SEPOLIA \
    --private-key $PRIVATE_KEY
```

2. **Revoke Deployer Rights**:
```bash
cast send <PROXY_ADDRESS> \
    "revokeRole(bytes32,address)" \
    $(cast keccak "ADMIN_ROLE") \
    <DEPLOYER_ADDRESS> \
    --rpc-url $RPC_URL_SEPOLIA \
    --private-key $PRIVATE_KEY
```

3. **Monitor Contracts**:
   - Set up Tenderly alerts
   - Monitor Etherscan for unusual activity
   - Track gas usage patterns

## Mainnet Deployment Checklist

Before deploying to mainnet:

- [ ] Deployed and tested on Sepolia for at least 1 week
- [ ] Security audit completed by reputable firm
- [ ] Bug bounty program active
- [ ] Emergency response plan documented
- [ ] Multisig wallet configured for admin operations
- [ ] Insurance coverage evaluated
- [ ] Legal compliance verified
- [ ] Community announcement prepared
- [ ] Documentation complete and reviewed
- [ ] Monitoring and alerting configured

## CI/CD Integration

The project includes automated deployment via GitHub Actions:

```yaml
# .github/workflows/deploy.yml
- Deploy on push to main branch
- Run full test suite
- Deploy to staging/production
- Verify contracts
- Update deployment registry
```

See `.github/workflows/ci.yml` for full pipeline configuration.

## Additional Resources

- [Foundry Book](https://book.getfoundry.sh)
- [OpenZeppelin Upgrades](https://docs.openzeppelin.com/upgrades-plugins)
- [Etherscan Verification](https://docs.etherscan.io/tutorials/verifying-contracts-programmatically)
- [UUPS Proxy Pattern](https://eips.ethereum.org/EIPS/eip-1822)
- [EIP-6780: SELFDESTRUCT Changes](https://eips.ethereum.org/EIPS/eip-6780)
- [Cancun Hard Fork](https://ethereum.org/en/history/#cancun)

## Support

For deployment support:
- Open an issue on GitHub
- Contact the development team
- Review troubleshooting section above
