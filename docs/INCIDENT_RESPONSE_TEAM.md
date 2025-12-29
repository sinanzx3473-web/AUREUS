# Incident Response Team & Kill Switch Protocol

## Overview
This document defines the emergency response procedures for security incidents affecting the AUREUS platform. The "Red Button" protocol enables immediate contract pausing to protect user funds during active exploits.

---

## Team Structure

### Security Lead
**Role:** Primary incident responder and decision maker  
**Responsibilities:**
- Monitor security alerts and anomaly detection
- Execute emergency pause procedures
- Coordinate with team and communicate with community
- Lead post-incident analysis and remediation

### Response Team
- **Security Lead:** Primary responder (executes pause)
- **Technical Lead:** Contract analysis and exploit assessment
- **Communications Lead:** Public communications and user support
- **Legal Counsel:** Regulatory compliance and disclosure requirements

---

## The Red Button Protocol

### When to Activate
Immediately activate the kill switch if:
- ✅ Active exploit detected draining funds
- ✅ Critical vulnerability discovered being exploited
- ✅ Unusual transaction patterns indicating attack
- ✅ Smart contract logic behaving unexpectedly
- ✅ Oracle manipulation or price feed attack detected

### DO NOT Activate For
- ❌ Normal market volatility
- ❌ User errors or support requests
- ❌ Theoretical vulnerabilities without active exploitation
- ❌ Minor bugs that don't affect fund security

---

## Emergency Pause Procedures

### Prerequisites
Ensure you have ready access to:
- Admin private key (stored in secure hardware wallet)
- RPC endpoint URLs for all deployed chains
- Contract addresses for all pausable contracts
- Foundry/Cast CLI tools installed

### Contract Addresses (Update After Deployment)
```bash
# Base Sepolia Testnet
SKILL_CLAIM_ADDRESS="0x..."
SKILL_PROFILE_ADDRESS="0x..."
AUREUS_TOKEN_ADDRESS="0x..."
BOUNTY_VAULT_ADDRESS="0x..."
AGENT_ORACLE_ADDRESS="0x..."

# Mainnet (when deployed)
SKILL_CLAIM_MAINNET="0x..."
SKILL_PROFILE_MAINNET="0x..."
AUREUS_TOKEN_MAINNET="0x..."
BOUNTY_VAULT_MAINNET="0x..."
AGENT_ORACLE_MAINNET="0x..."
```

### Method 1: Emergency Pause via Cast (Recommended)

**Step 1: Set Environment Variables**
```bash
# Set RPC URL
export RPC_URL="https://sepolia.base.org"  # or your RPC provider

# Set admin private key (use hardware wallet for production)
export ADMIN_KEY="0x..."  # NEVER commit this to git

# Set contract addresses
export SKILL_CLAIM="0x..."
export SKILL_PROFILE="0x..."
export AUREUS_TOKEN="0x..."
export BOUNTY_VAULT="0x..."
```

**Step 2: Execute Pause Commands**
```bash
# Pause SkillClaim contract
cast send --rpc-url $RPC_URL \
  --private-key $ADMIN_KEY \
  $SKILL_CLAIM \
  "pause()"

# Pause SkillProfile contract
cast send --rpc-url $RPC_URL \
  --private-key $ADMIN_KEY \
  $SKILL_PROFILE \
  "pause()"

# Pause AureusToken contract
cast send --rpc-url $RPC_URL \
  --private-key $ADMIN_KEY \
  $AUREUS_TOKEN \
  "pause()"

# Pause BountyVault contract
cast send --rpc-url $RPC_URL \
  --private-key $ADMIN_KEY \
  $BOUNTY_VAULT \
  "pause()"
```

**Step 3: Verify Pause Status**
```bash
# Check if contracts are paused
cast call $SKILL_CLAIM "paused()" --rpc-url $RPC_URL
cast call $SKILL_PROFILE "paused()" --rpc-url $RPC_URL
cast call $AUREUS_TOKEN "paused()" --rpc-url $RPC_URL
cast call $BOUNTY_VAULT "paused()" --rpc-url $RPC_URL

# Expected output: true (0x0000000000000000000000000000000000000000000000000000000000000001)
```

### Method 2: Emergency Pause via Etherscan (Backup Method)

**Step 1: Navigate to Contract**
1. Go to Etherscan/Basescan for your network
2. Navigate to contract address
3. Click "Contract" tab → "Write Contract"
4. Click "Connect to Web3" and connect admin wallet

**Step 2: Execute Pause**
1. Find `pause()` function
2. Click "Write" button
3. Confirm transaction in wallet
4. Wait for transaction confirmation

**Step 3: Verify**
1. Go to "Read Contract" tab
2. Call `paused()` function
3. Verify it returns `true`

### Method 3: Emergency Pause Script (Automated)

Create `scripts/emergency-pause.sh`:
```bash
#!/bin/bash

# Emergency Pause Script
# Usage: ./scripts/emergency-pause.sh [network]

set -e

NETWORK=${1:-base-sepolia}

echo "🚨 EMERGENCY PAUSE PROTOCOL ACTIVATED 🚨"
echo "Network: $NETWORK"
echo ""

# Load environment variables
source .env.$NETWORK

# Pause all contracts
echo "Pausing SkillClaim..."
cast send --rpc-url $RPC_URL --private-key $ADMIN_KEY $SKILL_CLAIM "pause()"

echo "Pausing SkillProfile..."
cast send --rpc-url $RPC_URL --private-key $ADMIN_KEY $SKILL_PROFILE "pause()"

echo "Pausing AureusToken..."
cast send --rpc-url $RPC_URL --private-key $ADMIN_KEY $AUREUS_TOKEN "pause()"

echo "Pausing BountyVault..."
cast send --rpc-url $RPC_URL --private-key $ADMIN_KEY $BOUNTY_VAULT "pause()"

echo ""
echo "✅ All contracts paused successfully"
echo ""

# Verify pause status
echo "Verifying pause status..."
cast call $SKILL_CLAIM "paused()" --rpc-url $RPC_URL
cast call $SKILL_PROFILE "paused()" --rpc-url $RPC_URL
cast call $AUREUS_TOKEN "paused()" --rpc-url $RPC_URL
cast call $BOUNTY_VAULT "paused()" --rpc-url $RPC_URL

echo ""
echo "🔴 CONTRACTS ARE NOW PAUSED 🔴"
echo "Next steps:"
echo "1. Post security breach notification"
echo "2. Begin incident investigation"
echo "3. Prepare remediation plan"
```

---

## Communication Templates

### Security Breach Tweet (Immediate)
```
🚨 SECURITY ALERT 🚨

We have detected suspicious activity on the AUREUS platform and have immediately paused all smart contracts to protect user funds.

✅ All funds are safe
✅ No user action required
✅ Contracts are paused

Investigation underway. Updates in 30 minutes.

#AUREUS #SecurityFirst
```

### Discord/Telegram Announcement (Immediate)
```
@everyone 🚨 SECURITY INCIDENT - CONTRACTS PAUSED 🚨

We have activated our emergency pause protocol due to detected suspicious activity.

**Current Status:**
✅ All smart contracts paused
✅ User funds are safe
✅ No action required from users

**What This Means:**
- All contract interactions are temporarily disabled
- Your funds remain secure in the contracts
- We are investigating the incident

**Next Steps:**
- Security team is analyzing the situation
- We will provide updates every 30 minutes
- Do not interact with any unofficial contracts or links

**Timeline:**
- Incident detected: [TIME]
- Contracts paused: [TIME]
- Next update: [TIME + 30 min]

Stay tuned for updates. Do not trust any DMs claiming to be from the team.
```

### Email to Users (Within 1 hour)
```
Subject: AUREUS Security Incident - Your Funds Are Safe

Dear AUREUS Community,

We are writing to inform you of a security incident that occurred on [DATE] at [TIME] UTC.

WHAT HAPPENED:
Our monitoring systems detected suspicious activity on the AUREUS smart contracts. We immediately activated our emergency pause protocol to protect all user funds.

YOUR FUNDS ARE SAFE:
✅ All smart contracts have been paused
✅ No funds have been lost
✅ Your assets remain secure in the contracts
✅ No action is required from you at this time

WHAT WE'RE DOING:
- Our security team is conducting a thorough investigation
- We are working with blockchain security experts
- We will provide regular updates every 2 hours

TIMELINE:
- Incident detected: [TIME]
- Contracts paused: [TIME]
- Investigation started: [TIME]
- Next update: [TIME + 2 hours]

WHAT YOU SHOULD DO:
- Do NOT interact with any contracts claiming to be AUREUS
- Do NOT respond to DMs offering "help" or "refunds"
- Wait for official updates from our verified channels
- Monitor our official Twitter: @AureusOfficial
- Join our Discord for real-time updates: [LINK]

We take security extremely seriously and will provide full transparency throughout this process.

Thank you for your patience and trust.

The AUREUS Security Team
```

### Status Page Update
```
🔴 MAJOR INCIDENT - Smart Contracts Paused

Status: Investigating
Started: [TIME] UTC
Last Update: [TIME] UTC

We have paused all AUREUS smart contracts due to detected suspicious activity. 
All user funds are safe. Investigation in progress.

Updates:
- [TIME]: Incident detected, contracts paused
- [TIME]: Security team investigating
- [TIME]: External security firm engaged
- [TIME]: Root cause identified
- [TIME]: Remediation plan in progress

Next update: [TIME]
```

---

## Post-Pause Procedures

### Immediate Actions (0-1 hour)
1. ✅ Verify all contracts are paused
2. ✅ Post initial security alert on all channels
3. ✅ Assemble incident response team
4. ✅ Begin transaction analysis and forensics
5. ✅ Contact blockchain security firms (if needed)
6. ✅ Preserve all logs and evidence

### Investigation Phase (1-24 hours)
1. Analyze exploit transaction(s)
2. Identify vulnerability root cause
3. Assess total impact and affected users
4. Develop remediation plan
5. Prepare contract fixes
6. Conduct security audit of fixes
7. Plan communication strategy

### Recovery Phase (24-72 hours)
1. Deploy fixed contracts (if needed)
2. Test fixes on testnet
3. Prepare migration plan for users
4. Coordinate with exchanges/partners
5. Plan unpause timeline
6. Prepare detailed post-mortem

### Unpause Procedures
```bash
# Only unpause after:
# 1. Vulnerability is fixed
# 2. Security audit completed
# 3. Team consensus reached
# 4. Users notified of unpause timeline

# Unpause contracts
cast send --rpc-url $RPC_URL \
  --private-key $ADMIN_KEY \
  $SKILL_CLAIM \
  "unpause()"

# Verify unpause
cast call $SKILL_CLAIM "paused()" --rpc-url $RPC_URL
# Expected: false (0x0000000000000000000000000000000000000000000000000000000000000000)
```

---

## Contact Information

### Internal Team
- **Security Lead:** [NAME] - [SIGNAL/TELEGRAM]
- **Technical Lead:** [NAME] - [SIGNAL/TELEGRAM]
- **Communications:** [NAME] - [SIGNAL/TELEGRAM]
- **Legal Counsel:** [NAME] - [EMAIL/PHONE]

### External Resources
- **Security Auditors:** [FIRM NAME] - [CONTACT]
- **Blockchain Forensics:** Chainalysis, CipherTrace
- **Legal Counsel:** [LAW FIRM] - [CONTACT]
- **Insurance Provider:** [IF APPLICABLE]

### Emergency Hotline
- **24/7 Security Hotline:** [PHONE]
- **Signal Group:** [LINK]
- **Emergency Email:** security@aureus.io

---

## Incident Severity Levels

### CRITICAL (Red Button)
- Active exploit draining funds
- **Action:** Immediate pause, all hands on deck
- **Communication:** Immediate public notification

### HIGH
- Vulnerability discovered, no active exploitation
- **Action:** Assess risk, prepare pause if needed
- **Communication:** Internal team alert

### MEDIUM
- Potential vulnerability, needs investigation
- **Action:** Monitor closely, investigate
- **Communication:** Security team only

### LOW
- Minor bug, no security impact
- **Action:** Standard bug fix process
- **Communication:** Development team

---

## Testing & Drills

### Quarterly Pause Drills
- Test pause procedures on testnet
- Verify all team members have access
- Update contact information
- Review and update procedures

### Annual Security Review
- Review incident response plan
- Update communication templates
- Test emergency communication channels
- Conduct tabletop exercises

---

## Legal & Compliance

### Regulatory Notifications
Depending on jurisdiction and incident severity, notify:
- SEC (if applicable)
- Local financial regulators
- Law enforcement (if criminal activity suspected)
- Insurance providers

### Documentation Requirements
Maintain detailed records of:
- Incident timeline
- Actions taken
- Communications sent
- Financial impact
- Remediation steps

---

## Appendix

### Useful Commands

**Check Contract Pause Status:**
```bash
cast call $CONTRACT_ADDRESS "paused()" --rpc-url $RPC_URL
```

**Check Admin Role:**
```bash
cast call $CONTRACT_ADDRESS "hasRole(bytes32,address)" \
  $(cast keccak "ADMIN_ROLE") \
  $ADMIN_ADDRESS \
  --rpc-url $RPC_URL
```

**Get Recent Transactions:**
```bash
cast logs --from-block -1000 --address $CONTRACT_ADDRESS --rpc-url $RPC_URL
```

**Monitor Contract Events:**
```bash
cast logs --follow --address $CONTRACT_ADDRESS --rpc-url $RPC_URL
```

### Resources
- [Foundry Book - Cast Reference](https://book.getfoundry.sh/reference/cast/)
- [OpenZeppelin Pausable Documentation](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [Blockchain Security Incident Database](https://rekt.news/)
- [Post-Mortem Template](https://github.com/danluu/post-mortems)

---

**Last Updated:** 2025-11-30  
**Next Review:** 2026-02-28  
**Version:** 1.0
