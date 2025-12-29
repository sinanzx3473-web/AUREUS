# Troubleshooting Guide

## Overview

This guide covers common issues and solutions for Takumi platform deployment and operation.

## Smart Contract Issues

### Contract Deployment Failures

#### Issue: "Insufficient funds for gas"

**Cause**: Deployer wallet lacks ETH for gas fees.

**Solution**:
```bash
# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL

# Fund wallet from faucet (testnet)
# Sepolia: https://sepoliafaucet.com
# Polygon Mumbai: https://faucet.polygon.technology
```

#### Issue: "Contract creation code storage out of gas"

**Cause**: Contract too large (>24KB limit).

**Solution**:
```bash
# Check contract size
forge build --sizes

# Enable optimizer in foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 200

# Rebuild
forge build
```

#### Issue: "Nonce too low"

**Cause**: Transaction nonce mismatch.

**Solution**:
```bash
# Check current nonce
cast nonce $DEPLOYER_ADDRESS --rpc-url $RPC_URL

# Reset nonce in deployment script or wait for pending tx
```

### Contract Interaction Failures

#### Issue: "Execution reverted: AccessControl: account is missing role"

**Cause**: Caller lacks required role.

**Solution**:
```bash
# Check if address has role
cast call $CONTRACT_ADDRESS \
  "hasRole(bytes32,address)" \
  $(cast keccak "VERIFIER_ROLE") \
  $ADDRESS \
  --rpc-url $RPC_URL

# Grant role
cast send $CONTRACT_ADDRESS \
  "grantRole(bytes32,address)" \
  $(cast keccak "VERIFIER_ROLE") \
  $ADDRESS \
  --private-key $ADMIN_PRIVATE_KEY \
  --rpc-url $RPC_URL
```

#### Issue: "Pausable: paused"

**Cause**: Contract is paused.

**Solution**:
```bash
# Check pause status
cast call $CONTRACT_ADDRESS "paused()" --rpc-url $RPC_URL

# Unpause (requires PAUSER_ROLE)
cast send $CONTRACT_ADDRESS "unpause()" \
  --private-key $PAUSER_PRIVATE_KEY \
  --rpc-url $RPC_URL
```

#### Issue: "Invalid metadata URI"

**Cause**: Empty or invalid IPFS/Arweave URI.

**Solution**:
```bash
# Verify metadata URI format
# Valid: ipfs://QmX... or ar://abc123...
# Invalid: empty string, http://...

# Upload metadata first
curl -X POST http://localhost:3001/api/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": {...}, "provider": "ipfs"}'
```

### Upgrade Issues

#### Issue: "Upgrade failed: not authorized"

**Cause**: Caller lacks DEFAULT_ADMIN_ROLE.

**Solution**:
```bash
# Verify admin role
cast call $PROXY_ADDRESS \
  "hasRole(bytes32,address)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  $UPGRADER_ADDRESS \
  --rpc-url $RPC_URL

# Use correct admin account for upgrade
```

#### Issue: "Storage layout incompatible"

**Cause**: New implementation breaks storage layout.

**Solution**:
```bash
# Run storage layout check
forge inspect SkillProfile storage-layout > old-layout.json
forge inspect SkillProfileV2 storage-layout > new-layout.json
diff old-layout.json new-layout.json

# Fix: Only append new variables, never reorder or remove
```

## Backend API Issues

### Database Connection

#### Issue: "Connection refused" or "ECONNREFUSED"

**Cause**: PostgreSQL not running or wrong connection details.

**Solution**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Verify connection string
psql $DATABASE_URL

# Check firewall
sudo ufw allow 5432/tcp
```

#### Issue: "password authentication failed"

**Cause**: Wrong database credentials.

**Solution**:
```bash
# Reset password
sudo -u postgres psql
ALTER USER takumi_user WITH PASSWORD 'new_password';

# Update .env
DATABASE_URL=postgresql://takumi_user:new_password@localhost:5432/takumi
```

#### Issue: "database does not exist"

**Cause**: Database not created.

**Solution**:
```bash
# Create database
createdb takumi

# Or via psql
psql -U postgres -c "CREATE DATABASE takumi;"

# Run migrations
cd backend
pnpm run migrate up
```

### Redis Connection

#### Issue: "Redis connection failed"

**Cause**: Redis not running or wrong connection details.

**Solution**:
```bash
# Check Redis status
sudo systemctl status redis

# Start Redis
sudo systemctl start redis

# Test connection
redis-cli ping
# Expected: PONG

# Check password
redis-cli -a $REDIS_PASSWORD ping
```

#### Issue: "NOAUTH Authentication required"

**Cause**: Redis password not provided.

**Solution**:
```bash
# Update .env
REDIS_PASSWORD=your_redis_password

# Or disable password (not recommended for production)
# In /etc/redis/redis.conf, comment out:
# requirepass your_password
```

### Authentication Issues

#### Issue: "Invalid signature"

**Cause**: Signature verification failed.

**Solution**:
```typescript
// Ensure message format matches exactly
const message = `Sign this message to authenticate: ${nonce}`;

// Sign with correct wallet
const signature = await signMessageAsync({ message });

// Verify address matches
const recoveredAddress = verifyMessage(message, signature);
console.log('Recovered:', recoveredAddress);
console.log('Expected:', address);
```

#### Issue: "JWT expired"

**Cause**: Access token expired (15 min default).

**Solution**:
```typescript
// Refresh token
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include' // Include refresh token cookie
});

const { accessToken } = await response.json();

// Use new access token
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
```

#### Issue: "Invalid admin API key"

**Cause**: Wrong API key or not in database.

**Solution**:
```bash
# Generate new API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Hash and store in database
psql takumi -c "INSERT INTO admin_keys (key_hash, name) VALUES (crypt('your_api_key', gen_salt('bf')), 'Admin Key');"

# Use in requests
curl -H "X-Admin-API-Key: your_api_key" http://localhost:3001/api/admin/stats
```

### Rate Limiting

#### Issue: "Too many requests"

**Cause**: Rate limit exceeded.

**Solution**:
```bash
# Wait for rate limit window to reset (15 minutes default)

# Or increase limits in backend/src/index.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increase from 100
});

# Or whitelist IP
const limiter = rateLimit({
  skip: (req) => req.ip === 'trusted.ip.address',
});
```

### CORS Issues

#### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause**: Frontend origin not in CORS whitelist.

**Solution**:
```bash
# Update backend/.env
CORS_ORIGINS=https://takumi.example,https://www.takumi.example,http://localhost:5173

# Restart backend
pm2 restart takumi-backend
```

### Migration Issues

#### Issue: "Migration failed: relation already exists"

**Cause**: Migration already applied or partial application.

**Solution**:
```bash
# Check migration status
pnpm run migrate list

# Rollback last migration
pnpm run migrate down

# Reapply
pnpm run migrate up

# Or mark as applied without running
psql takumi -c "INSERT INTO migrations (name, run_on) VALUES ('001_initial_schema', NOW());"
```

## Frontend Issues

### Wallet Connection

#### Issue: "No injected provider found"

**Cause**: No wallet extension installed.

**Solution**:
- Install MetaMask, Rainbow, or other Web3 wallet
- Refresh page after installation
- Check browser compatibility

#### Issue: "User rejected request"

**Cause**: User declined connection in wallet.

**Solution**:
- Retry connection
- Check wallet is unlocked
- Verify correct network selected

#### Issue: "Unsupported chain"

**Cause**: Wallet on wrong network.

**Solution**:
```typescript
// Add network switch prompt
import { useSwitchNetwork } from 'wagmi';

const { switchNetwork } = useSwitchNetwork();

// Switch to Sepolia
switchNetwork?.(11155111);
```

### Contract Interaction

#### Issue: "Contract not deployed on this network"

**Cause**: Wrong network or contract address.

**Solution**:
```bash
# Verify contract address in src/utils/evmConfig.ts
export const contracts = {
  sepolia: {
    SkillProfile: '0x...' // Correct address
  }
};

# Check current network
const { chain } = useNetwork();
console.log('Current chain:', chain?.id);
```

#### Issue: "Insufficient funds for transaction"

**Cause**: Wallet lacks ETH for gas.

**Solution**:
- Get testnet ETH from faucet
- Check gas price and limit
- Reduce transaction complexity

#### Issue: "Transaction reverted without reason"

**Cause**: Contract call failed, often due to validation.

**Solution**:
```typescript
// Add error handling
try {
  const tx = await contract.createClaim(metadata);
  await tx.wait();
} catch (error) {
  console.error('Transaction failed:', error);
  
  // Check specific error
  if (error.message.includes('paused')) {
    alert('Contract is paused');
  } else if (error.message.includes('role')) {
    alert('Insufficient permissions');
  }
}
```

### API Communication

#### Issue: "Network Error" or "Failed to fetch"

**Cause**: Backend not running or wrong API URL.

**Solution**:
```bash
# Check backend status
curl http://localhost:3001/health

# Verify API URL in .env
VITE_API_URL=http://localhost:3001

# Check CORS configuration
```

#### Issue: "401 Unauthorized"

**Cause**: Missing or invalid JWT token.

**Solution**:
```typescript
// Ensure token is set
const token = localStorage.getItem('accessToken');
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Refresh if expired
if (error.response?.status === 401) {
  await refreshToken();
  // Retry request
}
```

### Build Issues

#### Issue: "Module not found"

**Cause**: Missing dependency or wrong import path.

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check import paths
# Wrong: import { Button } from 'components/Button'
# Right: import { Button } from './components/Button'
```

#### Issue: "Out of memory" during build

**Cause**: Large bundle or insufficient memory.

**Solution**:
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 pnpm run build

# Or optimize bundle
# vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          wagmi: ['wagmi', 'viem']
        }
      }
    }
  }
});
```

## Monitoring Issues

### Prometheus

#### Issue: "Targets down"

**Cause**: Services not exposing metrics or wrong configuration.

**Solution**:
```bash
# Check if backend exposes metrics
curl http://localhost:3001/metrics

# Verify prometheus.yml targets
cat monitoring/prometheus/prometheus.yml

# Restart Prometheus
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

#### Issue: "No data in Grafana"

**Cause**: Prometheus not scraping or wrong data source.

**Solution**:
1. Check Prometheus targets: http://localhost:9090/targets
2. Verify Grafana data source configuration
3. Check time range in Grafana dashboard
4. Verify metric names in queries

### ELK Stack

#### Issue: "Elasticsearch cluster health red"

**Cause**: Disk space, memory, or configuration issues.

**Solution**:
```bash
# Check cluster health
curl http://localhost:9200/_cluster/health?pretty

# Check disk space
df -h

# Increase heap size in docker-compose.monitoring.yml
environment:
  - "ES_JAVA_OPTS=-Xms2g -Xmx2g"

# Restart Elasticsearch
docker-compose -f docker-compose.monitoring.yml restart elasticsearch
```

#### Issue: "Logstash not receiving logs"

**Cause**: Wrong configuration or network issues.

**Solution**:
```bash
# Check Logstash pipeline
docker-compose -f docker-compose.monitoring.yml logs logstash

# Verify pipeline configuration
cat monitoring/logstash/pipeline/logstash.conf

# Test log sending
echo '{"message": "test"}' | nc localhost 5000
```

### Alertmanager

#### Issue: "Alerts not sending"

**Cause**: Wrong SMTP configuration or network issues.

**Solution**:
```bash
# Check Alertmanager logs
docker-compose -f docker-compose.monitoring.yml logs alertmanager

# Test SMTP connection
telnet smtp.sendgrid.net 587

# Verify alertmanager config
cat monitoring/alertmanager/config.yml

# Send test alert
curl -X POST http://localhost:9093/api/v1/alerts -d '[{"labels":{"alertname":"test"}}]'
```

## Blockchain Indexer Issues

#### Issue: "Indexer not syncing events"

**Cause**: Wrong RPC URL, contract address, or event signatures.

**Solution**:
```bash
# Check indexer logs
docker-compose logs -f backend | grep indexer

# Verify contract address
echo $SKILL_PROFILE_ADDRESS

# Test RPC connection
cast block latest --rpc-url $RPC_URL

# Restart indexer
pm2 restart takumi-backend
```

#### Issue: "Missing events"

**Cause**: Indexer started after events emitted or RPC rate limits.

**Solution**:
```typescript
// Set start block in backend/src/services/indexer.service.ts
const startBlock = 1234567; // Block when contract was deployed

// Or resync from beginning
await indexer.syncFromBlock(0);
```

## Performance Issues

### Slow API Responses

**Diagnosis**:
```bash
# Check database query performance
psql takumi -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check Redis latency
redis-cli --latency

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/profiles/0x...
```

**Solutions**:
- Add database indexes
- Enable Redis caching
- Optimize queries
- Scale horizontally

### High Memory Usage

**Diagnosis**:
```bash
# Check Node.js memory
pm2 monit

# Check Docker container memory
docker stats
```

**Solutions**:
```bash
# Increase Node memory limit
NODE_OPTIONS=--max-old-space-size=2048 pm2 restart takumi-backend

# Optimize database connection pool
# backend/src/config/database.ts
max: 20, // Reduce from default
```

### Database Connection Pool Exhausted

**Diagnosis**:
```bash
# Check active connections
psql takumi -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions**:
```typescript
// Increase pool size in backend/src/config/database.ts
const pool = new Pool({
  max: 50, // Increase from 20
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Issues

### Suspected Breach

**Immediate Actions**:
1. Pause smart contracts
2. Rotate all API keys and secrets
3. Review access logs
4. Notify users
5. Investigate breach vector

```bash
# Pause contracts
cast send $SKILL_PROFILE_ADDRESS "pause()" \
  --private-key $PAUSER_PRIVATE_KEY \
  --rpc-url $RPC_URL

# Rotate JWT secrets
# Generate new secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env and restart
pm2 restart takumi-backend

# Review logs
grep "failed authentication" /var/log/takumi/backend.log
```

### Unusual Activity

**Investigation**:
```bash
# Check failed auth attempts
psql takumi -c "SELECT * FROM auth_logs WHERE success = false ORDER BY timestamp DESC LIMIT 100;"

# Check admin actions
psql takumi -c "SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100;"

# Review Grafana dashboards for anomalies
```

## Getting Help

### Logs Location

- **Backend**: `backend/logs/` or `pm2 logs takumi-backend`
- **Frontend**: Browser console
- **Smart Contracts**: Etherscan transaction logs
- **Monitoring**: Kibana (http://localhost:5601)

### Debug Mode

```bash
# Enable debug logging
# backend/.env
LOG_LEVEL=debug

# Restart
pm2 restart takumi-backend

# View debug logs
pm2 logs takumi-backend --lines 100
```

### Support Channels

- GitHub Issues: https://github.com/takumi/issues
- Documentation: https://docs.takumi.example
- Email: support@takumi.example
- Discord: https://discord.gg/takumi

### Reporting Bugs

Include:
1. Environment (OS, Node version, browser)
2. Steps to reproduce
3. Expected vs actual behavior
4. Relevant logs and error messages
5. Screenshots if applicable
