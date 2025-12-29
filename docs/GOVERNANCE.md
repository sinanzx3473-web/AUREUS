# Takumi Governance Documentation

## Overview

Takumi implements a **two-layer governance architecture** combining Gnosis Safe multi-signature wallet with OpenZeppelin TimelockController to ensure secure, transparent, and decentralized administration of all smart contracts.

**Security Principles:**
- **No Single Point of Failure**: Requires 3-of-5 multi-sig approval
- **Public Transparency**: All operations visible on-chain with 3-day review period
- **No Backdoors**: No emergency bypass mechanisms
- **Permissionless Execution**: Anyone can execute after timelock delay

---

## Governance Architecture

### Layer 1: Gnosis Safe Multi-Signature

**Purpose**: Decentralized decision-making requiring multiple approvals

**Configuration:**
- **Contract**: Gnosis Safe (https://safe.global/)
- **Network**: Ethereum Mainnet / Base / Sepolia
- **Threshold**: 3-of-5 (60% approval required)
- **Signers**: 5 hardware wallet addresses

**Signer Roles:**

| Role | Responsibility | Hardware Wallet | Backup Location |
|------|----------------|-----------------|-----------------|
| CEO/Founder | Strategic decisions, final authority | Ledger Nano X | Bank vault |
| CTO/Tech Lead | Technical validation, code review | Ledger Nano S Plus | Home safe |
| Security Lead | Security review, audit coordination | Trezor Model T | Safety deposit box |
| Operations Lead | Operational oversight, monitoring | Ledger Nano X | Secure facility |
| Legal/Compliance | Regulatory compliance, legal review | Trezor Model One | Law firm vault |

**Security Requirements:**
- ✅ All signers MUST use hardware wallets (Ledger/Trezor)
- ✅ No hot wallets or browser extensions for production
- ✅ Seed phrases stored in physically secure locations
- ✅ Each signer maintains independent backup
- ✅ Regular availability checks (monthly)
- ✅ Documented succession plan for each role

### Layer 2: TimelockController

**Purpose**: Enforces mandatory delay on all admin operations

**Configuration:**
- **Contract**: `TakumiTimelock.sol`
- **Minimum Delay**: 3 days (259,200 seconds)
- **Proposers**: Gnosis Safe multi-sig only
- **Executors**: `address(0)` (anyone can execute after delay)
- **Admin**: Renounced after deployment

**Security Properties:**
- **Transparency**: All pending operations visible on-chain
- **Community Review**: 3-day window to detect malicious proposals
- **No Backdoors**: No emergency bypass mechanism
- **Decentralization**: Execution permissionless after delay
- **Auditability**: Complete operation history on-chain

**Operational Constraints:**
- ⚠️ **No Emergency Pause**: Even critical bugs require 3-day delay
- ⚠️ **Irreversible**: Operations cannot be cancelled after scheduling
- ⚠️ **Public**: All proposals visible before execution
- ✅ **Intentional**: These constraints prevent admin abuse

---

## Deployment Guide

### Step 1: Deploy Gnosis Safe

**Prerequisites:**
- 5 hardware wallets (Ledger Nano X/S Plus or Trezor Model T/One)
- Signer addresses documented and verified
- Backup procedures established

**Deployment Process:**

1. Navigate to Gnosis Safe deployment interface:
   - Mainnet: https://app.safe.global/
   - Sepolia: https://app.safe.global/welcome
   - Base: https://app.safe.global/welcome

2. Configure multi-sig parameters:
   - **Signers**: Add 5 hardware wallet addresses
   - **Threshold**: Set to 3 (3-of-5 approval required)
   - **Name**: "Takumi Governance Multi-Sig"

3. Review and deploy:
   - Verify all signer addresses
   - Confirm threshold setting
   - Deploy Safe contract
   - **Save Safe address** (required for next step)

4. Document deployment:
   ```bash
   # Add to .env file
   GNOSIS_SAFE_ADDRESS=0x1234567890123456789012345678901234567890
   ```

### Step 2: Deploy Governance Contracts

**Prerequisites:**
- Gnosis Safe deployed and address saved
- Deployer private key with sufficient ETH for gas
- Foundry installed and configured

**Deployment Script:**

```bash
# Set environment variables
export GNOSIS_SAFE_ADDRESS=0x1234567890123456789012345678901234567890
export PRIVATE_KEY=0xabcdef...  # Deployer key (temporary use only)

# Deploy all contracts with timelock governance
forge script script/DeployWithTimelock.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify

# Result:
# - TakumiTimelock deployed with 3-day delay
# - SkillProfile, SkillClaim, Endorsement, VerifierRegistry deployed
# - All contracts have timelock as DEFAULT_ADMIN_ROLE
# - Deployer admin role automatically renounced
```

**Deployment Output:**
```
=== Governance Deployment ===
TakumiTimelock: 0xABCD...
Minimum delay: 259200 seconds (3 days)
Gnosis Safe (proposer): 0x1234...

=== Contract Deployment ===
SkillProfile: 0xEF01...
SkillClaim: 0x2345...
Endorsement: 0x6789...
VerifierRegistry: 0xABCD...

=== Governance Setup Complete ===
✓ Deployer admin role renounced
✓ All admin operations now require Gnosis Safe proposal + 3-day timelock
```

### Step 3: Verify Governance Setup

**Verification Checklist:**

```bash
# 1. Verify timelock has admin role on all contracts
cast call $SKILL_PROFILE_ADDRESS "hasRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  $TIMELOCK_ADDRESS
# Expected: true

# 2. Verify deployer has NO admin role
cast call $SKILL_PROFILE_ADDRESS "hasRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  $DEPLOYER_ADDRESS
# Expected: false

# 3. Verify timelock minimum delay
cast call $TIMELOCK_ADDRESS "getMinDelay()"
# Expected: 259200 (3 days in seconds)

# 4. Verify Gnosis Safe is proposer
cast call $TIMELOCK_ADDRESS "hasRole(bytes32,address)" \
  $(cast keccak "PROPOSER_ROLE") \
  $GNOSIS_SAFE_ADDRESS
# Expected: true
```

---

## Governance Operations

### Operation Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Gnosis Safe Proposal                                │
│ ├── Navigate to Safe UI (https://app.safe.global/)          │
│ ├── Create transaction (e.g., SkillProfile.pause())         │
│ ├── Collect 3-of-5 signatures from signers                  │
│ └── Submit to TimelockController.schedule()                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Timelock Delay (3 days)                             │
│ ├── Operation queued on-chain (publicly visible)            │
│ ├── Community can review and prepare                        │
│ ├── 259,200 seconds countdown                               │
│ └── No cancellation possible                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Execution (permissionless)                          │
│ ├── After delay expires, anyone can execute                 │
│ ├── Call TimelockController.execute()                       │
│ └── Operation executes (e.g., contract paused)              │
└─────────────────────────────────────────────────────────────┘
```

### Common Operations

#### 1. Pause Contract (Emergency)

**Use Case**: Critical bug discovered, need to pause contract

**Gnosis Safe Transaction:**
```solidity
// Target: SkillProfile contract
// Function: pause()
// Value: 0 ETH
// Data: 0x8456cb59 (pause() selector)
```

**Timeline:**
- Day 0: Gnosis Safe proposal created, signatures collected
- Day 0: Proposal submitted to TimelockController.schedule()
- Day 1-3: Public review period, community notified
- Day 3+: Anyone executes TimelockController.execute()
- Result: SkillProfile contract paused

#### 2. Grant Verifier Role

**Use Case**: Onboard new verified skill verifier

**Gnosis Safe Transaction:**
```solidity
// Target: SkillProfile contract
// Function: grantRole(bytes32 role, address account)
// Value: 0 ETH
// Data: 
//   role = keccak256("VERIFIER_ROLE")
//   account = 0x... (verifier address)
```

**Timeline:**
- Day 0: Verifier credentials reviewed off-chain
- Day 0: Gnosis Safe proposal created and submitted
- Day 1-3: Community can verify verifier credentials
- Day 3+: Role granted via execution
- Result: Verifier can approve/reject claims

#### 3. Unpause Contract

**Use Case**: Bug fixed, resume normal operations

**Gnosis Safe Transaction:**
```solidity
// Target: SkillProfile contract
// Function: unpause()
// Value: 0 ETH
// Data: 0x3f4ba83a (unpause() selector)
```

**Timeline:**
- Day 0: Fix deployed and verified
- Day 0: Gnosis Safe proposal submitted
- Day 1-3: Community review of fix
- Day 3+: Contract unpaused
- Result: Normal operations resumed

#### 4. Revoke Verifier Role

**Use Case**: Verifier compromised or misbehaving

**Gnosis Safe Transaction:**
```solidity
// Target: SkillProfile contract
// Function: revokeRole(bytes32 role, address account)
// Value: 0 ETH
// Data:
//   role = keccak256("VERIFIER_ROLE")
//   account = 0x... (verifier address)
```

**Timeline:**
- Day 0: Evidence of compromise documented
- Day 0: Emergency proposal submitted
- Day 1-3: Investigation period
- Day 3+: Role revoked
- Result: Verifier can no longer approve claims

---

## Emergency Procedures

### Signer Compromise

**Scenario**: One signer's hardware wallet or seed phrase compromised

**Response:**
1. **Immediate**: Remaining signers create proposal to remove compromised signer
2. **Day 0-3**: Timelock delay (cannot be bypassed)
3. **Day 3+**: Execute signer removal
4. **Day 3+**: Add replacement signer via new proposal
5. **Day 6+**: New signer active

**Prevention:**
- Regular security audits of signer practices
- Mandatory hardware wallet usage
- Seed phrase backup verification

### Lost Hardware Wallet

**Scenario**: Signer loses hardware wallet but has seed phrase backup

**Response:**
1. **Immediate**: Signer restores wallet from seed phrase
2. **Immediate**: Generate new address from restored wallet
3. **Day 0**: Create proposal to replace old address with new address
4. **Day 0-3**: Timelock delay
5. **Day 3+**: Execute signer replacement

**Prevention:**
- Documented backup procedures
- Regular backup verification drills
- Multiple backup locations

### Signer Unavailability

**Scenario**: Signer unavailable (illness, travel, etc.)

**Response:**
- **3-of-5 threshold allows operations with 2 unavailable signers**
- If 3+ signers unavailable: Activate succession plan
- Backup signers from succession plan step in

**Prevention:**
- Monthly availability checks
- Documented succession plan
- Backup signer training

### Critical Bug (No Emergency Bypass)

**Scenario**: Critical vulnerability discovered in smart contract

**Response:**
1. **Day 0**: 
   - Document vulnerability privately
   - Create Gnosis Safe proposal to pause contract
   - Collect 3-of-5 signatures immediately
   - Submit to TimelockController
   - **Public disclosure delayed until fix ready**

2. **Day 0-3**:
   - Develop and test fix
   - Prepare upgrade proposal
   - Notify users of upcoming pause (without disclosing vulnerability)

3. **Day 3**:
   - Execute pause operation
   - Deploy fix
   - Create unpause proposal
   - Public disclosure of vulnerability and fix

4. **Day 6**:
   - Execute unpause operation
   - Resume normal operations

**Important**: 
- ⚠️ **No emergency bypass exists** (intentional design)
- 3-day delay applies even to critical bugs
- This prevents admin abuse and ensures transparency

---

## Signer Responsibilities

### CEO/Founder
- **Strategic Decisions**: Final authority on platform direction
- **Availability**: Must respond to proposals within 24 hours
- **Backup**: Designated successor documented
- **Hardware Wallet**: Ledger Nano X stored in bank vault

### CTO/Tech Lead
- **Technical Validation**: Review all technical proposals
- **Code Review**: Verify smart contract changes
- **Availability**: 24/7 on-call rotation
- **Hardware Wallet**: Ledger Nano S Plus stored in home safe

### Security Lead
- **Security Review**: Audit all proposals for security implications
- **Incident Response**: Lead response to security incidents
- **Availability**: 24/7 emergency contact
- **Hardware Wallet**: Trezor Model T stored in safety deposit box

### Operations Lead
- **Operational Oversight**: Monitor platform health
- **User Impact**: Assess user impact of proposals
- **Availability**: Business hours + emergency on-call
- **Hardware Wallet**: Ledger Nano X stored in secure facility

### Legal/Compliance
- **Regulatory Compliance**: Ensure proposals comply with regulations
- **Legal Review**: Review legal implications
- **Availability**: Business hours + emergency contact
- **Hardware Wallet**: Trezor Model One stored in law firm vault

---

## Monitoring & Alerts

### On-Chain Monitoring

**Timelock Operations:**
- Monitor `CallScheduled` events for new proposals
- Alert all signers when proposal submitted
- Daily digest of pending operations
- Countdown notifications (3 days, 1 day, 1 hour before execution)

**Role Changes:**
- Monitor `RoleGranted` and `RoleRevoked` events
- Alert on any role changes
- Weekly role audit report

**Contract State:**
- Monitor `Paused` and `Unpaused` events
- Alert on contract state changes
- Daily health check of all contracts

### Off-Chain Monitoring

**Signer Availability:**
- Monthly availability check
- Quarterly backup verification
- Annual succession plan review

**Hardware Wallet Security:**
- Quarterly security audit of signer practices
- Annual hardware wallet firmware updates
- Backup location verification

---

## Audit Trail

All governance operations are permanently recorded on-chain:

**TimelockController Events:**
- `CallScheduled`: Proposal submitted
- `CallExecuted`: Proposal executed
- `Cancelled`: Proposal cancelled (rare)

**AccessControl Events:**
- `RoleGranted`: Role granted to address
- `RoleRevoked`: Role revoked from address
- `RoleAdminChanged`: Role admin changed

**Contract Events:**
- `Paused`: Contract paused
- `Unpaused`: Contract unpaused

**Query Examples:**
```bash
# Get all pending operations
cast logs --address $TIMELOCK_ADDRESS \
  --from-block $START_BLOCK \
  "CallScheduled(bytes32,uint256,address,uint256,bytes,bytes32,uint256)"

# Get all executed operations
cast logs --address $TIMELOCK_ADDRESS \
  --from-block $START_BLOCK \
  "CallExecuted(bytes32,uint256,address,uint256,bytes)"

# Get all role changes
cast logs --address $SKILL_PROFILE_ADDRESS \
  --from-block $START_BLOCK \
  "RoleGranted(bytes32,address,address)"
```

---

## Testing Procedures

### Testnet Governance Testing

**Before Mainnet Deployment:**

1. **Deploy on Sepolia**:
   ```bash
   # Deploy Gnosis Safe on Sepolia
   # Deploy governance contracts
   forge script script/DeployWithTimelock.s.sol \
     --rpc-url $SEPOLIA_RPC_URL \
     --broadcast
   ```

2. **Test Pause Operation**:
   - Create Gnosis Safe proposal
   - Collect signatures
   - Submit to timelock
   - Wait 3 days (or use shorter delay for testing)
   - Execute pause

3. **Test Role Grant**:
   - Propose VERIFIER_ROLE grant
   - Collect signatures
   - Submit and execute after delay

4. **Test Emergency Scenarios**:
   - Simulate signer compromise
   - Test signer replacement
   - Verify 3-of-5 threshold

5. **Verify No Bypass**:
   - Attempt to execute before delay
   - Verify operation fails
   - Confirm no emergency bypass exists

---

## Documentation Updates

**Required Documentation:**
- `docs/ARCHITECTURE.md`: Governance model overview
- `docs/GOVERNANCE.md`: This document (detailed procedures)
- `docs/SECURITY_AUDIT_COMPLETE.md`: Governance security controls
- `contracts/interfaces/metadata.json`: Deployed contract addresses

**Update Frequency:**
- After each governance operation
- After signer changes
- Quarterly governance review
- Annual comprehensive audit

---

## Contact Information

**Governance Contacts:**
- **Security Lead**: security@takumi.example
- **Emergency Contact**: emergency@takumi.example
- **General Governance**: governance@takumi.example

**Gnosis Safe Address**: [To be updated after deployment]
**TimelockController Address**: [To be updated after deployment]

**Signer Contact List**: [Maintained separately in secure location]

---

## Appendix: Technical Reference

### Contract Addresses

**Mainnet** (To be deployed):
- TakumiTimelock: `TBD`
- SkillProfile: `TBD`
- SkillClaim: `TBD`
- Endorsement: `TBD`
- VerifierRegistry: `TBD`
- Gnosis Safe: `TBD`

**Sepolia Testnet**:
- TakumiTimelock: `TBD`
- SkillProfile: `TBD`
- SkillClaim: `TBD`
- Endorsement: `TBD`
- VerifierRegistry: `TBD`
- Gnosis Safe: `TBD`

### Role Identifiers

```solidity
// OpenZeppelin AccessControl roles
DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000
ADMIN_ROLE = keccak256("ADMIN_ROLE")
VERIFIER_ROLE = keccak256("VERIFIER_ROLE")

// TimelockController roles
PROPOSER_ROLE = keccak256("PROPOSER_ROLE")
EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE")
CANCELLER_ROLE = keccak256("CANCELLER_ROLE")
```

### Function Selectors

```solidity
// Common operations
pause() = 0x8456cb59
unpause() = 0x3f4ba83a
grantRole(bytes32,address) = 0x2f2ff15d
revokeRole(bytes32,address) = 0xd547741f
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-25  
**Next Review**: 2026-02-25 (Quarterly)
