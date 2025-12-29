# AUREUS: The Sovereign Human Capital Protocol

![E2E Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/badges/e2e-badge.json)
![Build Status](https://img.shields.io/github/actions/workflow/status/YOUR_USERNAME/YOUR_REPO/e2e-tests.yml?branch=main)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> *"In a world where credentials are forged and resumes are fiction, only proof survives."*

AUREUS is the institutional-grade protocol for verifiable human capital. We transform professional competence into liquid, tradeable assets backed by cryptographic proof and AI verification. This is not a resume platform. This is the future of work.

---

## The Thesis: Why Resumes Are Dead

### The Problem

Traditional credentials are broken:
- **Unverifiable Claims**: 85% of resumes contain false information
- **Gatekeeping**: Centralized platforms control professional identity
- **Zero Liquidity**: Skills cannot be monetized or traded
- **Trust Deficit**: Employers waste billions on verification

### The Solution: Proof of Competence

AUREUS replaces trust with cryptographic proof:

1. **AI-Verified Skills**: Every claim is validated by autonomous AI agents staking $AUREUS tokens
2. **Soulbound NFTs**: Dynamic reputation NFTs that evolve with verified competence (Iron → Silver → Gold)
3. **Talent Equity**: Tokenize future income streams as tradeable RWA (Real World Assets)
4. **Deflationary Economics**: 2% of all bounty claims buy back and burn $AUREUS, creating permanent value accrual

**This is not LinkedIn. This is proof-of-work for human capital.**

---

## The Economy: Talent Equity & $AUREUS Tokenomics

### Talent Equity: Income Share Agreements as RWA

AUREUS enables professionals to **tokenize their future earnings** through the TalentEquity system:

- **Personal Tokens**: Mint ERC-20 tokens backed by your income stream
- **Investor Staking**: Investors stake USDC to purchase talent tokens
- **Revenue Sharing**: 90% to talent, 10% to investors (configurable)
- **Ethical Safeguards**:
  - **Return Cap**: 2-5x multiplier prevents exploitation
  - **Duration Limit**: 2-5 year expiry prevents indentured servitude
  - **Transparent On-Chain**: All terms immutable and auditable

**Example**: A developer mints 100,000 tokens at $1 USDC each. Investors stake $100k. Developer receives revenue, distributes 10% to token holders until 3x cap is reached or 3 years expire.

### $AUREUS Tokenomics: Deflationary Governance

**Total Supply**: 100,000,000 $AUREUS (fixed, no inflation)

**Allocation**:
- 30% Community Rewards (skill verification incentives)
- 20% Team & Advisors (4-year vesting, 2-year cliff)
- 20% Treasury (protocol development)
- 15% Early Investors (2-year vesting, 1-year cliff)
- 15% Liquidity (DEX pools)

**Utility**:
1. **Staking for AI Agents**: Verifiers must stake 10,000 $AUREUS to operate
2. **Governance**: Vote on protocol upgrades, fee structures, and treasury allocation
3. **Buyback & Burn**: 2% of all USDC bounty claims automatically buy $AUREUS from Uniswap and burn it forever

**Deflationary Mechanism**:
```
Bounty Claim (1000 USDC) 
  → 2% fee (20 USDC) 
  → Uniswap swap (20 USDC → ~X AUREUS) 
  → Burn (X AUREUS destroyed permanently)
  → Circulating supply ↓ → Price pressure ↑
```

**This creates a flywheel**: More skill verification → More bounties → More burns → Higher $AUREUS value → More staking incentive → Better verification quality.

---

## The Stack: AI Agents, ZK-Privacy & Foundry Architecture

### Smart Contract Architecture

**Core Contracts** (Solidity 0.8.29, Foundry):

1. **AureusToken.sol**
   - Fixed supply ERC-20 with burn capability
   - Role-based access control (OpenZeppelin)
   - Pausable for emergency scenarios

2. **AgentOracleWithStaking.sol**
   - AI agent verification with 10,000 $AUREUS stake requirement
   - ECDSA signature verification for off-chain AI decisions
   - 7-day unstake cooldown to prevent malicious behavior
   - Slashing mechanism for false verifications

3. **SkillProfile.sol**
   - Soulbound ERC-721 NFT (non-transferable)
   - Dynamic tier system: Iron (0-2 skills) → Silver (3-9) → Gold (10+)
   - On-chain skill registry with IPFS metadata
   - Gas-optimized pagination (DoS-resistant)

4. **TalentEquityFactory.sol**
   - EIP-6780 compliant factory (no selfdestruct)
   - Deploys PersonalToken.sol contracts for each talent
   - Enforces ethical caps (return multiplier, duration)
   - USDC-based staking and revenue distribution

5. **BountyVaultWithBuyback.sol**
   - USDC bounty pool for verified skills
   - 2% automatic buyback via UniswapIntegration.sol
   - Cooldown enforcement (prevent spam claims)
   - Event emission for backend indexing

6. **VestingVault.sol**
   - Linear vesting with cliff periods
   - Multi-beneficiary support
   - Revocable schedules for team allocations
   - SafeERC20 for secure token transfers

### AI Agent Infrastructure

**Verification Pipeline**:
1. User submits skill claim with evidence (GitHub, portfolio, certificates)
2. Backend dispatches claim to AI agent pool
3. Agents analyze evidence using LLMs (GPT-4, Claude)
4. Agent signs verification decision with ECDSA private key
5. Signature submitted on-chain to AgentOracle
6. Oracle validates signature, updates SkillProfile NFT tier
7. User becomes eligible for bounty claims

**Agent Staking Economics**:
- Agents must stake 10,000 $AUREUS (~$10k at $1/token)
- Slashing penalty for false positives/negatives
- Rewards from protocol fees for accurate verifications
- 7-day unstake cooldown prevents exit scams

### Zero-Knowledge Privacy (Roadmap)

**Future Integration**:
- **zk-SNARKs** for private skill verification (prove competence without revealing identity)
- **Semaphore Protocol** for anonymous endorsements
- **Aztec Network** integration for private talent equity transactions

### Technology Stack

**Blockchain**:
- Solidity 0.8.29
- Foundry (forge, cast, anvil)
- OpenZeppelin Contracts 5.x
- Uniswap V2 Integration
- EIP-6780 Compliance (no selfdestruct)

**Frontend**:
- React 19 + TypeScript
- Vite (build tool)
- Wagmi v2 + Viem (Ethereum interactions)
- RainbowKit (wallet connection)
- TailwindCSS (styling)

**Backend**:
- Node.js + Express
- PostgreSQL (user data, indexing)
- Redis (caching, rate limiting)
- Ethers.js (event indexing)
- Webhook notifications

**Testing**:
- Forge (Solidity unit tests)
- Playwright (E2E tests)
- Vitest (React component tests)
- Jest (Backend API tests)

**DevOps**:
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Prometheus + Grafana (monitoring)
- OpenTelemetry (distributed tracing)

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Foundry (for contract development)
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install

# Copy environment variables
cp .env.example .env
# Edit .env and add your VITE_WALLETCONNECT_PROJECT_ID

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Smart Contract Deployment

```bash
cd contracts

# Compile contracts
forge build

# Run tests
forge test -vvv

# Deploy to devnet (Genesis deployment)
forge script script/GenesisDeploy.s.sol:GenesisDeploy \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Environment variables for production:
# BACKEND_WALLET=0x... (AI agent wallet address)
# TEAM_VAULT=0x... (team vesting multisig)
# INVESTOR_VAULT=0x... (investor vesting multisig)
# COMMUNITY_REWARDS=0x... (community rewards pool)
# TREASURY=0x... (protocol treasury multisig)
# LIQUIDITY=0x... (DEX liquidity pool)
```

### Frontend Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run E2E tests
pnpm test:e2e

# Run unit tests
pnpm test
```

### Backend Setup

```bash
cd backend

# Install dependencies
pnpm install

# Setup database
psql -U postgres -f migrations/001_initial_schema.sql

# Start backend server
pnpm dev

# Run tests
pnpm test
```

---

## Architecture Overview

### System Flow

```
┌─────────────┐
│   User      │
│  (Wallet)   │
└──────┬──────┘
       │
       │ 1. Submit Skill Claim
       ▼
┌─────────────────┐
│  SkillProfile   │◄──────┐
│   (NFT)         │       │
└────────┬────────┘       │
         │                │
         │ 2. Emit Event  │ 6. Mint/Upgrade NFT
         ▼                │
┌─────────────────┐       │
│  Backend        │       │
│  Indexer        │       │
└────────┬────────┘       │
         │                │
         │ 3. Dispatch    │
         ▼                │
┌─────────────────┐       │
│  AI Agent       │       │
│  (Staked)       │       │
└────────┬────────┘       │
         │                │
         │ 4. Verify      │
         ▼                │
┌─────────────────┐       │
│ AgentOracle     │       │
│ (Signature)     │───────┘
└─────────────────┘
         │
         │ 5. Approve Claim
         ▼
┌─────────────────┐
│ BountyVault     │
│ (USDC Pool)     │
└────────┬────────┘
         │
         │ 7. Claim Bounty (2% fee)
         ▼
┌─────────────────┐
│ Uniswap         │
│ (Buyback)       │
└────────┬────────┘
         │
         │ 8. Burn AUREUS
         ▼
┌─────────────────┐
│ Dead Address    │
│ (0x000...000)   │
└─────────────────┘
```

### Contract Interactions

```solidity
// User creates profile
SkillProfile.createProfile("Alice", ipfsHash)
  → Mints Iron tier NFT (tokenId = 1)

// User submits skill claim
SkillClaim.createClaim(skillName, description, evidenceUrl)
  → Emits ClaimCreated event
  → Backend indexes event

// AI Agent verifies (off-chain analysis)
AgentOracle.verifyClaim(claimId, isValid, signature)
  → Validates ECDSA signature
  → Updates SkillProfile verified skill count
  → Upgrades NFT tier if threshold reached

// User claims bounty
BountyVault.claimBounty(skillName, claimId)
  → Validates claim is verified
  → Enforces cooldown period
  → Deducts 2% fee (20 USDC from 1000 USDC)
  → Calls UniswapIntegration.buybackAndBurn(20 USDC)
    → Swaps USDC → AUREUS on Uniswap
    → Burns AUREUS tokens (send to 0x000...000)
  → Transfers 980 USDC to user
```

---

## Security & Auditing

### Security Features

- **Role-Based Access Control**: OpenZeppelin AccessControl for all privileged functions
- **Reentrancy Protection**: ReentrancyGuard on all state-changing functions
- **Pausable Contracts**: Emergency pause mechanism for critical bugs
- **SafeERC20**: Prevents token transfer failures
- **Signature Replay Prevention**: Nonce-based signature validation
- **Gas Limit Protection**: Pagination on all loops to prevent DoS
- **Slashing Mechanism**: Penalize malicious AI agents

### Audit Status

- ✅ Internal security review completed
- ✅ Gas optimization audit (7-12% savings)
- ✅ DoS resistance validation
- 🔄 External audit by Trail of Bits (Q2 2025)
- 🔄 Bug bounty program launch (Q2 2025)

### Known Limitations

- **Centralized AI Agents**: Current implementation uses trusted backend wallet (roadmap: decentralized agent network)
- **Oracle Dependency**: Uniswap price feeds (roadmap: Chainlink integration)
- **L1 Gas Costs**: High transaction fees on Ethereum mainnet (roadmap: L2 deployment)

---

## Roadmap

### Q1 2025: Genesis Launch
- ✅ Core contract deployment
- ✅ AI agent verification pipeline
- ✅ Frontend dApp launch
- ✅ Devnet testing

### Q2 2025: Mainnet & Liquidity
- 🔄 External security audit
- 🔄 Mainnet deployment (Ethereum + Base)
- 🔄 $AUREUS token generation event (TGE)
- 🔄 Uniswap liquidity pools
- 🔄 Bug bounty program ($100k pool)

### Q3 2025: Decentralization
- 🔄 Decentralized AI agent network (Bittensor integration)
- 🔄 DAO governance launch
- 🔄 Chainlink oracle integration
- 🔄 L2 deployment (Arbitrum, Optimism)

### Q4 2025: Privacy & Scale
- 🔄 zk-SNARK private verification
- 🔄 Cross-chain bridge (Polygon, Avalanche)
- 🔄 Mobile app (iOS/Android)
- 🔄 Enterprise API for HR platforms

---

## Contributing

We welcome contributions from the community. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`pnpm test && forge test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- **Solidity**: Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- **TypeScript**: ESLint + Prettier configuration
- **Testing**: 100% coverage for smart contracts, >80% for frontend
- **Documentation**: NatSpec for all public functions

---

## Documentation

- [Web3 Integration Guide](./README_WEB3_WIRING.md)
- [API Documentation](./docs/API.md)
- [Architecture Deep Dive](./docs/ARCHITECTURE.md)
- [Security Audit Report](./SECURITY_AUDIT_COMPLETE.md)
- [Gas Optimization Summary](./GAS_OPTIMIZATION_SUMMARY.md)
- [Deployment Guide](./contracts/DEPLOYMENT.md)

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Contact & Community

- **Website**: https://aureus.protocol
- **Twitter**: [@AureusProtocol](https://twitter.com/AureusProtocol)
- **Discord**: https://discord.gg/aureus
- **Telegram**: https://t.me/aureusprotocol
- **Email**: team@aureus.protocol

---

## Acknowledgments

Built with:
- [OpenZeppelin](https://openzeppelin.com/) - Secure smart contract libraries
- [Foundry](https://getfoundry.sh/) - Blazing fast Solidity toolkit
- [Wagmi](https://wagmi.sh/) - React hooks for Ethereum
- [Uniswap](https://uniswap.org/) - Decentralized exchange protocol

---

**AUREUS: Proof of Competence. Liquid Human Capital. The Future of Work.**

*Disclaimer: This is experimental software. Use at your own risk. Not financial advice.*
