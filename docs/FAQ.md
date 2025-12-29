# Frequently Asked Questions (FAQ)

## General Questions

### What is Takumi (匠)?

Takumi is a decentralized skill verification platform built on Ethereum-compatible blockchains. It allows professionals to create verifiable skill profiles, claim skills with proof, and receive endorsements from trusted verifiers. All credentials are stored on-chain and backed by decentralized storage (IPFS/Arweave).

### Why blockchain for skill verification?

Traditional skill verification systems are centralized, prone to fraud, and lack portability. Blockchain provides:
- **Immutability**: Skills and endorsements cannot be altered or deleted
- **Transparency**: All verifications are publicly auditable
- **Portability**: Your credentials follow you across platforms
- **Decentralization**: No single entity controls your professional identity

### Which networks does Takumi support?

Currently supported networks:
- **Ethereum Sepolia** (testnet)
- **Polygon Mumbai** (testnet)
- **Polygon Mainnet** (production)
- **Ethereum Mainnet** (production - coming soon)

### Is my data private?

Takumi uses a hybrid approach:
- **On-chain**: Profile metadata hashes, skill claims, endorsement records
- **Off-chain**: Detailed metadata stored on IPFS/Arweave (encrypted if needed)
- **Private**: Personal information is never stored on-chain without encryption

## Technical Questions

### How do I connect my wallet?

1. Click "Connect Wallet" in the header
2. Select your wallet provider (MetaMask, WalletConnect, Coinbase Wallet, etc.)
3. Approve the connection request
4. Sign the authentication message to generate your JWT token

### What wallets are supported?

Takumi uses RainbowKit, supporting:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow Wallet
- Trust Wallet
- And 50+ other wallets

### Do I need cryptocurrency to use Takumi?

Yes, you need:
- **Gas tokens** (ETH, MATIC) to pay for transactions
- **Small amounts** for creating profiles, claiming skills, and endorsing others
- **Testnet tokens** are free from faucets for testing

### How much does it cost to use Takumi?

Approximate costs (varies by network congestion):
- **Create Profile**: 0.001-0.01 ETH/MATIC
- **Claim Skill**: 0.0005-0.005 ETH/MATIC
- **Endorse**: 0.0003-0.003 ETH/MATIC
- **IPFS Storage**: Free (public gateway) or $0.01-0.10 (pinning services)

### Can I use Takumi without technical knowledge?

Yes! The interface is designed for non-technical users:
- Simple wallet connection flow
- Clear transaction confirmations
- Helpful error messages
- No coding required

### What happens if I lose my wallet?

**Critical**: Your wallet is your identity on Takumi. If you lose access:
- You cannot recover your profile without the private key
- All skills and endorsements remain on-chain but inaccessible
- **Always backup your seed phrase securely**

## Profile & Skills Questions

### How do I create a profile?

1. Connect your wallet
2. Navigate to "Create Profile"
3. Fill in your name and bio
4. Upload metadata to IPFS (automatic)
5. Confirm the transaction
6. Wait for blockchain confirmation

### What is a skill claim?

A skill claim is your declaration of proficiency in a specific area. It includes:
- Skill name and category
- Proficiency level (Beginner, Intermediate, Advanced, Expert)
- Evidence URI (certificates, portfolio, GitHub, etc.)
- Metadata stored on IPFS

### How do endorsements work?

Endorsements are verifications from trusted parties:
1. A verifier reviews your skill claim
2. They submit an endorsement transaction
3. The endorsement is recorded on-chain
4. Your skill credibility increases

### Who can endorse my skills?

Anyone can endorse, but endorsements from verified accounts carry more weight:
- **Verified Verifiers**: Registered in the VerifierRegistry contract
- **Employers**: Companies with verified on-chain identities
- **Peers**: Other professionals (lower weight)
- **Institutions**: Universities, certification bodies

### Can I remove a skill claim?

No. Once a skill claim is on-chain, it's permanent. However:
- You can add new claims with updated information
- Endorsements provide context and validation
- The timestamp shows when claims were made

### How do I become a verified verifier?

Contact the platform administrators with:
- Your organization details
- Proof of authority to verify skills
- Stake requirement (if applicable)
- KYC/KYB documentation

## Backend & API Questions

### What is the backend API for?

The backend provides:
- **Indexing**: Fast queries of on-chain data
- **Caching**: Reduced blockchain RPC calls
- **Notifications**: Email/webhook alerts for endorsements
- **Analytics**: Skill trends and statistics
- **Search**: Full-text search across profiles

### Do I need the backend to use Takumi?

No. The frontend can interact directly with smart contracts. The backend enhances:
- Performance (faster queries)
- User experience (notifications, search)
- Analytics (insights and trends)

### How do I get an API key?

For admin operations:
1. Contact platform administrators
2. Provide use case and organization details
3. Receive API key via secure channel
4. Use `X-API-Key` header for authenticated requests

### What are the API rate limits?

Default limits (configurable):
- **Public endpoints**: 100 requests/15 minutes
- **Authenticated users**: 500 requests/15 minutes
- **Admin API keys**: 5000 requests/15 minutes

### Is the API open source?

Yes! The entire backend is open source:
- Repository: `backend/` directory
- License: MIT
- Contributions welcome

## Storage Questions

### What is IPFS?

IPFS (InterPlanetary File System) is a decentralized storage network:
- Content-addressed (files identified by hash)
- Distributed across multiple nodes
- Censorship-resistant
- Permanent (if pinned)

### What is Arweave?

Arweave is a permanent storage blockchain:
- Pay once, store forever
- Cryptographically verified
- Decentralized and immutable
- Higher cost than IPFS but guaranteed permanence

### Which storage should I use?

**IPFS**: For most use cases (profiles, skill metadata)
- Fast and free (public gateways)
- Requires pinning for permanence
- Good for frequently updated data

**Arweave**: For critical, permanent records
- One-time payment
- Guaranteed permanence
- Best for certificates, diplomas, legal documents

### Can I change metadata after uploading?

IPFS/Arweave content is immutable. To update:
1. Upload new metadata (new hash)
2. Update on-chain reference to new hash
3. Old metadata remains accessible at old hash

## Security Questions

### Is Takumi secure?

Takumi implements multiple security layers:
- **Smart contracts**: Audited, upgradeable, pausable
- **Access control**: Role-based permissions
- **Rate limiting**: DDoS protection
- **Input validation**: Prevents injection attacks
- **Monitoring**: Real-time alerts for suspicious activity

See [SECURITY.md](./SECURITY.md) for full audit.

### What if a vulnerability is found?

Report security issues to: **security@takumi.example.com**
- Do not disclose publicly
- Provide detailed reproduction steps
- Responsible disclosure policy applies
- Bug bounty program available

### Can contracts be upgraded?

Yes, using UUPS proxy pattern:
- Only admin can upgrade
- 48-hour timelock for upgrades
- Emergency pause function
- Rollback capability

### What happens if contracts are paused?

When paused:
- No new profiles, claims, or endorsements
- Existing data remains accessible (read-only)
- Unpause requires admin action
- Used only for critical security issues

## Deployment Questions

### How do I deploy my own instance?

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide:
1. Clone repository
2. Configure environment variables
3. Deploy smart contracts
4. Start backend services
5. Build and deploy frontend

### Can I customize Takumi?

Yes! Takumi is fully open source:
- Modify smart contracts
- Customize frontend UI
- Extend backend API
- Add new features

### What are the hosting requirements?

**Frontend**: Static hosting (Vercel, Netlify, S3)
**Backend**: Node.js server (2GB RAM, 2 CPU cores minimum)
**Database**: PostgreSQL 14+ (10GB storage minimum)
**Cache**: Redis 6+ (1GB RAM)

### How do I monitor my deployment?

Built-in monitoring stack:
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **ELK Stack**: Log aggregation and search
- **Alertmanager**: Alert routing and notifications

See `docker-compose.monitoring.yml` for setup.

## Troubleshooting

### Transaction failed - what do I do?

Common causes:
1. **Insufficient gas**: Increase gas limit
2. **Nonce too low**: Reset account in wallet
3. **Contract paused**: Wait for unpause
4. **Invalid input**: Check form validation

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

### My profile isn't showing up

Possible reasons:
1. Transaction still pending (check block explorer)
2. Backend indexer lag (wait 1-2 minutes)
3. Cache issue (clear browser cache)
4. Wrong network selected (check wallet network)

### IPFS upload failed

Solutions:
1. Try different IPFS gateway
2. Check file size (max 10MB recommended)
3. Verify internet connection
4. Use Arweave as fallback

### I can't connect my wallet

Troubleshooting steps:
1. Refresh the page
2. Check wallet is unlocked
3. Verify correct network selected
4. Clear browser cache
5. Try different browser
6. Update wallet extension

## Contributing

### How can I contribute?

We welcome contributions:
- **Code**: Submit PRs for features or fixes
- **Documentation**: Improve guides and tutorials
- **Testing**: Report bugs and edge cases
- **Design**: UI/UX improvements
- **Community**: Help others in Discord/Telegram

### Where is the roadmap?

See [CHANGELOG.md](./CHANGELOG.md) for version history and upcoming features.

### How do I report bugs?

1. Check existing issues on GitHub
2. Create new issue with:
   - Clear description
   - Reproduction steps
   - Expected vs actual behavior
   - Screenshots/logs
   - Environment details

## Support

### Where can I get help?

- **Documentation**: Start here (docs/)
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Community support and discussions
- **Email**: support@takumi.example.com
- **Twitter**: @TakumiSkills

### Is there a community?

Yes! Join us:
- Discord: discord.gg/takumi
- Telegram: t.me/takumiskills
- Twitter: @TakumiSkills
- GitHub: github.com/takumi-platform

---

**Still have questions?** Open an issue on GitHub or join our Discord community!
