# Operations FAQ - Admin Guide

## Overview

This guide provides answers to common operational questions for Takumi platform administrators, covering deployment, monitoring, maintenance, and troubleshooting.

---

## Table of Contents

1. [Deployment & Setup](#deployment--setup)
2. [User Management](#user-management)
3. [Contract Management](#contract-management)
4. [Database Operations](#database-operations)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Tuning](#performance-tuning)
8. [Security Operations](#security-operations)
9. [Incident Response](#incident-response)
10. [Maintenance Tasks](#maintenance-tasks)

---

## Deployment & Setup

### How do I deploy Takumi to production?

**Step-by-step deployment**:

```bash
# 1. Clone repository
git clone https://github.com/takumi-platform/takumi.git
cd takumi

# 2. Configure environment
cp .env.example .env
cp backend/.env.example backend/.env

# Edit .env files with production values
nano .env
nano backend/.env

# 3. Deploy smart contracts
cd contracts
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify

# 4. Setup database
cd ../backend
npm install
npm run migrate

# 5. Start backend services
npm run build
pm2 start dist/index.js --name takumi-backend

# 6. Build and deploy frontend
cd ..
npm install
npm run build
# Deploy dist/ to CDN/hosting (Vercel, Netlify, etc.)

# 7. Setup monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

**See also**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

### How do I configure environment variables?

**Required environment variables**:

**Frontend (.env)**:
```bash
# Blockchain
VITE_CHAIN_ID=11155111  # Sepolia
VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id

# Contracts (from deployment)
VITE_SKILL_PROFILE_ADDRESS=0x...
VITE_SKILL_CLAIM_ADDRESS=0x...
VITE_ENDORSEMENT_ADDRESS=0x...
VITE_VERIFIER_REGISTRY_ADDRESS=0x...

# API
VITE_API_URL=https://api.takumi.example

# Storage
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
VITE_IPFS_API=https://api.pinata.cloud
```

**Backend (backend/.env)**:
```bash
# Server
NODE_ENV=production
PORT=3001
API_BASE_URL=https://api.takumi.example

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/takumi_db
DB_POOL_MIN=2
DB_POOL_MAX=10

# Blockchain
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CHAIN_ID=11155111
START_BLOCK=5000000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# IPFS
IPFS_GATEWAY=https://ipfs.io/ipfs/
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
```

---

### How do I update contract addresses after deployment?

**Update frontend configuration**:

```bash
# 1. Update .env file
nano .env

# Update contract addresses
VITE_SKILL_PROFILE_ADDRESS=0xNEW_ADDRESS
VITE_SKILL_CLAIM_ADDRESS=0xNEW_ADDRESS
# ... etc

# 2. Rebuild frontend
npm run build

# 3. Redeploy
# (Vercel, Netlify, etc.)
```

**Update backend configuration**:

```bash
# 1. Update backend/.env
nano backend/.env

# Update contract addresses
SKILL_PROFILE_ADDRESS=0xNEW_ADDRESS
# ... etc

# 2. Restart backend
pm2 restart takumi-backend
```

---

## User Management

### How do I grant admin role to a user?

**Using cast (Foundry)**:

```bash
# 1. Get DEFAULT_ADMIN_ROLE hash
ADMIN_ROLE=$(cast keccak "DEFAULT_ADMIN_ROLE")

# 2. Grant role
cast send $CONTRACT_ADDRESS \
  "grantRole(bytes32,address)" \
  $ADMIN_ROLE \
  $NEW_ADMIN_ADDRESS \
  --private-key $CURRENT_ADMIN_KEY \
  --rpc-url $RPC_URL

# 3. Verify
cast call $CONTRACT_ADDRESS \
  "hasRole(bytes32,address)" \
  $ADMIN_ROLE \
  $NEW_ADMIN_ADDRESS \
  --rpc-url $RPC_URL
```

**Using Etherscan**:
1. Go to contract on Etherscan
2. Navigate to "Write Contract" tab
3. Connect wallet (must be current admin)
4. Call `grantRole` with:
   - `role`: `0x0000000000000000000000000000000000000000000000000000000000000000`
   - `account`: New admin address
5. Confirm transaction

---

### How do I register a new verifier?

**Via smart contract**:

```bash
# Register verifier
cast send $VERIFIER_REGISTRY_ADDRESS \
  "registerVerifier(address,string,string[])" \
  $VERIFIER_ADDRESS \
  "Verifier Name" \
  '["Solidity","React","Node.js"]' \
  --private-key $ADMIN_KEY \
  --rpc-url $RPC_URL

# Verify registration
cast call $VERIFIER_REGISTRY_ADDRESS \
  "isVerifier(address)" \
  $VERIFIER_ADDRESS \
  --rpc-url $RPC_URL
```

**Via backend API** (if admin API enabled):

```bash
curl -X POST https://api.takumi.example/api/v1/admin/verifiers \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x...",
    "name": "Verifier Name",
    "specializations": ["Solidity", "React"]
  }'
```

---

### How do I deactivate a verifier?

```bash
# Deactivate verifier
cast send $VERIFIER_REGISTRY_ADDRESS \
  "changeVerifierStatus(address,bool)" \
  $VERIFIER_ADDRESS \
  false \
  --private-key $ADMIN_KEY \
  --rpc-url $RPC_URL

# Verify status
cast call $VERIFIER_REGISTRY_ADDRESS \
  "getVerifier(address)" \
  $VERIFIER_ADDRESS \
  --rpc-url $RPC_URL
```

---

## Contract Management

### How do I pause contracts in an emergency?

**Pause all contracts**:

```bash
#!/bin/bash
# File: scripts/emergency-pause.sh

CONTRACTS=(
  $SKILL_PROFILE_ADDRESS
  $SKILL_CLAIM_ADDRESS
  $ENDORSEMENT_ADDRESS
  $VERIFIER_REGISTRY_ADDRESS
)

for contract in "${CONTRACTS[@]}"; do
  echo "Pausing $contract..."
  cast send $contract "pause()" \
    --private-key $ADMIN_KEY \
    --rpc-url $RPC_URL
done

echo "All contracts paused!"
```

**Verify pause status**:

```bash
# Check if contract is paused
cast call $CONTRACT_ADDRESS "paused()" --rpc-url $RPC_URL
# Returns: true (0x01) if paused
```

---

### How do I unpause contracts?

```bash
# Unpause single contract
cast send $CONTRACT_ADDRESS "unpause()" \
  --private-key $ADMIN_KEY \
  --rpc-url $RPC_URL

# Unpause all contracts
./scripts/emergency-unpause.sh
```

---

### How do I upgrade a contract?

**Using UUPS proxy pattern**:

```bash
# 1. Deploy new implementation
forge script script/Upgrade.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify

# 2. Prepare upgrade transaction
cast calldata "upgradeTo(address)" $NEW_IMPLEMENTATION_ADDRESS

# 3. Queue in timelock (48-hour delay)
cast send $TIMELOCK_ADDRESS \
  "schedule(address,uint256,bytes,bytes32,bytes32,uint256)" \
  $PROXY_ADDRESS \
  0 \
  $CALLDATA \
  0x0 \
  0x0 \
  172800 \
  --private-key $ADMIN_KEY

# 4. Wait 48 hours, then execute
cast send $TIMELOCK_ADDRESS \
  "execute(address,uint256,bytes,bytes32,bytes32)" \
  $PROXY_ADDRESS \
  0 \
  $CALLDATA \
  0x0 \
  0x0 \
  --private-key $ADMIN_KEY
```

**See also**: [UPGRADE_ROADMAP.md](./UPGRADE_ROADMAP.md)

---

### How do I verify contracts on Etherscan?

**Automatic verification during deployment**:

```bash
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**Manual verification**:

```bash
forge verify-contract \
  $CONTRACT_ADDRESS \
  src/SkillProfile.sol:SkillProfile \
  --chain-id 11155111 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor()")
```

---

## Database Operations

### How do I run database migrations?

**Run all pending migrations**:

```bash
cd backend
npm run migrate
```

**Run specific migration**:

```bash
psql -h localhost -U takumi_user -d takumi_db \
  -f migrations/004_add_verifier_specializations.sql
```

**Check migration status**:

```bash
psql -h localhost -U takumi_user -d takumi_db \
  -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC;"
```

**See also**: [DATABASE_MIGRATIONS.md](./DATABASE_MIGRATIONS.md)

---

### How do I backup the database?

**Manual backup**:

```bash
./scripts/backup-database.sh
```

**Automated daily backups**:

```bash
# Setup cron job
./scripts/setup-cron-backups.sh

# Verify cron job
crontab -l
```

**Backup to offsite storage**:

```bash
./scripts/replicate-offsite.sh
```

**See also**: [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)

---

### How do I restore from backup?

**Restore from local backup**:

```bash
./scripts/restore-database.sh /path/to/backup.sql
```

**Restore from encrypted backup**:

```bash
./scripts/restore-database-encrypted.sh /path/to/backup.sql.gpg
```

**Restore from offsite**:

```bash
./scripts/restore-from-offsite.sh
```

---

### How do I optimize database performance?

**Run VACUUM and ANALYZE**:

```bash
psql -h localhost -U takumi_user -d takumi_db <<EOF
VACUUM ANALYZE;
EOF
```

**Rebuild indexes**:

```bash
psql -h localhost -U takumi_user -d takumi_db <<EOF
REINDEX DATABASE takumi_db;
EOF
```

**Check slow queries**:

```bash
psql -h localhost -U takumi_user -d takumi_db <<EOF
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
EOF
```

---

## Monitoring & Alerts

### How do I access monitoring dashboards?

**Grafana**:
- URL: `http://localhost:3000`
- Default credentials: `admin` / `admin`
- Dashboards:
  - Takumi Overview
  - API Performance
  - Database Metrics
  - Blockchain Events

**Prometheus**:
- URL: `http://localhost:9090`
- Query metrics directly
- View targets and alerts

**See also**: [MONITORING_SETUP.md](./MONITORING_SETUP.md)

---

### How do I configure alert notifications?

**Edit Alertmanager configuration**:

```yaml
# File: monitoring/alertmanager.yml

route:
  receiver: 'team-email'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'team-email'
    email_configs:
      - to: 'ops@takumi.example'
        from: 'alerts@takumi.example'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@takumi.example'
        auth_password: 'your-app-password'
        
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'Takumi Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

**Restart Alertmanager**:

```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

---

### How do I add custom alerts?

**Edit Prometheus alerts**:

```yaml
# File: monitoring/alerts.yml

groups:
  - name: custom_alerts
    interval: 30s
    rules:
      - alert: HighAPILatency
        expr: http_request_duration_seconds{quantile="0.95"} > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "95th percentile latency is {{ $value }}s"
          
      - alert: LowDatabaseConnections
        expr: pg_stat_database_numbackends < 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low database connections"
          description: "Only {{ $value }} database connections active"
```

**Reload Prometheus configuration**:

```bash
curl -X POST http://localhost:9090/-/reload
```

---

## Backup & Recovery

### How often should I backup?

**Recommended schedule**:

- **Database**: Daily full backup, hourly incremental
- **Smart contracts**: After each deployment
- **Configuration**: After each change
- **Offsite replication**: Daily

**Automated setup**:

```bash
# Setup automated backups
./scripts/setup-cron-backups.sh

# Verify cron jobs
crontab -l
```

---

### How do I test disaster recovery?

**Run quarterly DR drill**:

```bash
./scripts/disaster-recovery-drill.sh
```

**Manual DR test**:

```bash
# 1. Backup current state
./scripts/backup-database.sh
./scripts/snapshot-contracts.sh

# 2. Simulate failure
docker-compose down

# 3. Restore from backup
./scripts/restore-database.sh /backups/latest.sql
./scripts/restore-contracts.sh /backups/contracts-latest.json

# 4. Verify restoration
./scripts/health-check.sh
```

**See also**: [DISASTER_RECOVERY_TEST.md](./DISASTER_RECOVERY_TEST.md)

---

## Performance Tuning

### How do I optimize API performance?

**Enable caching**:

```javascript
// backend/src/middleware/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const cacheMiddleware = (ttl = 60) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      redis.setex(key, ttl, JSON.stringify(data));
      return originalJson(data);
    };
    
    next();
  };
};
```

**Optimize database queries**:

```bash
# Enable query logging
echo "log_statement = 'all'" >> /etc/postgresql/14/main/postgresql.conf
echo "log_min_duration_statement = 1000" >> /etc/postgresql/14/main/postgresql.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# Analyze slow queries
tail -f /var/log/postgresql/postgresql-14-main.log | grep "duration:"
```

---

### How do I scale the backend?

**Horizontal scaling with PM2**:

```bash
# Start multiple instances
pm2 start dist/index.js -i max --name takumi-backend

# Or specify instance count
pm2 start dist/index.js -i 4 --name takumi-backend

# Monitor instances
pm2 monit
```

**Load balancing with Nginx**:

```nginx
# /etc/nginx/sites-available/takumi

upstream takumi_backend {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    server localhost:3004;
}

server {
    listen 80;
    server_name api.takumi.example;
    
    location / {
        proxy_pass http://takumi_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Security Operations

### How do I rotate JWT secrets?

```bash
./scripts/rotate-jwt-secrets.sh
```

**Manual rotation**:

```bash
# 1. Generate new secrets
NEW_JWT_SECRET=$(openssl rand -hex 32)
NEW_REFRESH_SECRET=$(openssl rand -hex 32)

# 2. Update .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" backend/.env
sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$NEW_REFRESH_SECRET/" backend/.env

# 3. Restart backend (invalidates all tokens)
pm2 restart takumi-backend

# 4. Notify users to re-authenticate
```

---

### How do I revoke API keys?

**Via database**:

```bash
psql -h localhost -U takumi_user -d takumi_db <<EOF
UPDATE api_keys 
SET revoked = TRUE, revoked_at = NOW() 
WHERE key_hash = '$KEY_HASH';
EOF
```

**Via backend API**:

```bash
curl -X DELETE https://api.takumi.example/api/v1/admin/api-keys/$KEY_ID \
  -H "X-API-Key: $ADMIN_API_KEY"
```

---

### How do I audit security logs?

**Check authentication logs**:

```bash
psql -h localhost -U takumi_user -d takumi_db <<EOF
SELECT 
  address,
  action,
  success,
  ip_address,
  created_at
FROM auth_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
EOF
```

**Check failed login attempts**:

```bash
psql -h localhost -U takumi_user -d takumi_db <<EOF
SELECT 
  address,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM auth_logs
WHERE success = FALSE
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY address
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
EOF
```

---

## Incident Response

### What do I do if contracts are compromised?

**Immediate actions**:

```bash
# 1. Pause all contracts
./scripts/emergency-pause.sh

# 2. Notify team
# Send alert to ops@takumi.example

# 3. Investigate
# Review recent transactions on Etherscan
# Check for unauthorized role grants

# 4. Document incident
# Create incident report in docs/incidents/

# 5. Plan recovery
# Follow INCIDENT_RESPONSE.md procedures
```

**See also**: [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md), [EMERGENCY_RUNBOOK.md](./EMERGENCY_RUNBOOK.md)

---

### How do I handle database corruption?

```bash
# 1. Stop backend
pm2 stop takumi-backend

# 2. Backup current state (even if corrupted)
./scripts/backup-database.sh

# 3. Attempt repair
psql -h localhost -U takumi_user -d takumi_db <<EOF
REINDEX DATABASE takumi_db;
VACUUM FULL;
EOF

# 4. If repair fails, restore from backup
./scripts/restore-database.sh /backups/latest-good.sql

# 5. Restart backend
pm2 start takumi-backend

# 6. Verify data integrity
npm run test:integration
```

---

## Maintenance Tasks

### Daily tasks

```bash
# Check system health
./scripts/health-check.sh

# Review error logs
tail -n 100 backend/logs/error.log

# Check disk space
df -h

# Monitor active users
psql -h localhost -U takumi_user -d takumi_db \
  -c "SELECT COUNT(DISTINCT address) FROM auth_logs WHERE created_at > NOW() - INTERVAL '24 hours';"
```

---

### Weekly tasks

```bash
# Review monitoring dashboards
# - Check Grafana for anomalies
# - Review Prometheus alerts

# Database maintenance
psql -h localhost -U takumi_user -d takumi_db <<EOF
VACUUM ANALYZE;
EOF

# Verify backups
./scripts/verify-backups.sh

# Review security logs
# Check for suspicious activity

# Update dependencies (if needed)
npm outdated
```

**See also**: [WEEKLY_REVIEW.md](./WEEKLY_REVIEW.md)

---

### Monthly tasks

```bash
# Performance optimization
# - Review slow queries
# - Optimize indexes
# - Update statistics

# Security audit
# - Review access logs
# - Check for outdated dependencies
# - Rotate secrets if needed

# Capacity planning
# - Review resource usage trends
# - Plan scaling if needed

# Documentation updates
# - Update runbooks
# - Document new procedures
```

**See also**: [MONTHLY_OPTIMIZATION.md](./MONTHLY_OPTIMIZATION.md)

---

## Additional Resources

- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Monitoring Setup**: [MONITORING_SETUP.md](./MONITORING_SETUP.md)
- **Disaster Recovery**: [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
- **Incident Response**: [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Security**: [SECURITY.md](./SECURITY.md)

---

**Need Help?**
- Internal Wiki: https://wiki.takumi.example
- DevOps Team: ops@takumi.example
- Emergency Hotline: +1-XXX-XXX-XXXX
- On-call Schedule: https://pagerduty.takumi.example
