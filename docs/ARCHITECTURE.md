# Takumi Architecture

## System Overview

Takumi is a full-stack decentralized application (dApp) built with a modern Web3 architecture. The system consists of four main layers:

1. **Frontend Layer**: React-based user interface
2. **Backend Layer**: Node.js API and indexer
3. **Blockchain Layer**: Smart contracts on Ethereum-compatible chains
4. **Storage Layer**: IPFS/Arweave for decentralized metadata storage

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  RainbowKit  │  │    Wagmi     │          │
│  │  Components  │  │   (Wallet)   │  │  (Web3 SDK)  │          │
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

## Access Control Architecture

### Governance Model: Multi-Signature + Timelock

Takumi implements a **two-layer governance architecture** combining Gnosis Safe multi-signature wallet with OpenZeppelin TimelockController for maximum security and transparency:

**Layer 1: Gnosis Safe Multi-Signature**
- **Purpose**: Decentralized decision-making requiring multiple approvals
- **Configuration**: 3-of-5 threshold (60% approval required)
- **Signers**: CEO, CTO, Security Lead, Operations Lead, Legal/Compliance
- **Security**: All signers use hardware wallets (Ledger/Trezor)
- **Role**: Proposes all admin operations to TimelockController

**Layer 2: TimelockController (TakumiTimelock)**
- **Purpose**: Enforces mandatory delay on all admin operations
- **Delay**: 3 days (259,200 seconds) minimum
- **Transparency**: All pending operations visible on-chain
- **Execution**: Anyone can execute after delay expires
- **Emergency**: No bypass mechanism (intentional security design)

### Role-Based Access Control (RBAC)

All smart contracts use OpenZeppelin's `AccessControl` with roles controlled by TimelockController:

**Core Roles**:

1. **DEFAULT_ADMIN_ROLE** (bytes32: 0x00)
   - Highest privilege level
   - Can grant and revoke all roles including itself
   - Can pause/unpause contracts
   - **Assigned to**: TakumiTimelock contract (controlled by Gnosis Safe)
   - **Operations**: All require 3-of-5 multi-sig + 3-day delay

2. **ADMIN_ROLE** (keccak256("ADMIN_ROLE"))
   - Administrative operations (pause, unpause, role management)
   - **Assigned to**: TakumiTimelock contract
   - **Operations**: Require Gnosis Safe proposal + timelock delay

3. **VERIFIER_ROLE** (keccak256("VERIFIER_ROLE"))
   - Can verify skill claims
   - Can approve/reject claims in SkillClaim contract
   - Can verify skills in SkillProfile contract
   - **Assigned to**: Registered verifiers in VerifierRegistry
   - **Granted by**: TimelockController via Gnosis Safe proposal

**Governance Hierarchy**:
```
Gnosis Safe Multi-Sig (3-of-5)
    │
    ├── Signer 1: CEO/Founder
    ├── Signer 2: CTO/Tech Lead
    ├── Signer 3: Security Lead
    ├── Signer 4: Operations Lead
    └── Signer 5: Legal/Compliance
    │
    ▼ (proposes operations)
    │
TakumiTimelock (3-day delay)
    │
    ├── Holds DEFAULT_ADMIN_ROLE on all contracts
    ├── Holds ADMIN_ROLE on all contracts
    └── Can grant/revoke VERIFIER_ROLE
    │
    ▼ (controls)
    │
Smart Contracts
    ├── SkillProfile
    ├── SkillClaim
    ├── Endorsement
    └── VerifierRegistry
```

**Role Hierarchy**:
```
DEFAULT_ADMIN_ROLE (0x00) → TakumiTimelock
    ├── Can grant/revoke ADMIN_ROLE
    ├── Can grant/revoke VERIFIER_ROLE
    └── Can grant/revoke DEFAULT_ADMIN_ROLE

ADMIN_ROLE → TakumiTimelock
    ├── Can pause contracts (emergency)
    ├── Can unpause contracts
    └── Can perform administrative operations

VERIFIER_ROLE → Registered Verifiers
    ├── Can verify claims (SkillClaim)
    └── Can verify skills (SkillProfile)
```

**Implementation Example**:
```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract SkillClaim is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @param timelock Address of TakumiTimelock contract
    constructor(address timelock) {
        require(timelock != address(0), "Invalid timelock address");
        _grantRole(DEFAULT_ADMIN_ROLE, timelock);
        _grantRole(ADMIN_ROLE, timelock);
    }

    // Only verifiers can approve claims
    function approveClaim(uint256 claimId) 
        external 
        onlyRole(VERIFIER_ROLE) 
        whenNotPaused 
    {
        // ... implementation
    }

    // Only timelock (via Gnosis Safe) can pause
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    // Only timelock can grant verifier role
    function grantVerifierRole(address verifier) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        grantRole(VERIFIER_ROLE, verifier);
    }
}
```

### Governance Operation Flow

**1. Initial Deployment**:
```bash
# Step 1: Deploy Gnosis Safe via Safe UI (https://app.safe.global/)
# Configure: 3-of-5 threshold, hardware wallet signers

# Step 2: Set Gnosis Safe address in .env
GNOSIS_SAFE_ADDRESS=0x1234567890123456789012345678901234567890

# Step 3: Deploy all contracts with timelock governance
forge script script/DeployWithTimelock.s.sol --broadcast --verify

# Result:
# - TakumiTimelock deployed with 3-day delay
# - All contracts deployed with timelock as admin
# - Deployer admin role automatically renounced
```

**2. Admin Operation Flow** (e.g., Pause Contract):
```
Step 1: Gnosis Safe Proposal
├── Navigate to Safe UI
├── Create transaction: SkillProfile.pause()
├── Collect 3-of-5 signatures
└── Submit to TakumiTimelock.schedule()

Step 2: Timelock Delay (3 days)
├── Operation queued on-chain (publicly visible)
├── Community can review and prepare
└── 259,200 seconds countdown

Step 3: Execution (anyone can execute)
├── After delay expires, call TakumiTimelock.execute()
├── Operation executes: SkillProfile.pause()
└── Contract paused
```

**3. Verifier Onboarding Flow**:
```
Step 1: Verifier Registration
├── Verifier calls VerifierRegistry.registerVerifier()
├── Provides credentials, specializations
└── Status: Inactive (pending approval)

Step 2: Gnosis Safe Approval
├── Admin reviews credentials off-chain
├── Gnosis Safe proposes: grantRole(VERIFIER_ROLE, verifier)
├── Collect 3-of-5 signatures
└── Submit to TakumiTimelock

Step 3: Timelock Delay
├── 3-day public review period
└── Community can verify verifier credentials

Step 4: Execution
├── Anyone executes after delay
├── VERIFIER_ROLE granted
└── Verifier can now approve/reject claims
```

### Gnosis Safe Configuration

**Production Multi-Sig Setup**:
- **Contract**: Gnosis Safe (https://safe.global/)
- **Network**: Ethereum Mainnet / Base / Sepolia
- **Threshold**: 3-of-5 (60% approval required)
- **Signers**: 5 hardware wallet addresses

**Signer Roles & Responsibilities**:

| Role | Responsibility | Hardware Wallet | Backup Location |
|------|----------------|-----------------|------------------|
| CEO/Founder | Strategic decisions, final authority | Ledger Nano X | Bank vault |
| CTO/Tech Lead | Technical validation, code review | Ledger Nano S Plus | Home safe |
| Security Lead | Security review, audit coordination | Trezor Model T | Safety deposit box |
| Operations Lead | Operational oversight, monitoring | Ledger Nano X | Secure facility |
| Legal/Compliance | Regulatory compliance, legal review | Trezor Model One | Law firm vault |

**Signer Security Requirements**:
- ✅ All signers MUST use hardware wallets (no hot wallets)
- ✅ Seed phrases stored in physically secure locations
- ✅ Each signer maintains independent backup
- ✅ Regular signer availability checks (monthly)
- ✅ Documented succession plan for each role

**Emergency Procedures**:
- **Signer Compromise**: Immediately propose signer replacement via remaining signers
- **Lost Hardware Wallet**: Restore from seed phrase, replace signer address
- **Signer Unavailability**: Activate backup signer from succession plan
- **Critical Bug**: No emergency bypass (3-day delay always enforced)

### Timelock Security Properties

**TakumiTimelock Configuration**:
- **Contract**: `contracts/src/TakumiTimelock.sol`
- **Minimum Delay**: 3 days (259,200 seconds)
- **Proposers**: Gnosis Safe multi-sig only
- **Executors**: `address(0)` (anyone can execute after delay)
- **Admin**: Renounced after deployment (no admin bypass)

**Security Benefits**:
1. **Transparency**: All pending operations visible on-chain
2. **Community Review**: 3-day window to detect malicious proposals
3. **No Backdoors**: No emergency bypass mechanism
4. **Decentralization**: Execution permissionless after delay
5. **Auditability**: Complete operation history on-chain

**Operational Constraints**:
- ⚠️ **No Emergency Pause**: Even critical bugs require 3-day delay
- ⚠️ **Irreversible**: Operations cannot be cancelled after scheduling
- ⚠️ **Public**: All proposals visible before execution
- ✅ **Intentional**: These constraints prevent admin abuse

### Role Management Flow

1. **Initial Deployment**:
   - Gnosis Safe deployed with 5 signers, 3-of-5 threshold
   - TakumiTimelock deployed with Gnosis Safe as proposer
   - All contracts deployed with timelock as DEFAULT_ADMIN_ROLE
   - Deployer admin role renounced (no centralized control)

2. **Verifier Onboarding**:
   - Verifier registers via VerifierRegistry contract
   - Gnosis Safe reviews verifier credentials off-chain
   - Admin grants VERIFIER_ROLE via `grantRole(VERIFIER_ROLE, verifierAddress)`
   - Verifier can now verify claims across all contracts

3. **Governance Transition**:
   - Deploy multi-sig wallet or DAO governance contract
   - Admin grants DEFAULT_ADMIN_ROLE to governance contract
   - Admin renounces DEFAULT_ADMIN_ROLE from deployer address
   - System now controlled by decentralized governance

4. **Emergency Response**:
   - PAUSER_ROLE holder detects security issue
   - Calls `pause()` on affected contracts
   - Issue investigated and resolved
   - PAUSER_ROLE holder calls `unpause()` to resume operations

**Security Benefits**:
- **Decentralization**: No single point of failure or control
- **Flexibility**: Roles can be granted to multiple addresses
- **Auditability**: All role changes emit events (`RoleGranted`, `RoleRevoked`)
- **Separation of Concerns**: Different roles for different responsibilities
- **Governance Ready**: Easy integration with multi-sig or DAO governance

**Multi-Signature Integration**:
```solidity
// Example: Transfer admin to Gnosis Safe multi-sig
address gnosisSafe = 0x...; // Multi-sig wallet address
grantRole(DEFAULT_ADMIN_ROLE, gnosisSafe);
renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
```

**Role Verification**:
```solidity
// Check if address has role
bool isVerifier = hasRole(VERIFIER_ROLE, address);

// Get role admin (who can grant/revoke this role)
bytes32 adminRole = getRoleAdmin(VERIFIER_ROLE); // Returns DEFAULT_ADMIN_ROLE
```

## Component Details

### Frontend Layer

**Technology Stack:**
- React 18 with TypeScript
- Tailwind CSS for styling
- RainbowKit for wallet connection
- Wagmi for Web3 interactions
- TanStack Query for data fetching

**Key Components:**
- `Landing.tsx`: Marketing landing page
- `Index.tsx`: Main application dashboard
- `CreateProfileForm.tsx`: Profile creation
- `SkillClaimForm.tsx`: Skill claim submission
- `EndorsementForm.tsx`: Endorsement creation

**State Management:**
- Wagmi hooks for blockchain state
- React Query for API data caching
- Local state with React hooks

### Backend Layer

**Technology Stack:**
- Node.js 18+ with TypeScript
- Express.js for REST API
- PostgreSQL for relational data
- Redis for caching and rate limiting
- Ethers.js for blockchain interaction

**Core Services:**

1. **API Service** (`src/index.ts`)
   - RESTful endpoints
   - JWT authentication
   - Rate limiting
   - Error handling

2. **Indexer Service** (`src/services/indexer.service.ts`)
   - Monitors blockchain events
   - Syncs on-chain data to database
   - Handles reorgs and missed blocks
   - Batch processing for efficiency

3. **Storage Service** (`src/services/storage.service.ts`)
   - IPFS/Arweave integration
   - Metadata upload/retrieval
   - Content pinning

4. **Notification Service** (`src/services/notification.service.ts`)
   - Email notifications
   - Webhook dispatching
   - In-app notifications

**Database Schema:**

```sql
-- Users (authentication)
users (id, wallet_address, is_admin, created_at, last_login_at)

-- Profiles (indexed from blockchain)
profiles (id, wallet_address, profile_id, name, bio, metadata, ...)

-- Skills (indexed from blockchain)
skills (id, profile_id, skill_id, skill_name, category, is_verified, ...)

-- Endorsements (indexed from blockchain)
endorsements (id, skill_id, endorser, endorsement_type, metadata, ...)

-- Verifiers (indexed from blockchain)
verifiers (id, address, name, is_active, reputation_score, ...)

-- API Keys (for admin access)
api_keys (id, key_hash, name, is_active, expires_at, ...)

-- Notifications (user notifications)
notifications (id, user_address, type, title, message, is_read, ...)
```

### Blockchain Layer

**Smart Contracts:**

1. **SkillProfile.sol**
   - User profile creation and management
   - Profile metadata (name, bio, avatar)
   - Upgradeable (UUPS pattern)
   - Pausable for emergencies

2. **SkillClaim.sol**
   - Skill claim creation
   - Evidence submission
   - Verification by trusted verifiers
   - Skill categories and tags

3. **Endorsement.sol**
   - Peer endorsements
   - Verifier endorsements
   - Reputation tracking
   - Endorsement metadata

4. **VerifierRegistry.sol**
   - Verifier registration
   - Reputation management
   - Active/inactive status
   - Admin controls

**Contract Patterns:**
- **UUPS Proxy**: Upgradeable contracts
- **Access Control**: Role-based permissions
- **Pausable**: Emergency stop mechanism
- **Reentrancy Guard**: Protection against attacks
- **Events**: Comprehensive event emission for indexing

**Deployment Architecture:**
```
Implementation Contract (Logic)
         ↑
         │ delegatecall
         │
    Proxy Contract (Storage + State)
         ↑
         │
    User Interactions
```

### Storage Layer

**IPFS Integration:**
- Metadata storage (profiles, skills, endorsements)
- File uploads (evidence, avatars)
- Content pinning for persistence
- Gateway access for retrieval

**Arweave Integration:**
- Permanent storage option
- Transaction-based uploads
- AR token payment
- Immutable references

**Storage Strategy:**
- Small metadata: IPFS (fast, cheap)
- Large files: IPFS with pinning service
- Critical data: Arweave (permanent)
- Hybrid: Both IPFS and Arweave for redundancy

## Data Flow

### Profile Creation Flow

```
1. User connects wallet (Frontend)
   ↓
2. User fills profile form (Frontend)
   ↓
3. Upload metadata to IPFS (Backend API)
   ↓
4. Get IPFS CID
   ↓
5. Call createProfile() on SkillProfile contract (Frontend)
   ↓
6. Transaction confirmed on blockchain
   ↓
7. Indexer detects ProfileCreated event (Backend)
   ↓
8. Store profile data in PostgreSQL (Backend)
   ↓
9. Update UI with new profile (Frontend)
```

### Skill Verification Flow

```
1. User creates skill claim (Frontend)
   ↓
2. Upload evidence to IPFS (Backend API)
   ↓
3. Call claimSkill() on SkillClaim contract (Frontend)
   ↓
4. Verifier reviews claim (Frontend)
   ↓
5. Verifier calls verifySkill() (Frontend)
   ↓
6. Indexer detects SkillVerified event (Backend)
   ↓
7. Update skill status in database (Backend)
   ↓
8. Send notification to user (Backend)
   ↓
9. Update UI with verified badge (Frontend)
```

## Security Architecture

### Authentication & Authorization

**Wallet-Based Auth:**
1. User requests nonce from backend
2. User signs message with wallet
3. Backend verifies signature
4. Backend issues JWT token
5. JWT used for subsequent API calls

**Role-Based Access Control:**
- **User**: Basic profile and skill operations
- **Verifier**: Skill verification permissions
- **Admin**: Contract upgrades and pausing

### Security Measures

**Smart Contracts:**
- OpenZeppelin security libraries
- Reentrancy guards
- Access control modifiers
- Pausable functionality
- Upgrade authorization

**Backend:**
- JWT token expiration
- Rate limiting (100 req/15min)
- Input validation
- SQL injection prevention
- CORS configuration

**Frontend:**
- XSS prevention
- CSRF protection
- Secure wallet connection
- Transaction simulation

## Scalability Considerations

### Horizontal Scaling

**Backend API:**
- Stateless design
- Load balancer ready
- Redis for shared cache
- Database connection pooling

**Indexer:**
- Multiple indexer instances
- Block range partitioning
- Event queue processing

### Performance Optimization

**Caching Strategy:**
- Redis for frequently accessed data
- Browser cache for static assets
- IPFS gateway caching

**Database Optimization:**
- Indexed columns (wallet_address, profile_id, skill_id)
- Pagination for large result sets
- Materialized views for analytics

**Blockchain Optimization:**
- Batch event queries
- Efficient contract calls
- Gas optimization in contracts

## Monitoring & Observability

### Metrics Collection

**Prometheus Metrics:**
- API request rate and latency
- Database query performance
- Indexer sync status
- Cache hit/miss ratio

**Custom Metrics:**
- Blockchain events indexed
- IPFS upload success rate
- Notification delivery rate

### Logging

**Structured Logging:**
- Winston logger with JSON format
- Log levels: error, warn, info, debug
- Correlation IDs for request tracking

**Log Aggregation:**
- Logstash for log processing
- Elasticsearch for storage
- Kibana for visualization

### Alerting

**Alert Rules:**
- API downtime
- High error rate
- Database connection failure
- Indexer lag
- Low disk space

**Notification Channels:**
- Slack for team alerts
- Email for critical issues
- Webhook for custom integrations

## Deployment Architecture

### Development Environment
```
Local Machine
├── Frontend (localhost:5173)
├── Backend (localhost:3001)
├── PostgreSQL (localhost:5432)
├── Redis (localhost:6379)
└── Local Blockchain (Anvil)
```

### Staging Environment
```
Cloud Infrastructure
├── Frontend (Vercel/Netlify)
├── Backend (AWS ECS/Fargate)
├── PostgreSQL (AWS RDS)
├── Redis (AWS ElastiCache)
└── Testnet (Sepolia/Mumbai)
```

### Production Environment
```
Cloud Infrastructure (Multi-Region)
├── Frontend (CDN + Edge)
├── Backend (Auto-scaling containers)
├── PostgreSQL (Primary + Replicas)
├── Redis (Cluster mode)
├── Monitoring (Prometheus + Grafana)
└── Mainnet (Ethereum/Polygon)
```

## Security Controls Verification

**Verification Date:** 2025-11-24  
**Status:** ⚠️ **PARTIAL - Manual Review Only**

### Implemented Security Controls

| Control | Status | Verification Method | Evidence |
|---------|--------|---------------------|----------|
| RBAC (Smart Contracts) | ✅ Implemented | Code review | AccessControl.sol integration |
| UUPS Upgradeable Pattern | ✅ Implemented | Code review | UUPSUpgradeable.sol |
| Pausable Emergency Stops | ✅ Implemented | Code review | Pausable.sol integration |
| JWT Authentication | ✅ Implemented | Code review | auth.controller.ts |
| CSRF Protection | ✅ Implemented | Code review | csrf.ts middleware |
| Rate Limiting | ✅ Implemented | Code review | rateLimit.ts middleware |
| SQL Injection Protection | ✅ Implemented | Code review | Parameterized queries |
| XSS Protection | ✅ Implemented | Code review | sanitize.ts utilities |
| Input Validation | ✅ Implemented | Code review | validation.ts middleware |
| Pagination (Gas DoS) | ✅ Implemented | Code review | Contract pagination functions |

### Test Coverage Status

**Current Coverage:** 0% (target: 95%)  
**Blocker:** Compilation errors preventing test execution

| Component | Coverage | Target | Gap | Status |
|-----------|----------|--------|-----|--------|
| Backend | 0% | 95% | -95% | ❌ TypeScript errors |
| Contracts | 0% | 95% | -95% | ❌ Solidity errors |
| Frontend | N/A | 80% | N/A | ❌ No test suite |

**Detailed Test Report:** [docs/TEST_RESULTS_2025-11-24.md](./TEST_RESULTS_2025-11-24.md)

### Security Audit Status

**Internal Audit:** ✅ Completed (2025-11-24)  
**Findings:** Critical blockers identified  
**Professional Audit:** ❌ Not scheduled (pending remediation)  
**Mainnet Deployment:** 🚫 **BLOCKED**

**Audit Documentation:**
- [Internal Audit Report](./SECURITY_AUDIT_COMPLETE.md)
- [Security Guide](./SECURITY.md)
- [Deployment Requirements](./DEPLOYMENT.md)

---

## Future Enhancements

1. **Layer 2 Integration**: Optimism, Arbitrum support
2. **Cross-Chain**: Bridge for multi-chain profiles
3. **GraphQL API**: Alternative to REST
4. **Mobile App**: React Native application
5. **AI Verification**: ML-based skill verification
6. **Reputation System**: Advanced scoring algorithm
7. **Marketplace**: Skill-based job matching

---

For implementation details, see individual component documentation.
