# AI Verification Agent Service

## Overview

The AI Verification Agent Service uses OpenAI's GPT-4o to automatically verify skill claims by analyzing GitHub repositories. The service provides cryptographically signed verification results that can be submitted to the AgentOracle smart contract.

## Architecture

```
User submits claim → Backend AI Agent → Fetches GitHub repo → GPT-4o Analysis → Signs result → Returns signature
```

## API Endpoint

### POST `/api/v1/agent/verify`

Verify a skill claim using AI analysis of a GitHub repository.

**Request Body:**
```json
{
  "githubRepoUrl": "https://github.com/username/repo",
  "skillName": "Solidity",
  "claimId": 123
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claimId": 123,
    "isValid": true,
    "signature": "0x...",
    "reasoning": "Repository demonstrates advanced Solidity proficiency with smart contract implementations, security patterns, and comprehensive testing.",
    "agentAddress": "0x..."
  }
}
```

### GET `/api/v1/agent/address`

Get the AI agent's wallet address (must have AGENT_ROLE in AgentOracle contract).

**Response:**
```json
{
  "success": true,
  "data": {
    "agentAddress": "0x..."
  }
}
```

## Configuration

Add to your `.env` file:

```bash
# AI Agent Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
AGENT_PRIVATE_KEY=0x...your-agent-private-key-here
AGENT_ORACLE_ADDRESS=0x...agent-oracle-contract-address
CHAIN_ID=20258
```

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `AGENT_PRIVATE_KEY`: Private key for signing verification results (required)
- `AGENT_ORACLE_ADDRESS`: Address of the deployed AgentOracle contract
- `CHAIN_ID`: Blockchain chain ID (default: 20258 for devnet)

## Setup Instructions

### 1. Install Dependencies

The service uses existing dependencies (axios, ethers). No additional packages needed.

### 2. Configure OpenAI API Key

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys) and add to `.env`:

```bash
OPENAI_API_KEY=sk-proj-...
```

### 3. Generate Agent Private Key

```bash
# Generate a new wallet for the agent
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

Add the private key to `.env`:

```bash
AGENT_PRIVATE_KEY=0x...
```

### 4. Grant AGENT_ROLE in Smart Contract

The agent's address must have `AGENT_ROLE` in the AgentOracle contract:

```solidity
// Using contract admin account
agentOracle.grantRole(AGENT_ROLE, agentAddress);
```

### 5. Start the Backend

```bash
cd backend
npm run dev
```

## How It Works

### 1. Repository Analysis

The service fetches:
- Repository README
- Main code files (up to 5 files)
- Supports: `.ts`, `.js`, `.sol`, `.py`, `.java`, `.go`

### 2. AI Evaluation

GPT-4o analyzes the code using a strict evaluation prompt:

```
You are a senior code auditor. Analyze this repo for [Skill Name].
If the code demonstrates [Skill Name] proficiency, return TRUE.
If not, return FALSE. Be strict.
```

### 3. Signature Generation

The service signs the result using the agent's private key:

```typescript
messageHash = keccak256(claimId, isValid, contractAddress, chainId)
signature = sign(messageHash, agentPrivateKey)
```

### 4. Contract Verification

The signature can be submitted to AgentOracle contract:

```solidity
agentOracle.verifyClaim(claimId, isValid, signature);
```

## Integration with Frontend

### Example: Submit Claim for AI Verification

```typescript
// 1. User creates a claim with GitHub repo URL
const claimId = await skillClaim.createClaim(
  "Solidity",
  "My smart contract project",
  "https://github.com/user/solidity-project",
  0 // skillIndex
);

// 2. Call backend AI agent
const response = await fetch('http://localhost:3001/api/v1/agent/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    githubRepoUrl: "https://github.com/user/solidity-project",
    skillName: "Solidity",
    claimId: claimId
  })
});

const { data } = await response.json();

// 3. Submit signature to AgentOracle contract
await agentOracle.verifyClaim(
  data.claimId,
  data.isValid,
  data.signature
);

// 4. If approved, claim is automatically verified in SkillClaim contract
```

## Security Considerations

### Signature Replay Protection

The contract prevents signature replay attacks by:
- Including contract address in signature
- Including chain ID in signature
- Tracking used signatures in mapping

### Rate Limiting

The endpoint is protected by rate limiting (100 requests per 15 minutes).

### Private Key Security

**CRITICAL**: Never commit `AGENT_PRIVATE_KEY` to version control. Use:
- Environment variables
- Secret management services (AWS Secrets Manager, HashiCorp Vault)
- Encrypted configuration files

### OpenAI API Costs

GPT-4o pricing (as of 2024):
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

Estimated cost per verification: $0.01 - $0.05

## Testing

### Manual Test

```bash
curl -X POST http://localhost:3001/api/v1/agent/verify \
  -H "Content-Type: application/json" \
  -d '{
    "githubRepoUrl": "https://github.com/OpenZeppelin/openzeppelin-contracts",
    "skillName": "Solidity",
    "claimId": 1
  }'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "claimId": 1,
    "isValid": true,
    "signature": "0x...",
    "reasoning": "Repository demonstrates expert-level Solidity proficiency...",
    "agentAddress": "0x..."
  }
}
```

## Troubleshooting

### Error: "OPENAI_API_KEY is required"

Add your OpenAI API key to `.env` file.

### Error: "AGENT_PRIVATE_KEY is required"

Generate and add agent private key to `.env` file.

### Error: "Failed to fetch repository content"

- Verify GitHub URL is valid and public
- Check GitHub API rate limits
- Ensure repository is not empty

### Error: "AI analysis failed"

- Check OpenAI API key is valid
- Verify OpenAI account has credits
- Check OpenAI API status

## Future Enhancements

- [ ] Support for private repositories (GitHub token authentication)
- [ ] Multi-file analysis with better context selection
- [ ] Caching of analysis results
- [ ] Batch verification support
- [ ] Custom evaluation criteria per skill type
- [ ] Integration with other code hosting platforms (GitLab, Bitbucket)
