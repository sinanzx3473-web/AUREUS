# Testnet Deployment & Monitoring Guide

## Overview

This guide covers deploying Takumi to testnet environments, setting up comprehensive monitoring, and conducting thorough testing before mainnet deployment.

## Testnet Strategy

### Supported Testnets

| Network | Chain ID | Purpose | Faucet |
|---------|----------|---------|--------|
| Ethereum Sepolia | 11155111 | Primary testing | https://sepoliafaucet.com |
| Polygon Mumbai | 80001 | L2 testing | https://faucet.polygon.technology |
| BSC Testnet | 97 | Alternative L1 | https://testnet.bnbchain.org/faucet-smart |
| Arbitrum Sepolia | 421614 | L2 rollup testing | https://faucet.quicknode.com/arbitrum/sepolia |
| Optimism Sepolia | 11155420 | L2 optimistic rollup | https://app.optimism.io/faucet |
| Base Sepolia | 84532 | Coinbase L2 | https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet |

### Deployment Timeline

**Week 1-2: Initial Deployment**
- Deploy to Ethereum Sepolia (primary testnet)
- Configure monitoring and alerting
- Deploy backend and frontend
- Conduct internal testing

**Week 3-4: Multi-Chain Expansion**
- Deploy to Polygon Mumbai
- Deploy to Base Sepolia
- Test cross-chain functionality
- Verify monitoring across all chains

**Week 5-8: Public Testing**
- Announce testnet to community
- Conduct bug bounty on testnet
- Gather user feedback
- Iterate on issues

**Week 9-12: Stress Testing**
- Load testing with simulated users
- Gas optimization testing
- Security penetration testing
- Disaster recovery drills

## Step 1: Smart Contract Deployment

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
forge --version
cast --version

# Get testnet ETH from faucets (links above)
# Verify balance
cast balance <YOUR_ADDRESS> --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Environment Configuration

```bash
cd contracts

# Copy environment template
cp .env.example .env

# Edit .env with testnet configuration
nano .env
```

**contracts/.env**:
```bash
# Deployer Wallet (REQUIRED)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Sepolia Testnet
RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Polygon Mumbai Testnet
RPC_URL_MUMBAI=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY

# Base Sepolia Testnet
RPC_URL_BASE_SEPOLIA=https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY

# Admin address (for role management)
ADMIN_ADDRESS=0xYOUR_ADMIN_ADDRESS
```

### Deploy to Sepolia

```bash
# Run deployment script
./scripts/deploy.sh sepolia

# Expected output:
# ✅ Deploying to Sepolia testnet...
# ✅ SkillProfile deployed to: 0x...
# ✅ SkillClaim deployed to: 0x...
# ✅ Endorsement deployed to: 0x...
# ✅ VerifierRegistry deployed to: 0x...
# ✅ Contracts verified on Etherscan
# ✅ Deployment saved to contracts/deployments/sepolia.json
```

### Verify Deployment

```bash
# Check contract on Etherscan
open https://sepolia.etherscan.io/address/<CONTRACT_ADDRESS>

# Verify contract is initialized
cast call <SKILL_PROFILE_ADDRESS> "owner()(address)" --rpc-url $RPC_URL_SEPOLIA

# Check contract version
cast call <SKILL_PROFILE_ADDRESS> "version()(string)" --rpc-url $RPC_URL_SEPOLIA

# Verify proxy pattern
cast implementation <SKILL_PROFILE_ADDRESS> --rpc-url $RPC_URL_SEPOLIA
```

### Grant Initial Roles

```bash
# Grant VERIFIER_ROLE to test verifier
cast send <VERIFIER_REGISTRY_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "VERIFIER_ROLE") \
  <VERIFIER_ADDRESS> \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL_SEPOLIA

# Verify role granted
cast call <VERIFIER_REGISTRY_ADDRESS> \
  "hasRole(bytes32,address)(bool)" \
  $(cast keccak "VERIFIER_ROLE") \
  <VERIFIER_ADDRESS> \
  --rpc-url $RPC_URL_SEPOLIA
```

## Step 2: Backend Deployment

### Database Setup

```bash
# Create testnet database
createdb takumi_testnet

# Run migrations
cd backend
cp .env.test.example .env.test
nano .env.test  # Configure testnet settings

# Apply migrations
NODE_ENV=test pnpm run migrate up

# Verify tables created
psql -d takumi_testnet -c "\dt"
```

### Backend Configuration

**backend/.env.test**:
```bash
NODE_ENV=test
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=takumi_testnet
DB_USER=postgres
DB_PASSWORD=<generated-password>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<generated-password>

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=<testnet-jwt-secret>
JWT_REFRESH_SECRET=<testnet-refresh-secret>
JWT_ISSUER=takumi-testnet
JWT_AUDIENCE=takumi-testnet-client

# Blockchain - Sepolia
RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=11155111

# Contract Addresses (from deployment)
CONTRACT_SKILL_PROFILE=0x...
CONTRACT_SKILL_CLAIM=0x...
CONTRACT_ENDORSEMENT=0x...
CONTRACT_VERIFIER_REGISTRY=0x...

# Storage - IPFS Testnet
STORAGE_TYPE=ipfs
IPFS_HOST=ipfs.infura.io
IPFS_PORT=5001
IPFS_PROTOCOL=https
IPFS_PROJECT_ID=<infura-project-id>
IPFS_PROJECT_SECRET=<infura-project-secret>

# Admin
ADMIN_API_KEY=<testnet-admin-key>

# CORS (allow testnet frontend)
CORS_ORIGIN=http://localhost:5173,https://testnet.takumi.example

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Deploy Backend

```bash
# Build backend
pnpm run build

# Run tests
pnpm test

# Start with PM2
pm2 start ecosystem.config.js --env test

# Verify health
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "ok",
#   "database": "connected",
#   "redis": "connected",
#   "blockchain": "connected",
#   "network": "sepolia"
# }
```

## Step 3: Frontend Deployment

### Frontend Configuration

```bash
# Copy environment template
cp .env.example .env.testnet

# Edit configuration
nano .env.testnet
```

**.env.testnet**:
```bash
# Network
VITE_CHAIN=sepolia

# API
VITE_API_URL=http://localhost:3001

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=<your-walletconnect-project-id>

# Alchemy
VITE_ALCHEMY_API_KEY=<your-alchemy-api-key>

# Contract Addresses (from deployment)
VITE_SKILL_PROFILE_ADDRESS=0x...
VITE_SKILL_CLAIM_ADDRESS=0x...
VITE_ENDORSEMENT_ADDRESS=0x...
VITE_VERIFIER_REGISTRY_ADDRESS=0x...

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=true
VITE_TESTNET_MODE=true
```

### Build and Deploy

```bash
# Build with testnet config
pnpm run build --mode testnet

# Preview locally
pnpm run preview

# Deploy to Vercel (testnet subdomain)
vercel --prod --env VITE_CHAIN=sepolia

# Or deploy to custom server
scp -r dist/* user@testnet.takumi.example:/var/www/testnet
```

## Step 4: Monitoring Setup

### Deploy Monitoring Stack

```bash
# Copy monitoring environment
cp .env.monitoring.example .env.monitoring

# Edit monitoring configuration
nano .env.monitoring
```

**.env.monitoring**:
```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<secure-password>
GRAFANA_DOMAIN=monitoring.testnet.takumi.example

# Prometheus
PROMETHEUS_RETENTION=30d

# Alertmanager - Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
SLACK_CHANNEL=#takumi-testnet-alerts

# Alertmanager - Email
ALERT_EMAIL=testnet-alerts@takumi.example
ALERT_SMTP_HOST=smtp.gmail.com
ALERT_SMTP_PORT=587
ALERT_SMTP_USER=<smtp-user>
ALERT_SMTP_PASSWORD=<smtp-password>

# Elasticsearch
ELASTIC_PASSWORD=<elastic-password>
```

### Start Monitoring Services

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify all services healthy
docker-compose -f docker-compose.monitoring.yml ps

# Expected output:
# NAME                    STATUS              PORTS
# takumi-prometheus       Up (healthy)        0.0.0.0:9090->9090/tcp
# takumi-grafana          Up (healthy)        0.0.0.0:3000->3000/tcp
# takumi-alertmanager     Up (healthy)        0.0.0.0:9093->9093/tcp
# takumi-elasticsearch    Up (healthy)        0.0.0.0:9200->9200/tcp
# takumi-kibana           Up (healthy)        0.0.0.0:5601->5601/tcp
# takumi-logstash         Up (healthy)        0.0.0.0:5044->5044/tcp
```

### Configure Grafana Dashboards

```bash
# Access Grafana
open http://localhost:3000

# Login with credentials from .env.monitoring
# Username: admin
# Password: <GRAFANA_ADMIN_PASSWORD>

# Import dashboards
# 1. Go to Dashboards > Import
# 2. Upload JSON files from monitoring/grafana/dashboards/
# 3. Select Prometheus data source
# 4. Click Import

# Dashboards to import:
# - takumi-overview.json (System overview)
# - takumi-contracts.json (Smart contract metrics)
# - takumi-backend.json (Backend API metrics)
# - takumi-frontend.json (Frontend performance)
```

### Configure Alerts

Edit `monitoring/alerts.yml`:

```yaml
groups:
  - name: testnet_alerts
    interval: 30s
    rules:
      # Contract alerts
      - alert: ContractPaused
        expr: takumi_contract_paused == 1
        for: 1m
        labels:
          severity: critical
          environment: testnet
        annotations:
          summary: "Contract {{ $labels.contract }} is paused"
          description: "Contract has been paused for more than 1 minute"

      - alert: HighTransactionFailureRate
        expr: rate(takumi_transaction_failures_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
          environment: testnet
        annotations:
          summary: "High transaction failure rate"
          description: "Transaction failure rate is {{ $value | humanizePercentage }}"

      # Backend alerts
      - alert: HighAPIErrorRate
        expr: rate(takumi_api_errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
          environment: testnet
        annotations:
          summary: "High API error rate"
          description: "API error rate is {{ $value | humanizePercentage }}"

      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, rate(takumi_api_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
          environment: testnet
        annotations:
          summary: "Slow API response times"
          description: "95th percentile response time is {{ $value }}s"

      # Database alerts
      - alert: DatabaseConnectionPoolExhausted
        expr: takumi_db_pool_active / takumi_db_pool_max > 0.9
        for: 5m
        labels:
          severity: critical
          environment: testnet
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections in use"

      # Infrastructure alerts
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
          environment: testnet
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
```

Reload alerts:
```bash
curl -X POST http://localhost:9090/-/reload
```

## Step 5: Testing & Validation

### Automated Testing

```bash
# Run full test suite
cd contracts && forge test -vv
cd ../backend && pnpm test
cd .. && pnpm test

# Run integration tests
pnpm run test:integration

# Run E2E tests
pnpm run test:e2e
```

### Manual Testing Checklist

**Smart Contracts**:
- [ ] Create profile transaction succeeds
- [ ] Add skill transaction succeeds
- [ ] Submit claim transaction succeeds
- [ ] Approve claim (as verifier) succeeds
- [ ] Create endorsement transaction succeeds
- [ ] Pause contract (as admin) succeeds
- [ ] Unpause contract (as admin) succeeds
- [ ] Upgrade contract (as admin) succeeds
- [ ] Events emitted correctly
- [ ] Gas usage within expected ranges

**Backend API**:
- [ ] GET /health returns 200
- [ ] GET /api/profiles returns profiles
- [ ] GET /api/profiles/:address returns specific profile
- [ ] POST /api/webhooks receives blockchain events
- [ ] Rate limiting works (429 after limit)
- [ ] CORS headers correct
- [ ] JWT authentication works
- [ ] API metrics exposed at /metrics

**Frontend**:
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Network switching works
- [ ] Create profile form works
- [ ] View profile page loads
- [ ] Add skill modal works
- [ ] Submit claim flow works
- [ ] Endorsement flow works
- [ ] Transaction notifications appear
- [ ] Error handling works
- [ ] Mobile responsive

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Linux

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
  },
};

export default function () {
  // Test health endpoint
  let healthRes = http.get('http://localhost:3001/health');
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Test profiles endpoint
  let profilesRes = http.get('http://localhost:3001/api/profiles');
  check(profilesRes, {
    'profiles status is 200': (r) => r.status === 200,
    'profiles response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
EOF

# Run load test
k6 run load-test.js

# Expected output:
# ✓ health check status is 200
# ✓ profiles status is 200
# ✓ profiles response time < 500ms
#
# checks.........................: 100.00% ✓ 15000 ✗ 0
# http_req_duration..............: avg=150ms min=50ms med=140ms max=450ms p(95)=350ms
# http_req_failed................: 0.00%   ✓ 0     ✗ 15000
```

### Security Testing

```bash
# Run Slither on contracts
cd contracts
slither . --exclude-dependencies

# Run npm audit on backend
cd backend
pnpm audit --audit-level=moderate

# Run npm audit on frontend
cd ..
pnpm audit --audit-level=moderate

# Scan for secrets
trufflehog git file://. --only-verified

# Check for common vulnerabilities
docker run --rm -v $(pwd):/src trailofbits/eth-security-toolbox
```

## Step 6: Monitoring & Metrics

### Key Metrics to Monitor

**Smart Contracts**:
- Transaction success rate (target: >99%)
- Average gas used per transaction
- Contract pause events
- Role grant/revoke events
- Upgrade events

**Backend**:
- API response time (p50, p95, p99)
- Error rate (target: <0.1%)
- Database query time
- Redis cache hit rate
- Active connections

**Frontend**:
- Page load time
- Time to interactive
- Wallet connection success rate
- Transaction submission success rate
- Error rate

### Grafana Dashboard Queries

**Transaction Success Rate**:
```promql
sum(rate(takumi_transactions_total{status="success"}[5m])) 
/ 
sum(rate(takumi_transactions_total[5m])) * 100
```

**API Response Time (p95)**:
```promql
histogram_quantile(0.95, 
  sum(rate(takumi_api_duration_seconds_bucket[5m])) by (le, endpoint)
)
```

**Database Connection Pool Usage**:
```promql
takumi_db_pool_active / takumi_db_pool_max * 100
```

**Error Rate**:
```promql
sum(rate(takumi_errors_total[5m])) by (type)
```

### Log Analysis with Kibana

```bash
# Access Kibana
open http://localhost:5601

# Create index pattern: takumi-*
# Time field: @timestamp

# Useful queries:
# - All errors: level:error
# - Transaction failures: message:"transaction failed"
# - Slow queries: duration:>1000
# - By user: user.address:"0x..."
```

## Step 7: Public Testnet Announcement

### Preparation

```bash
# Create testnet documentation
cat > TESTNET_GUIDE.md << 'EOF'
# Takumi Testnet Guide

## Getting Started

1. **Get Testnet ETH**
   - Sepolia: https://sepoliafaucet.com
   - Enter your wallet address
   - Receive 0.5 ETH (usually within 1 minute)

2. **Connect to Testnet**
   - Visit: https://testnet.takumi.example
   - Click "Connect Wallet"
   - Select Sepolia network in MetaMask
   - Approve connection

3. **Create Your Profile**
   - Click "Create Profile"
   - Fill in your information
   - Approve transaction in MetaMask
   - Wait for confirmation (~15 seconds)

4. **Add Skills**
   - Go to your profile
   - Click "Add Skill"
   - Enter skill details
   - Submit transaction

5. **Report Issues**
   - Discord: https://discord.gg/takumi
   - GitHub: https://github.com/takumi/issues
   - Email: testnet@takumi.example

## Known Limitations

- Testnet only - no real value
- May be reset periodically
- Performance may vary
- Some features still in development

## Bug Bounty

Report bugs and earn rewards! See BUG_BOUNTY.md for details.
EOF
```

### Announcement Template

**Twitter/X**:
```
🚀 Takumi Testnet is LIVE!

Test our decentralized skills verification platform on Sepolia testnet.

✅ Create profiles
✅ Add skills
✅ Get verified
✅ Earn endorsements

🎁 Bug bounty active - find bugs, earn rewards!

Try it: https://testnet.takumi.example
Guide: https://docs.takumi.example/testnet

#Web3 #Blockchain #Testnet
```

**Discord**:
```
@everyone 

🎉 **TESTNET LAUNCH** 🎉

Our Sepolia testnet is now live and ready for testing!

**What you can do:**
• Create your skill profile
• Add and verify skills
• Give and receive endorsements
• Test all platform features

**How to get started:**
1. Get testnet ETH: https://sepoliafaucet.com
2. Visit: https://testnet.takumi.example
3. Follow the guide: https://docs.takumi.example/testnet

**Bug Bounty:**
Find bugs and earn rewards! Details: https://docs.takumi.example/bug-bounty

**Support:**
Having issues? Ask in #testnet-support

Let's build together! 🚀
```

## Step 8: Continuous Monitoring

### Daily Checks

```bash
# Create daily monitoring script
cat > scripts/daily-testnet-check.sh << 'EOF'
#!/bin/bash

echo "=== Takumi Testnet Daily Check ==="
echo "Date: $(date)"
echo ""

# Check contract status
echo "1. Contract Status:"
cast call $SKILL_PROFILE_ADDRESS "paused()(bool)" --rpc-url $RPC_URL_SEPOLIA
echo ""

# Check backend health
echo "2. Backend Health:"
curl -s http://localhost:3001/health | jq
echo ""

# Check database
echo "3. Database Stats:"
psql -d takumi_testnet -c "SELECT 
  (SELECT COUNT(*) FROM profiles) as profiles,
  (SELECT COUNT(*) FROM skills) as skills,
  (SELECT COUNT(*) FROM claims) as claims,
  (SELECT COUNT(*) FROM endorsements) as endorsements;"
echo ""

# Check error rate (last 24h)
echo "4. Error Rate (24h):"
curl -s 'http://localhost:9090/api/v1/query?query=sum(increase(takumi_errors_total[24h]))' | jq '.data.result[0].value[1]'
echo ""

# Check transaction success rate (last 24h)
echo "5. Transaction Success Rate (24h):"
curl -s 'http://localhost:9090/api/v1/query?query=sum(increase(takumi_transactions_total{status="success"}[24h]))/sum(increase(takumi_transactions_total[24h]))*100' | jq '.data.result[0].value[1]'
echo ""

echo "=== Check Complete ==="
EOF

chmod +x scripts/daily-testnet-check.sh

# Run daily check
./scripts/daily-testnet-check.sh
```

### Weekly Reports

Generate weekly testnet report:

```bash
cat > scripts/weekly-testnet-report.sh << 'EOF'
#!/bin/bash

REPORT_FILE="testnet-report-$(date +%Y-%m-%d).md"

cat > $REPORT_FILE << 'REPORT'
# Takumi Testnet Weekly Report
**Week of:** $(date +%Y-%m-%d)

## Metrics Summary

### Usage Statistics
- Total Profiles: $(psql -d takumi_testnet -t -c "SELECT COUNT(*) FROM profiles;")
- Total Skills: $(psql -d takumi_testnet -t -c "SELECT COUNT(*) FROM skills;")
- Total Claims: $(psql -d takumi_testnet -t -c "SELECT COUNT(*) FROM claims;")
- Total Endorsements: $(psql -d takumi_testnet -t -c "SELECT COUNT(*) FROM endorsements;")

### Performance
- Average API Response Time (p95): [Check Grafana]
- Transaction Success Rate: [Check Prometheus]
- Uptime: [Check monitoring]

### Issues
- Critical: [Count from GitHub]
- High: [Count from GitHub]
- Medium: [Count from GitHub]
- Low: [Count from GitHub]

### User Feedback
[Summarize Discord/GitHub feedback]

## Action Items
- [ ] [Action item 1]
- [ ] [Action item 2]

## Next Week Goals
- [Goal 1]
- [Goal 2]
REPORT

echo "Report generated: $REPORT_FILE"
EOF

chmod +x scripts/weekly-testnet-report.sh
```

## Troubleshooting

### Common Issues

**Contract transactions failing**:
```bash
# Check if contract is paused
cast call $SKILL_PROFILE_ADDRESS "paused()(bool)" --rpc-url $RPC_URL_SEPOLIA

# Check gas price
cast gas-price --rpc-url $RPC_URL_SEPOLIA

# Check account balance
cast balance <YOUR_ADDRESS> --rpc-url $RPC_URL_SEPOLIA
```

**Backend not responding**:
```bash
# Check backend logs
pm2 logs backend

# Check database connection
psql -d takumi_testnet -c "SELECT 1;"

# Check Redis connection
redis-cli ping

# Restart backend
pm2 restart backend
```

**Frontend not loading**:
```bash
# Check build
pnpm run build

# Check environment variables
cat .env.testnet

# Check browser console for errors
# Open DevTools > Console
```

## Next Steps

After successful testnet deployment:

1. **Monitor for 2-4 weeks** - Gather metrics and user feedback
2. **Iterate on issues** - Fix bugs and improve UX
3. **Conduct load testing** - Ensure scalability
4. **Launch bug bounty** - See BUG_BOUNTY_PROGRAM.md
5. **Prepare for mainnet** - See MAINNET_ROLLOUT_GUIDE.md

## Resources

- [Deployment Guide](./DEPLOYMENT.md)
- [Bug Bounty Program](./BUG_BOUNTY_PROGRAM.md)
- [Mainnet Rollout Guide](./MAINNET_ROLLOUT_GUIDE.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
