# Takumi Bug Bounty Program

## Overview

The Takumi Bug Bounty Program rewards security researchers and community members for responsibly disclosing security vulnerabilities in the Takumi platform.

**Program Status**: 🟡 **Testnet Phase** (Mainnet program launches post-audit)

## Scope

### In-Scope Assets

**Smart Contracts** (Highest Priority):
- SkillProfile.sol
- SkillClaim.sol
- Endorsement.sol
- VerifierRegistry.sol
- TakumiTimelock.sol (if deployed)
- Proxy contracts (ERC1967Proxy)
- Deployment scripts

**Backend API**:
- Authentication and authorization
- API endpoints (/api/*)
- Database queries and migrations
- Webhook handlers
- Rate limiting
- CORS configuration

**Frontend**:
- Wallet integration
- Transaction signing
- XSS vulnerabilities
- CSRF vulnerabilities
- Authentication flows

**Infrastructure**:
- Docker configurations
- Environment variable handling
- Secrets management
- Monitoring stack

### Out-of-Scope

- Third-party dependencies (report to respective projects)
- Social engineering attacks
- Physical attacks
- Denial of Service (DoS) attacks on testnet
- Issues already known and documented
- Theoretical vulnerabilities without proof of concept
- Spam or low-quality reports

## Severity Classification

### Critical (P1)

**Reward**: $10,000 - $50,000 (Mainnet) | $500 - $1,000 (Testnet)

**Examples**:
- Theft of funds from smart contracts
- Unauthorized minting or burning of tokens
- Permanent freezing of funds
- Unauthorized contract upgrades
- Complete authentication bypass
- Remote code execution
- SQL injection leading to data breach
- Private key exposure

**Requirements**:
- Proof of concept demonstrating the vulnerability
- Clear impact assessment
- Detailed reproduction steps

### High (P2)

**Reward**: $5,000 - $10,000 (Mainnet) | $250 - $500 (Testnet)

**Examples**:
- Unauthorized access to user data
- Privilege escalation
- Bypassing access controls
- Reentrancy vulnerabilities
- Integer overflow/underflow
- Unauthorized role grants
- Session hijacking
- Stored XSS

**Requirements**:
- Proof of concept
- Impact assessment
- Reproduction steps

### Medium (P3)

**Reward**: $1,000 - $5,000 (Mainnet) | $100 - $250 (Testnet)

**Examples**:
- Information disclosure
- Reflected XSS
- CSRF on state-changing operations
- Weak cryptography
- Insecure direct object references
- Gas optimization issues causing DoS
- Logic errors in non-critical functions

**Requirements**:
- Clear description
- Reproduction steps
- Suggested fix

### Low (P4)

**Reward**: $100 - $1,000 (Mainnet) | $25 - $100 (Testnet)

**Examples**:
- Minor information disclosure
- Best practice violations
- Code quality issues
- Documentation errors
- Non-exploitable bugs
- UI/UX issues with security implications

**Requirements**:
- Clear description
- Suggested improvement

### Informational

**Reward**: Recognition + Swag

**Examples**:
- Code style improvements
- Gas optimizations (minor)
- Documentation improvements
- Suggestions for future enhancements

## Submission Process

### 1. Prepare Your Report

**Required Information**:
- **Title**: Clear, concise description
- **Severity**: Your assessment (we may adjust)
- **Asset**: Which component is affected
- **Description**: Detailed explanation of the vulnerability
- **Impact**: What can an attacker achieve
- **Proof of Concept**: Code, screenshots, or video
- **Reproduction Steps**: Step-by-step instructions
- **Suggested Fix**: How to remediate (optional but appreciated)
- **Your Details**: Name/pseudonym, email, wallet address (for payment)

**Report Template**:
```markdown
# [Severity] Vulnerability Title

## Summary
Brief description of the vulnerability.

## Severity
Critical / High / Medium / Low / Informational

## Asset
- Component: Smart Contracts / Backend / Frontend / Infrastructure
- File: path/to/file.sol
- Line: 123-145
- Network: Sepolia / Mainnet

## Description
Detailed explanation of the vulnerability, including:
- What is the vulnerability
- Why it exists
- What makes it exploitable

## Impact
What can an attacker achieve by exploiting this vulnerability?
- Theft of funds
- Unauthorized access
- Data breach
- Service disruption
- Other impacts

## Proof of Concept
```solidity
// Exploit code
function exploit() public {
    // ...
}
```

Or provide:
- Screenshots
- Video recording
- Transaction hashes
- Logs

## Reproduction Steps
1. Step one
2. Step two
3. Step three
4. Observe the vulnerability

## Suggested Fix
```solidity
// Recommended fix
function fixedFunction() public {
    // ...
}
```

## References
- Related CVEs
- Similar vulnerabilities
- Documentation

## Reporter Information
- Name/Pseudonym: [Your Name]
- Email: [your@email.com]
- Wallet Address: [0x... for payment]
- GitHub: [optional]
- Twitter: [optional]
```

### 2. Submit Your Report

**Email Submission** (Preferred):
- To: security@takumi.example
- Subject: [Bug Bounty] [Severity] Brief Description
- Attach: Full report in Markdown or PDF
- PGP: Encrypt sensitive reports with our PGP key (see below)

**GitHub Security Advisory** (Alternative):
- Go to: https://github.com/takumi/takumi/security/advisories
- Click "Report a vulnerability"
- Fill in the form
- Submit privately

**DO NOT**:
- ❌ Open public GitHub issues for security vulnerabilities
- ❌ Discuss vulnerabilities publicly before disclosure
- ❌ Share exploits with others
- ❌ Exploit vulnerabilities beyond proof of concept

### 3. Response Timeline

| Stage | Timeline | Description |
|-------|----------|-------------|
| **Initial Response** | 24-48 hours | Acknowledgment of receipt |
| **Triage** | 3-5 days | Severity assessment and validation |
| **Investigation** | 1-2 weeks | Detailed analysis and fix development |
| **Fix Deployment** | 2-4 weeks | Testing and deployment of fix |
| **Reward Payment** | 1 week after fix | Payment in ETH or stablecoin |
| **Public Disclosure** | 90 days | Coordinated disclosure (if applicable) |

### 4. Validation Process

Our security team will:
1. **Acknowledge** receipt within 24-48 hours
2. **Validate** the vulnerability (reproduce the issue)
3. **Assess** severity and impact
4. **Communicate** findings and reward amount
5. **Develop** and test fix
6. **Deploy** fix to testnet, then mainnet
7. **Pay** reward after fix is deployed
8. **Coordinate** public disclosure (if applicable)

## Rewards

### Payment Methods

- **Cryptocurrency**: ETH, USDC, USDT (on Ethereum mainnet)
- **Fiat**: Bank transfer or PayPal (for amounts >$1,000)
- **Wallet Address**: Provide during submission

### Reward Factors

Final reward amount depends on:
- **Severity**: Critical > High > Medium > Low
- **Impact**: Actual vs theoretical impact
- **Quality**: Report quality and detail
- **Novelty**: First reporter gets full reward
- **Cooperation**: Responsiveness and professionalism

### Bonus Multipliers

- **+50%**: Provide working fix with tests
- **+25%**: Exceptional report quality
- **+25%**: Find multiple related vulnerabilities
- **+10%**: Suggest gas optimizations

### Duplicate Reports

- **First reporter**: Full reward
- **Second reporter**: 50% reward (if submitted within 24 hours)
- **Third+ reporters**: Recognition only

## Rules & Guidelines

### Responsible Disclosure

**DO**:
- ✅ Report vulnerabilities privately
- ✅ Provide detailed, actionable reports
- ✅ Allow reasonable time for fixes (90 days)
- ✅ Cooperate with our security team
- ✅ Test on testnet when possible

**DON'T**:
- ❌ Publicly disclose before fix is deployed
- ❌ Exploit vulnerabilities for profit
- ❌ Access or modify user data
- ❌ Perform DoS attacks
- ❌ Social engineer team members
- ❌ Violate laws or regulations

### Testing Guidelines

**Testnet Testing** (Encouraged):
- Use Sepolia testnet for testing
- Get testnet ETH from faucets
- Test all exploits on testnet first
- Document testnet transaction hashes

**Mainnet Testing** (Restricted):
- Only if absolutely necessary
- Use minimal amounts
- Do not impact other users
- Immediately report findings

### Disqualification

Reports will be rejected if:
- Vulnerability is already known
- No proof of concept provided
- Testing violated guidelines
- Report is spam or low quality
- Vulnerability is out of scope
- Reporter violated disclosure rules

## Examples of Valid Reports

### Example 1: Critical - Reentrancy Vulnerability

```markdown
# [Critical] Reentrancy in SkillClaim.approveClaim()

## Summary
The `approveClaim()` function is vulnerable to reentrancy attacks, allowing an attacker to drain contract funds.

## Severity
Critical

## Asset
- Component: Smart Contracts
- File: contracts/src/SkillClaim.sol
- Line: 145-160
- Network: Sepolia

## Description
The `approveClaim()` function makes an external call before updating state, violating the checks-effects-interactions pattern. An attacker can create a malicious contract that re-enters `approveClaim()` during the external call, draining funds.

## Impact
- Complete theft of contract funds
- Loss of user assets
- Platform compromise

## Proof of Concept
```solidity
contract Exploit {
    SkillClaim public target;
    uint256 public claimId;
    
    function attack(address _target, uint256 _claimId) public {
        target = SkillClaim(_target);
        claimId = _claimId;
        target.approveClaim(claimId);
    }
    
    receive() external payable {
        if (address(target).balance > 0) {
            target.approveClaim(claimId);
        }
    }
}
```

## Reproduction Steps
1. Deploy malicious contract
2. Submit claim with malicious contract as recipient
3. Call `attack()` function
4. Observe repeated calls to `approveClaim()`
5. Contract balance drained

## Suggested Fix
```solidity
function approveClaim(uint256 claimId) public {
    require(hasRole(VERIFIER_ROLE, msg.sender), "Not verifier");
    Claim storage claim = claims[claimId];
    require(claim.status == ClaimStatus.Pending, "Invalid status");
    
    // Effects before interactions
    claim.status = ClaimStatus.Approved;
    emit ClaimApproved(claimId, msg.sender);
    
    // Interactions last
    if (claim.reward > 0) {
        payable(claim.claimer).transfer(claim.reward);
    }
}
```

Or use OpenZeppelin's ReentrancyGuard:
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SkillClaim is ReentrancyGuard {
    function approveClaim(uint256 claimId) public nonReentrant {
        // ...
    }
}
```

## Reporter Information
- Name: Alice Security
- Email: alice@security.example
- Wallet: 0x1234...5678
```

### Example 2: High - Authentication Bypass

```markdown
# [High] JWT Signature Verification Bypass

## Summary
The backend API does not properly verify JWT signatures, allowing attackers to forge authentication tokens.

## Severity
High

## Asset
- Component: Backend API
- File: backend/src/middleware/auth.ts
- Line: 45-60

## Description
The JWT verification middleware uses `jwt.decode()` instead of `jwt.verify()`, which does not validate the signature. An attacker can create arbitrary JWTs with any user ID.

## Impact
- Complete authentication bypass
- Unauthorized access to any user account
- Data theft and manipulation

## Proof of Concept
```javascript
const jwt = require('jsonwebtoken');

// Create forged token (no signature verification)
const forgedToken = jwt.sign(
    { userId: 'victim-address', role: 'admin' },
    'any-secret',  // Doesn't matter
    { algorithm: 'HS256' }
);

// Use forged token
fetch('https://api.takumi.example/api/admin/users', {
    headers: {
        'Authorization': `Bearer ${forgedToken}`
    }
});
// Returns admin data!
```

## Reproduction Steps
1. Create JWT with arbitrary payload
2. Send request with forged token
3. Observe successful authentication
4. Access restricted endpoints

## Suggested Fix
```typescript
// Before (vulnerable)
const decoded = jwt.decode(token);

// After (secure)
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    algorithms: ['HS256']
});
```

## Reporter Information
- Name: Bob Hacker
- Email: bob@example.com
- Wallet: 0xabcd...ef01
```

## Hall of Fame

Top contributors to Takumi security:

| Rank | Researcher | Findings | Total Reward |
|------|------------|----------|--------------|
| 🥇 | TBD | - | - |
| 🥈 | TBD | - | - |
| 🥉 | TBD | - | - |

*Updated monthly*

## Contact & Resources

### Security Team

- **Email**: security@takumi.example
- **PGP Key**: [Download](https://takumi.example/pgp-key.asc)
- **Response Time**: 24-48 hours

### PGP Public Key

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

[PGP KEY WILL BE ADDED]

-----END PGP PUBLIC KEY BLOCK-----
```

### Resources

- **Documentation**: https://docs.takumi.example
- **GitHub**: https://github.com/takumi/takumi
- **Security Advisories**: https://github.com/takumi/takumi/security/advisories
- **Audit Reports**: https://docs.takumi.example/audits
- **Bug Bounty Updates**: https://twitter.com/takumi_security

## Legal

### Safe Harbor

Takumi commits to:
- Not pursue legal action against researchers who follow these guidelines
- Work with researchers to understand and fix vulnerabilities
- Recognize researchers publicly (with permission)
- Pay rewards promptly

### Terms & Conditions

1. **Eligibility**: Open to anyone except Takumi employees and immediate family
2. **Taxes**: Researchers responsible for tax obligations
3. **Confidentiality**: Keep vulnerabilities confidential until public disclosure
4. **No Warranty**: Rewards are discretionary and not guaranteed
5. **Final Decision**: Takumi has final say on severity and reward amounts
6. **Compliance**: Researchers must comply with all applicable laws
7. **Modifications**: Program terms may change with 30 days notice

### Privacy

- Reporter information kept confidential
- Public recognition only with permission
- Data handled per privacy policy

## FAQ

**Q: Can I test on mainnet?**
A: Only if absolutely necessary and with minimal impact. Prefer testnet testing.

**Q: How long until I get paid?**
A: Typically 1 week after fix deployment, up to 4 weeks for complex issues.

**Q: Can I disclose publicly?**
A: Yes, after 90 days or coordinated disclosure agreement.

**Q: What if I find multiple vulnerabilities?**
A: Submit separate reports for each. Bonus for related findings.

**Q: Do you accept anonymous submissions?**
A: Yes, but payment requires wallet address or contact method.

**Q: What if my report is rejected?**
A: We'll explain why. You can appeal or submit additional evidence.

**Q: Can I participate if I'm under 18?**
A: Yes, but parental consent required for rewards >$1,000.

**Q: What currencies do you pay in?**
A: ETH, USDC, USDT (crypto) or USD (bank/PayPal for >$1,000).

## Updates

**Latest Changes**:
- 2024-01-15: Program launched (testnet phase)
- TBD: Mainnet program launch (post-audit)

**Subscribe**: security-updates@takumi.example

---

**Thank you for helping keep Takumi secure! 🛡️**
