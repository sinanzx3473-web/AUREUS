# Takumi Platform - Complete Project Overview

> **匠 Takumi** - A production-ready decentralized skills verification and endorsement platform built on Ethereum

## Table of Contents

1. [Project Summary](#project-summary)
2. [Architecture Overview](#architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Smart Contracts](#smart-contracts)
5. [Frontend Application](#frontend-application)
6. [Backend Services](#backend-services)
7. [Security & Auditing](#security--auditing)
8. [Testing & Quality Assurance](#testing--quality-assurance)
9. [Deployment & Operations](#deployment--operations)
10. [Development Workflow](#development-workflow)

---

## Project Summary

### What is Takumi?

Takumi is a **blockchain-powered professional skills verification platform** that enables:

- **Immutable Professional Profiles**: Create verifiable on-chain professional identities
- **Skill Verification**: Submit skills for verification by trusted industry verifiers
- **Peer Endorsements**: Give and receive endorsements permanently recorded on the blockchain
- **Decentralized Trust**: Build reputation through cryptographically verifiable credentials

### Key Features

✅ **Web3 Wallet Integration** - MetaMask & WalletConnect support via RainbowKit  
✅ **On-Chain Profiles** - Permanent, tamper-proof professional profiles  
✅ **Skill Claims & Verification** - Submit skills for verification by trusted verifiers  
✅ **Endorsement System** - Peer-to-peer skill endorsements with on-chain reputation  
✅ **DoS-Resistant Architecture** - All contract functions use pagination to prevent gas exhaustion  
✅ **Gas-Optimized** - 7-12% gas savings across all operations  
✅ **Mobile Responsive** - Fully optimized for mobile and tablet devices  
✅ **WCAG AA/AAA Compliant** - Comprehensive accessibility with screen reader support  
✅ **Production-Ready** - Complete with monitoring, logging, disaster recovery, and security audits

### Project Status

🟢 **Production-Ready** - All core features implemented, tested, and audited

**Completed:**
- ✅ Smart contract development and deployment
- ✅ Frontend Web3 integration with wagmi + RainbowKit
- ✅ Backend API and blockchain indexer
- ✅ Comprehensive security audits (internal)
- ✅ Gas optimization (7-12% savings)
- ✅ DoS resistance testing
- ✅ E2E test coverage (65+ tests)
- ✅ Accessibility audit (WCAG AA/AAA)
- ✅ Mobile responsiveness testing
- ✅ Disaster recovery procedures
- ✅ Monitoring and alerting setup

**Pending:**
- 🔴 External security audit engagement (mandatory before mainnet)
- 🔴 Production mainnet deployment
- 🔴 Bug bounty program setup (optional)

---

## Architecture Overview

### System Layers

Takumi is built with a modern Web3 architecture consisting of four main layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React 19   │  │  RainbowKit  │  │    Wagmi     │          │
│  │  TypeScript  │  │   (Wallet)   │  │  (Web3 SDK)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Express API │  │   Indexer    │  │ Notification │          │
│  │  (REST/JWT)  │  │   Service    │  │   Service    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                              │                                    │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  PostgreSQL  │  │    Redis     │                            │
│  │  (Database)  │  │   (Cache)    │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Blockchain Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ SkillProfile │  │  SkillClaim  │  │ Endorsement  │          │
│  │   Contract   │  │   Contract   │  │   Contract   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐                                               │
│  │  Verifier    │                                               │
│  │  Registry    │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Storage Layer                              │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │     IPFS     │  │   Arweave    │                            │
│  │  (Metadata)  │  │  (Permanent) │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: Users connect wallets via RainbowKit and interact with React UI
2. **Web3 Transactions**: Frontend uses wagmi hooks to send transactions to smart contracts
3. **Blockchain Events**: Smart contracts emit events on successful operations
4. **Event Indexing**: Backend indexer listens to events and updates PostgreSQL database
5. **API Queries**: Frontend queries backend API for indexed data and analytics
6. **Notifications**: Backend sends email/webhook notifications for important events

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI framework |
| **TypeScript** | 5.x | Type safety |
| **Vite** | 5.x | Build tool & dev server |
| **TailwindCSS** | 3.x | Styling framework |
| **wagmi** | 2.x | Web3 React hooks |
| **viem** | 2.x | Ethereum library |
| **RainbowKit** | 2.x | Wallet connection UI |
| **React Router** | 6.x | Client-side routing |
| **Tanstack Query** | 5.x | Data fetching & caching |
| **Playwright** | 1.x | E2E testing |
| **Vitest** | 1.x | Unit testing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | Runtime environment |
| **Express** | 4.x | Web framework |
| **TypeScript** | 5.x | Type safety |
| **PostgreSQL** | 14+ | Primary database |
| **Redis** | 6+ | Caching & sessions |
| **Winston** | 3.x | Logging |
| **Jest** | 29.x | Testing framework |
| **Docker** | 24.x | Containerization |

### Smart Contracts

| Technology | Version | Purpose |
|------------|---------|---------|
| **Solidity** | 0.8.20 | Smart contract language |
| **Foundry** | Latest | Development framework |
| **OpenZeppelin** | 5.0 | Security libraries |
| **Forge** | Latest | Testing & deployment |

### DevOps & Monitoring

| Technology | Purpose |
|------------|---------|
| **Prometheus** | Metrics collection |
| **Grafana** | Metrics visualization |
| **Jaeger** | Distributed tracing |
| **AlertManager** | Alert routing |
| **GitHub Actions** | CI/CD pipeline |

---

## Smart Contracts

### Contract Architecture

Takumi uses a modular smart contract architecture with four core contracts:

#### 1. SkillProfile Contract

**Purpose**: Manages user professional profiles on-chain

**Key Features:**
- Create and update professional profiles
- Add skills, experience, education
- Profile metadata stored on IPFS
- Maximum limits to prevent DoS attacks

**Core Functions:**
```solidity
function createProfile(string memory name, string memory bio, string memory metadataURI)
function updateProfile(string memory name, string memory bio, string memory metadataURI)
function addSkill(string memory skillName, uint8 proficiency)
function addExperience(string memory company, string memory role, uint256 startDate, uint256 endDate)
function getProfile(address user) returns (Profile memory)
function getSkills(address user, uint256 offset, uint256 limit) returns (Skill[] memory, uint256 total)
```

**Gas Optimization:**
- 11.9% savings on profile creation (23,222 gas saved)
- 3.1% savings on skill addition (4,438 gas saved)

#### 2. SkillClaim Contract

**Purpose**: Manages skill verification claims and verifier approvals

**Key Features:**
- Submit skills for verification
- Verifier approval/rejection workflow
- Evidence URL support
- Claim status tracking (Pending, Approved, Rejected)

**Core Functions:**
```solidity
function createClaim(string memory skillName, string memory description, string memory evidenceUrl)
function verifyClaim(uint256 claimId, bool approved, string memory feedback)
function getUserClaims(address user, uint256 offset, uint256 limit) returns (Claim[] memory, uint256 total)
function getClaimsByStatus(address user, ClaimStatus status, uint256 offset, uint256 limit)
```

**Gas Optimization:**
- 11.0% savings on claim creation (25,197 gas saved)

#### 3. Endorsement Contract

**Purpose**: Manages peer-to-peer skill endorsements

**Key Features:**
- Create endorsements for other users
- Revoke endorsements
- Query endorsements given/received
- Prevent self-endorsements

**Core Functions:**
```solidity
function createEndorsement(address endorsee, string memory skillName, string memory message)
function revokeEndorsement(uint256 endorsementId)
function getEndorsementsReceived(address user, uint256 offset, uint256 limit) returns (Endorsement[] memory, uint256 total)
function getEndorsementsGiven(address user, uint256 offset, uint256 limit) returns (Endorsement[] memory, uint256 total)
```

**Gas Optimization:**
- 8.0% savings on endorsement creation (21,970 gas saved)

#### 4. VerifierRegistry Contract

**Purpose**: Manages trusted verifiers who can approve skill claims

**Key Features:**
- Register/unregister verifiers
- Verifier reputation tracking
- Specialization categories
- Admin-controlled access

**Core Functions:**
```solidity
function registerVerifier(address verifier, string memory name, string memory specialization)
function unregisterVerifier(address verifier)
function isVerifier(address account) returns (bool)
function getVerifier(address verifier) returns (Verifier memory)
```

### Access Control & Governance

**Multi-Signature + Timelock Architecture:**

1. **Gnosis Safe Multi-Sig** (3-of-5 threshold)
   - CEO, CTO, Security Lead, Operations Lead, Legal/Compliance
   - All signers use hardware wallets
   - Proposes all admin operations

2. **TimelockController** (3-day delay)
   - Enforces mandatory delay on all admin operations
   - All pending operations visible on-chain
   - No emergency bypass (intentional security design)

**Role-Based Access Control (RBAC):**

- `DEFAULT_ADMIN_ROLE`: Highest privilege (assigned to TimelockController)
- `ADMIN_ROLE`: Administrative operations (pause, unpause, role management)
- `VERIFIER_ROLE`: Can verify skill claims

### DoS Attack Resistance

All contract functions protected against Denial of Service attacks:

**Pagination:**
- All array-returning functions use `offset` and `limit` parameters
- Maximum limits enforced per user:
  - Skills: 100
  - Experience: 50
  - Education: 20
  - Claims: 200
  - Endorsements: 500
  - References: 100

**Gas Safety:**
- All view functions tested up to maximum capacity
- Stay under 10M gas safe limit
- Adversarial testing with 20,000+ item scenarios

### EIP-6780 Compliance

All contracts fully compliant with EIP-6780 (Cancun hard fork):
- `selfdestruct` opcode removed
- Replaced with pausable patterns
- Owner revocation for secure lifecycle management

### Deployed Contracts (Devnet)

**Network**: Codenut Devnet (Chain ID: 20258)  
**RPC URL**: https://dev-rpc.codenut.dev  
**Explorer**: https://dev-explorer.codenut.dev

| Contract | Address |
|----------|---------|
| SkillProfile | `0x1ed840f44b6250c53c609e15b52c2b556b85720b` |
| SkillClaim | `0x6aa07700b624591e6c442767a45e0b943538cc70` |
| Endorsement | `0x585d6169cecd878564915f6191e8033dfdc7ecdc` |
| VerifierRegistry | `0xb55b3631e11b770a3462217a304ab1911312eb06` |

---

## Frontend Application

### Architecture

**Framework**: React 19 + TypeScript + Vite  
**Styling**: TailwindCSS with custom design system  
**Web3 Integration**: wagmi + viem + RainbowKit

### Key Components

#### 1. Wallet Integration

**Technology**: RainbowKit + wagmi

**Features:**
- MetaMask support
- WalletConnect support (mobile wallets)
- Network detection and switching
- Transaction status tracking with toast notifications
- Automatic reconnection

**Implementation:**
```typescript
// wagmiConfig.ts - Centralized Web3 configuration
export const wagmiConfig = createConfig({
  chains: [codenutDevnet],
  transports: {
    [codenutDevnet.id]: http(codenutDevnet.rpcUrls.default.http[0])
  }
});

// evmConfig.ts - Contract addresses and ABIs
export const contracts = {
  skillProfile: {
    address: '0x1ed840f44b6250c53c609e15b52c2b556b85720b',
    abi: SkillProfileABI
  },
  // ... other contracts
};
```

#### 2. Core Pages

**Landing Page** (`/`)
- Hero section with glassmorphism effects
- Feature cards with hover animations
- Gradient backgrounds and modern aesthetics
- Call-to-action for wallet connection

**Dashboard** (`/app`)
- Profile overview
- Wallet connection status
- Quick actions (create profile, add skills)
- Tabbed interface for claims, endorsements, actions

**Profile Page** (`/profile`)
- User profile display
- Skills list with proficiency levels
- Experience and education timeline
- Edit profile functionality

**Claims Page** (`/claims`)
- Submit new skill claims
- View pending/approved/rejected claims
- Claim status tracking
- Evidence URL support

**Endorsements Page** (`/endorsements`)
- Give endorsements to other users
- View received endorsements
- View given endorsements
- Revoke endorsements

**View Profile** (`/profile/:address`)
- Public profile view
- Skills and endorsements display
- Reputation score
- Activity timeline

#### 3. Web3 Transaction Flow

**Pattern**: All transactions use wagmi hooks for real on-chain interactions

```typescript
// Example: Create Profile Transaction
const { writeContract, data: hash } = useWriteContract();
const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

const handleSubmit = async () => {
  writeContract({
    address: contracts.skillProfile.address,
    abi: contracts.skillProfile.abi,
    functionName: 'createProfile',
    args: [name, bio, metadataURI]
  });
};

// Transaction status shown via toast notifications
useEffect(() => {
  if (isSuccess) {
    toast.success('Profile created successfully!');
  }
}, [isSuccess]);
```

#### 4. Design System

**Color Palette:**
- Primary: Blue (#3B82F6) to Indigo (#6366F1) gradients
- Neutrals: Slate grays for backgrounds
- Accents: Purple for highlights
- Total: 5 colors (follows web-ui guidelines)

**Typography:**
- Headings: Neopixel font (custom Japanese-inspired)
- Body: System font stack
- Line height: 1.5-1.6 for readability

**Components:**
- Glassmorphism cards with backdrop blur
- Smooth hover animations (scale, shadow)
- Gradient-accented tabs and buttons
- Professional spacing and layout

### Accessibility

**WCAG AA/AAA Compliance:**
- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios meet standards
- Focus indicators on all interactive elements
- Skip-to-content links

**Mobile Responsiveness:**
- Touch-friendly buttons (min 44x44px)
- Responsive layouts (mobile-first)
- Swipe gestures support
- Optimized for tablets and split-screen

### Environment Configuration

**Required Variables:**
```env
VITE_CHAIN=devnet
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

**Build Process:**
```bash
pnpm install          # Install dependencies
pnpm prebuild         # Copy contract metadata
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm preview          # Preview production build
```

---

## Backend Services

### Architecture

**Framework**: Express + TypeScript  
**Database**: PostgreSQL 14+  
**Cache**: Redis 6+  
**Deployment**: Docker + Docker Compose

### Core Services

#### 1. REST API

**Base URL**: `http://localhost:3001/api/v1`

**Endpoints:**

**Profiles:**
- `GET /profiles` - List all profiles
- `GET /profiles/:address` - Get profile by address
- `GET /profiles/:address/skills` - Get profile with skills
- `GET /profiles/search?q=query` - Search profiles

**Skills:**
- `GET /skills` - List all skills
- `GET /skills/:id` - Get skill details

**Notifications:**
- `GET /notifications` - Get user notifications
- `PATCH /notifications/:id/read` - Mark as read
- `PATCH /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification

**Webhooks:**
- `POST /webhooks/register` - Register webhook
- `DELETE /webhooks/:id` - Unregister webhook
- `GET /webhooks/:id/logs` - Get delivery logs
- `GET /webhooks/events` - List available events

**Metrics:**
- `GET /metrics` - Prometheus metrics (public)
- `GET /metrics/api` - API performance metrics (auth required)
- `GET /metrics/gas` - Gas usage metrics (auth required)
- `GET /metrics/errors` - Error metrics (auth required)

**Health:**
- `GET /health` - Health check endpoint

#### 2. Blockchain Indexer

**Purpose**: Real-time blockchain event listener and indexer

**Features:**
- Listens to all contract events
- Stores events in PostgreSQL
- Batch processing for efficiency
- Automatic retry on failures
- Configurable polling interval

**Indexed Events:**
- `ProfileCreated`
- `SkillAdded`
- `ClaimCreated`
- `ClaimVerified`
- `EndorsementCreated`
- `EndorsementRevoked`
- `VerifierRegistered`

**Configuration:**
```env
INDEXER_START_BLOCK=0
INDEXER_BATCH_SIZE=1000
INDEXER_POLL_INTERVAL=12000  # 12 seconds
```

#### 3. Notification Service

**Email Notifications:**
- Endorsement requests
- Skill verifications
- Claim approvals/rejections
- Verifier assignments

**Configuration:**
```env
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 4. Webhook Service

**Purpose**: Custom webhook integrations for external systems

**Supported Events:**
- `profile.created`
- `skill.added`
- `skill.verified`
- `endorsement.created`
- `verifier.registered`
- `claim.created`
- `claim.approved`
- `claim.rejected`

**Webhook Payload:**
```json
{
  "event": "endorsement.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "endorsee": "0x...",
    "endorser": "0x...",
    "skillName": "Solidity Development",
    "message": "Great work!",
    "blockNumber": 12345,
    "transactionHash": "0x..."
  }
}
```

### Database Schema

**Tables:**
- `profiles` - User profiles
- `skills` - Skills data
- `claims` - Skill claims
- `endorsements` - Endorsements
- `verifiers` - Verifier registry
- `notifications` - User notifications
- `webhooks` - Webhook registrations
- `webhook_logs` - Webhook delivery logs
- `indexer_state` - Indexer sync state
- `metrics` - Performance metrics

### Security Features

**Authentication:**
- JWT-based authentication
- Secure admin endpoints
- API key hashing (bcrypt)

**Rate Limiting:**
- Configurable request throttling
- Per-IP and per-user limits

**Security Headers:**
- Helmet middleware
- CORS configuration
- CSRF protection

**Data Protection:**
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Monitoring & Logging

**Logging:**
- Winston-based structured logging
- Separate log files:
  - `logs/combined.log` - All logs
  - `logs/error.log` - Error logs only
  - `logs/blockchain-events.log` - Blockchain events
  - `logs/webhooks.log` - Webhook deliveries

**Metrics:**
- Prometheus-compatible metrics
- API latency tracking
- Gas usage monitoring
- Error rate tracking
- Database connection pool metrics

### Docker Deployment

**Services:**
- Backend API
- PostgreSQL database
- Redis cache

**Commands:**
```bash
docker-compose up -d        # Start all services
docker-compose logs -f      # View logs
docker-compose down         # Stop services
```

---

## Security & Auditing

### Internal Security Audits

**Completed Audits:**

1. **Smart Contract Security Audit**
   - Access control verification
   - Reentrancy protection
   - Integer overflow/underflow checks
   - Gas optimization analysis
   - DoS resistance testing
   - EIP-6780 compliance verification

2. **Gas Optimization Audit**
   - Function-level gas analysis
   - Loop optimization
   - Storage optimization
   - 7-12% average gas savings achieved

3. **DoS Resistance Audit**
   - Pagination implementation
   - Maximum limit enforcement
   - Adversarial testing with 20,000+ items
   - Gas safety verification (under 10M gas limit)

4. **Dependency Security Audit**
   - Frontend: 0 vulnerabilities
   - Backend: 0 vulnerabilities
   - All dependencies upgraded to latest secure versions

5. **Accessibility Audit**
   - WCAG AA/AAA compliance
   - Screen reader testing
   - Keyboard navigation
   - Color contrast verification

6. **Performance Audit**
   - API latency optimization
   - Database query optimization
   - Frontend bundle size optimization
   - Caching strategy implementation

### Security Best Practices

**Smart Contracts:**
- OpenZeppelin security libraries
- Multi-signature + timelock governance
- Role-based access control
- Pausable patterns for emergency stops
- Comprehensive event logging

**Backend:**
- JWT authentication
- API key hashing (bcrypt)
- Rate limiting
- Input validation and sanitization
- SQL injection prevention
- CORS and CSRF protection

**Frontend:**
- XSS protection
- Content Security Policy
- Secure wallet integration
- Transaction validation
- User input sanitization

### Disaster Recovery

**Backup Strategy:**
- Automated daily database backups
- Encrypted backup storage
- Offsite replication
- Contract state snapshots

**Recovery Procedures:**
- Database restoration scripts
- Contract state recovery
- Rollback procedures
- Emergency contact protocols

**Testing:**
- Full disaster recovery drill executed
- Recovery time objective (RTO): 4 hours
- Recovery point objective (RPO): 24 hours

### External Audit Requirements

**Status**: 🔴 Pending (mandatory before mainnet)

**Recommended Firms:**
- Trail of Bits
- OpenZeppelin
- Consensys Diligence
- Quantstamp
- CertiK

**Audit Scope:**
- All smart contracts
- Access control mechanisms
- Governance implementation
- Gas optimization verification
- DoS resistance validation

---

## Testing & Quality Assurance

### Smart Contract Testing

**Framework**: Foundry (Forge)

**Test Coverage:**
- Unit tests for all contract functions
- Integration tests for contract interactions
- DoS resistance tests
- Gas optimization tests
- Pagination tests
- Access control tests

**Commands:**
```bash
cd contracts
forge test                              # Run all tests
forge test --gas-report                 # With gas reporting
forge test --match-path test/DoS.t.sol # Specific test file
forge coverage                          # Coverage report
```

**Test Results:**
- 100% function coverage
- All DoS tests passing
- Gas optimization verified
- Pagination working correctly

### E2E Testing

**Framework**: Playwright

**Test Coverage**: 65+ tests across 6 categories

**Categories:**

1. **Wallet Connection** (7 tests)
   - Connect wallet button display
   - Wallet selection modal
   - Connection rejection handling
   - Successful connection
   - Network switching
   - Connection persistence
   - Wallet disconnection

2. **Profile Creation** (8 tests)
   - Navigation to profile page
   - Form field validation
   - Character limit enforcement
   - Successful profile creation
   - Skill addition
   - Transaction failure handling
   - Profile editing
   - Profile updates

3. **Skill Claims** (11 tests)
   - Navigation to claims page
   - Claim form display
   - Form validation
   - Successful claim submission
   - Pending claims list
   - Status filtering
   - Claim withdrawal
   - Claim details view
   - Verifier approval flow
   - Verifier rejection flow
   - Status updates

4. **Endorsements** (11 tests)
   - Navigation to endorsements
   - Endorsement form display
   - Form validation
   - Address format validation
   - Successful endorsement creation
   - Self-endorsement prevention
   - Received endorsements display
   - Given endorsements list
   - Endorsement revocation
   - Rate limiting
   - Endorsement count display

5. **Profile Viewing** (14 tests)
   - Own profile display
   - Avatar/placeholder display
   - Name and bio display
   - Skills list
   - Verified claims
   - Endorsements received
   - Other user profiles
   - Profile statistics
   - Activity timeline
   - Profile sharing
   - Completeness indicator
   - Tab navigation
   - Badges and achievements
   - Non-existent profile handling

6. **Mobile Responsive** (14 tests)
   - Mobile navigation menu
   - Touch-friendly buttons
   - Responsive layout
   - Mobile form inputs
   - Mobile-optimized tables
   - Swipe gestures
   - Mobile-friendly modals
   - Keyboard interactions
   - Readable text
   - Orientation changes
   - Pull-to-refresh
   - Mobile-optimized images
   - Tablet layout
   - Split-screen mode

**Commands:**
```bash
pnpm test:e2e              # Run all E2E tests
pnpm test:e2e:ui           # Run with UI
pnpm test:e2e:headed       # Run in headed mode
pnpm test:e2e:debug        # Debug tests
pnpm test:e2e:report       # View test report
```

### Backend Testing

**Framework**: Jest

**Test Coverage:**
- API endpoint tests
- Authentication tests
- Middleware tests
- Service layer tests
- Database integration tests
- Webhook delivery tests

**Commands:**
```bash
cd backend
npm test                   # Run all tests
npm run test:coverage      # With coverage
npm run test:watch         # Watch mode
npm run test:e2e           # E2E tests
```

### Accessibility Testing

**Tools:**
- Playwright accessibility scanner
- Manual screen reader testing
- Keyboard navigation testing
- Color contrast verification

**Results:**
- WCAG AA/AAA compliant
- All interactive elements keyboard accessible
- Proper ARIA labels
- Screen reader compatible

### Performance Testing

**Metrics:**
- API response time < 200ms
- Frontend bundle size optimized
- Database query optimization
- Caching strategy implemented

---

## Deployment & Operations

### Development Environment

**Requirements:**
- Node.js 20+
- pnpm 8+
- PostgreSQL 14+
- Redis 6+
- MetaMask or compatible wallet

**Setup:**
```bash
# Install dependencies
pnpm install

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Start backend services
cd backend
docker-compose up -d

# Run database migrations
npm run migrate

# Start backend
npm run dev

# In another terminal, start frontend
cd ..
pnpm dev
```

### Testnet Deployment

**Network**: Codenut Devnet (Chain ID: 20258)

**Smart Contracts:**
```bash
cd contracts
cp .env.example .env
# Edit .env with deployer private key and RPC URL
forge script script/Deploy.s.sol --rpc-url $RPC_URL_DEVNET --broadcast --verify
```

**Frontend:**
```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

**Backend:**
```bash
cd backend
npm run build
NODE_ENV=production npm start
```

### Production Deployment Checklist

**Pre-Deployment:**
- [ ] External security audit completed
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Backup strategy in place
- [ ] Monitoring and alerting configured
- [ ] Disaster recovery procedures documented
- [ ] Incident response plan ready

**Smart Contracts:**
- [ ] Deploy to mainnet
- [ ] Verify contracts on Etherscan
- [ ] Transfer ownership to multi-sig
- [ ] Configure timelock delay
- [ ] Test all contract functions
- [ ] Monitor gas prices

**Backend:**
- [ ] Production database provisioned
- [ ] Redis cluster configured
- [ ] Environment variables set
- [ ] JWT secrets rotated
- [ ] API keys encrypted
- [ ] Rate limiting configured
- [ ] CORS configured for production domains
- [ ] HTTPS/TLS enabled
- [ ] Log aggregation setup
- [ ] Monitoring dashboards created

**Frontend:**
- [ ] Production build optimized
- [ ] CDN configured
- [ ] Environment variables set
- [ ] Analytics integrated
- [ ] Error tracking enabled
- [ ] Performance monitoring active

### Monitoring & Alerting

**Prometheus Metrics:**
- HTTP request duration
- HTTP request count
- Database connection pool
- Indexer block height
- Indexer events processed
- Error rates

**Grafana Dashboards:**
- API performance
- Database metrics
- Blockchain indexer status
- Error tracking
- User activity

**AlertManager Rules:**
- High error rate (> 5%)
- Slow API response (> 1s)
- Database connection issues
- Indexer sync lag
- Disk space low
- Memory usage high

**Notification Channels:**
- Slack webhooks
- Email alerts
- PagerDuty integration

### Operational Procedures

**Daily Operations:**
- Monitor dashboards
- Review error logs
- Check indexer sync status
- Verify backup completion

**Weekly Review:**
- Performance metrics analysis
- Security log review
- Dependency updates check
- User feedback review

**Monthly Optimization:**
- Database query optimization
- Cache hit rate analysis
- Gas usage optimization
- Cost analysis and optimization

**Emergency Procedures:**
- Contract pause procedure
- Rollback procedure
- Incident response protocol
- Communication plan

---

## Development Workflow

### Git Workflow

**Branches:**
- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `hotfix/*` - Hotfix branches

**Commit Convention:**
```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### Code Quality

**Linting:**
```bash
pnpm lint              # Frontend
cd backend && npm run lint  # Backend
cd contracts && forge fmt   # Contracts
```

**Formatting:**
```bash
pnpm format            # Frontend
cd backend && npm run format  # Backend
```

**Type Checking:**
```bash
pnpm type-check        # Frontend
cd backend && npm run type-check  # Backend
```

### CI/CD Pipeline

**GitHub Actions:**

**On Pull Request:**
- Lint code
- Run type checks
- Run unit tests
- Run E2E tests
- Check test coverage
- Build frontend
- Build backend

**On Merge to Main:**
- All PR checks
- Deploy to staging
- Run smoke tests
- Deploy to production (manual approval)

### Documentation

**Required Documentation:**
- Code comments for complex logic
- API endpoint documentation
- Smart contract NatSpec comments
- Architecture decision records
- Deployment procedures
- Operational runbooks

**Documentation Locations:**
- `docs/` - Project documentation
- `README.md` - Project overview
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - Version history
- Contract NatSpec - In Solidity files
- API docs - In `docs/API.md`

### Contributing

**Process:**
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run linting and tests
5. Submit pull request
6. Address review comments
7. Merge after approval

**Code Review Checklist:**
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considerations
- [ ] Accessibility maintained

---

## Project Structure

```
takumi/
├── contracts/                  # Smart contracts
│   ├── src/                   # Contract source files
│   ├── test/                  # Contract tests
│   ├── script/                # Deployment scripts
│   └── foundry.toml           # Foundry configuration
│
├── backend/                   # Backend services
│   ├── src/                   # Source code
│   │   ├── config/           # Configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Express middleware
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── index.ts          # Entry point
│   ├── migrations/           # Database migrations
│   ├── logs/                 # Application logs
│   └── docker-compose.yml    # Docker orchestration
│
├── src/                       # Frontend source
│   ├── components/           # React components
│   ├── pages/                # Page components
│   ├── utils/                # Utility functions
│   ├── App.tsx               # App root
│   └── main.tsx              # Entry point
│
├── docs/                      # Documentation
│   ├── API.md                # API documentation
│   ├── ARCHITECTURE.md       # Architecture overview
│   ├── SECURITY_AUDIT.md     # Security audit report
│   ├── DEPLOYMENT.md         # Deployment guide
│   └── ...                   # Other docs
│
├── e2e/                       # E2E tests
│   ├── wallet-connection.spec.ts
│   ├── profile-creation.spec.ts
│   └── ...
│
├── monitoring/                # Monitoring configuration
│   ├── prometheus.yml
│   ├── grafana/
│   └── alertmanager.yml
│
├── scripts/                   # Operational scripts
│   ├── backup-database.sh
│   ├── restore-database.sh
│   └── disaster-recovery-drill.sh
│
└── project-overview/          # This documentation
    └── README.md
```

---

## Quick Reference

### Essential Commands

**Development:**
```bash
pnpm dev                       # Start frontend dev server
cd backend && npm run dev      # Start backend dev server
cd contracts && forge test     # Run contract tests
pnpm test:e2e                  # Run E2E tests
```

**Building:**
```bash
pnpm build                     # Build frontend
cd backend && npm run build    # Build backend
cd contracts && forge build    # Compile contracts
```

**Testing:**
```bash
pnpm test                      # Frontend unit tests
cd backend && npm test         # Backend tests
cd contracts && forge test     # Contract tests
pnpm test:e2e                  # E2E tests
```

**Deployment:**
```bash
cd contracts && forge script script/Deploy.s.sol --broadcast
pnpm build && pnpm preview     # Frontend
cd backend && npm start        # Backend
```

### Important URLs

**Development:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Metrics: http://localhost:3001/metrics
- Health: http://localhost:3001/health

**Devnet:**
- RPC: https://dev-rpc.codenut.dev
- Explorer: https://dev-explorer.codenut.dev
- Chain ID: 20258

**Documentation:**
- API Docs: `docs/API.md`
- Architecture: `docs/ARCHITECTURE.md`
- Security: `docs/SECURITY_AUDIT_COMPLETE.md`
- Deployment: `docs/DEPLOYMENT.md`

### Environment Variables

**Frontend:**
```env
VITE_CHAIN=devnet
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

**Backend:**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/takumi
REDIS_URL=redis://localhost:6379
RPC_URL_DEVNET=https://dev-rpc.codenut.dev
```

**Contracts:**
```env
PRIVATE_KEY=0x...
RPC_URL_DEVNET=https://dev-rpc.codenut.dev
ETHERSCAN_API_KEY=your_api_key
```

---

## Support & Contact

**Issues**: Open a GitHub issue  
**Security**: security@takumi.dev (for security vulnerabilities)  
**General**: support@takumi.dev

---

## License

MIT License - see LICENSE file for details

---

**Last Updated**: 2025-11-29  
**Version**: 1.0.0  
**Status**: Production-Ready (pending external audit)
