# Scaling Procedures Guide

**Comprehensive guide for scaling Takumi platform infrastructure**

---

## Overview

This document provides step-by-step procedures for scaling different components of the Takumi platform to handle increased load, user growth, and transaction volume.

---

## Table of Contents

1. [Add New Blockchain Networks](#1-add-new-blockchain-networks)
2. [Scale Database Capacity](#2-scale-database-capacity)
3. [Scale Backend API](#3-scale-backend-api)
4. [Scale Frontend Infrastructure](#4-scale-frontend-infrastructure)
5. [Scale Monitoring Stack](#5-scale-monitoring-stack)
6. [Scale Storage (IPFS)](#6-scale-storage-ipfs)

---

## 1. Add New Blockchain Networks

**When to Scale**:
- User demand for new network support
- High gas costs on existing networks
- Strategic expansion to new ecosystems

**Estimated Time**: 4-8 hours per network  
**Complexity**: Medium  
**Risk**: Low (isolated to new network)

### Prerequisites

- [ ] Network RPC endpoint (Alchemy, Infura, or self-hosted)
- [ ] Network block explorer API key (Etherscan-compatible)
- [ ] Test ETH/tokens for deployment
- [ ] Mainnet ETH/tokens for production deployment

### Step 1: Deploy Contracts to New Network

```bash
# 1. Add network configuration to foundry.toml
cat >> contracts/foundry.toml << EOF

[rpc_endpoints]
avalanche = "https://api.avax.network/ext/bc/C/rpc"

[etherscan]
avalanche = { key = "\${SNOWTRACE_API_KEY}", url = "https://api.snowtrace.io/api" }
EOF

# 2. Set environment variables
export PRIVATE_KEY="0x..."
export AVALANCHE_RPC_URL="https://api.avax.network/ext/bc/C/rpc"
export SNOWTRACE_API_KEY="..."

# 3. Deploy to testnet first (Fuji)
cd contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --broadcast \
  --verify \
  --legacy

# 4. Test deployed contracts
export SKILL_PROFILE_ADDRESS="0x..."
cast call $SKILL_PROFILE_ADDRESS "owner()" --rpc-url https://api.avax-test.network/ext/bc/C/rpc

# 5. Create test profile
cast send $SKILL_PROFILE_ADDRESS \
  "createProfile(string,string)" \
  "Test Profile" \
  "ipfs://QmTest" \
  --private-key $TEST_PRIVATE_KEY \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc

# 6. Verify on block explorer
# Visit: https://testnet.snowtrace.io/address/$SKILL_PROFILE_ADDRESS

# 7. If tests pass, deploy to mainnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $AVALANCHE_RPC_URL \
  --broadcast \
  --verify \
  --legacy

# 8. Update deployment records
cat >> contracts/interfaces/deploy.json << EOF
  "avalanche": {
    "SkillProfile": {
      "proxy": "0x...",
      "implementation": "0x...",
      "deployer": "0x...",
      "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
    "SkillClaim": { ... },
    "Endorsement": { ... },
    "VerifierRegistry": { ... }
  }
EOF
```

### Step 2: Update Backend Configuration

```bash
# 1. Add network to backend configuration
cat >> backend/.env << EOF

# Avalanche Configuration
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
AVALANCHE_SKILL_PROFILE_ADDRESS=0x...
AVALANCHE_SKILL_CLAIM_ADDRESS=0x...
AVALANCHE_ENDORSEMENT_ADDRESS=0x...
AVALANCHE_VERIFIER_REGISTRY_ADDRESS=0x...
AVALANCHE_START_BLOCK=12345678
EOF

# 2. Update indexer configuration
# Edit backend/src/services/indexer.service.ts
# Add Avalanche to networks array

# 3. Update API to support new network
# Edit backend/src/controllers/*.controller.ts
# Add network parameter validation

# 4. Restart backend
pm2 restart backend

# 5. Verify indexer starts syncing
pm2 logs indexer | grep -i avalanche
```

### Step 3: Update Frontend Configuration

```bash
# 1. Update wagmi configuration
# Edit src/utils/wagmiConfig.ts

import { avalanche } from 'wagmi/chains'

export const chains = [
  mainnet,
  polygon,
  bsc,
  arbitrum,
  optimism,
  base,
  avalanche  // Add new chain
] as const

# 2. Update contract addresses
# Edit src/utils/evmConfig.ts

export const contractAddresses = {
  // ... existing networks
  43114: { // Avalanche mainnet
    SkillProfile: '0x...',
    SkillClaim: '0x...',
    Endorsement: '0x...',
    VerifierRegistry: '0x...'
  }
}

# 3. Update network selector UI
# Edit src/components/NetworkSelector.tsx
# Add Avalanche to network list with logo

# 4. Build and test locally
pnpm build
pnpm preview

# 5. Deploy to production
vercel --prod
```

### Step 4: Update Monitoring

```bash
# 1. Add Avalanche metrics to Prometheus
cat >> monitoring/prometheus.yml << EOF

  - job_name: 'avalanche-contracts'
    static_configs:
      - targets: ['api.avax.network:443']
    metrics_path: '/ext/bc/C/rpc'
    params:
      module: [eth_blockNumber]
EOF

# 2. Update Grafana dashboard
# Add Avalanche panels to monitoring/grafana/dashboards/takumi-dashboard.json

# 3. Add alerts for new network
cat >> monitoring/alerts.yml << EOF

  - alert: AvalancheIndexerLagging
    expr: avalanche_latest_indexed_block < avalanche_current_block - 1000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Avalanche indexer is lagging"
EOF

# 4. Restart monitoring stack
cd monitoring
docker-compose restart
```

### Step 5: Documentation & Announcement

- [ ] Update README.md with new network
- [ ] Update DEPLOYMENT.md with network-specific instructions
- [ ] Update FAQ.md with Avalanche-specific questions
- [ ] Create announcement blog post
- [ ] Notify users via Twitter/Discord
- [ ] Update website with new network logo

### Verification Checklist

- [ ] Contracts deployed and verified on block explorer
- [ ] Test transactions successful on testnet
- [ ] Indexer syncing blocks from new network
- [ ] API returns data for new network
- [ ] Frontend displays new network in selector
- [ ] Users can switch to new network and transact
- [ ] Monitoring dashboards show new network metrics
- [ ] Alerts configured for new network

---

## 2. Scale Database Capacity

**When to Scale**:
- Database CPU >70% sustained
- Storage >80% full
- Query latency increasing
- Connection pool exhaustion

**Estimated Time**: 1-4 hours (depending on method)  
**Complexity**: Medium-High  
**Risk**: Medium (requires careful planning)

### Option A: Vertical Scaling (Increase Instance Size)

**Best for**: Quick capacity increase, simple implementation  
**Downtime**: 5-15 minutes

```bash
# 1. Create final backup before scaling
./scripts/backup-database.sh

# 2. Verify backup integrity
gunzip -t /backups/database/takumi_prod_$(date +%Y%m%d)*.sql.gz

# 3. Stop application services
pm2 stop all

# 4. For AWS RDS:
aws rds modify-db-instance \
  --db-instance-identifier takumi-prod \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately

# Wait for modification to complete (5-15 minutes)
aws rds wait db-instance-available \
  --db-instance-identifier takumi-prod

# 5. For self-hosted PostgreSQL:
# - Provision larger instance
# - Restore backup to new instance
# - Update connection strings
# - Migrate traffic

# 6. Verify new instance
psql -h new-db-host -U takumi -d takumi_prod -c "
  SELECT version();
  SELECT pg_size_pretty(pg_database_size('takumi_prod'));
"

# 7. Update backend configuration
# Edit backend/.env
DATABASE_HOST=new-db-host

# 8. Restart services
pm2 start all

# 9. Monitor performance
watch -n 5 'psql -U takumi -d takumi_prod -c "
  SELECT count(*) as active_connections 
  FROM pg_stat_activity 
  WHERE state = '\''active'\'';"'
```

### Option B: Horizontal Scaling (Read Replicas)

**Best for**: Read-heavy workloads, high availability  
**Downtime**: None (gradual migration)

```bash
# 1. Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier takumi-prod-replica-1 \
  --source-db-instance-identifier takumi-prod \
  --db-instance-class db.r6g.xlarge \
  --availability-zone us-east-1b

# Wait for replica to be available
aws rds wait db-instance-available \
  --db-instance-identifier takumi-prod-replica-1

# 2. Update backend to use read replica for queries
# Edit backend/src/config/database.ts

import { Pool } from 'pg'

// Write pool (primary)
export const writePool = new Pool({
  host: process.env.DATABASE_HOST,
  database: 'takumi_prod',
  user: 'takumi',
  password: process.env.DATABASE_PASSWORD,
  max: 50
})

// Read pool (replica)
export const readPool = new Pool({
  host: process.env.DATABASE_REPLICA_HOST,
  database: 'takumi_prod',
  user: 'takumi',
  password: process.env.DATABASE_PASSWORD,
  max: 100
})

// Helper function to route queries
export function getPool(operation: 'read' | 'write') {
  return operation === 'write' ? writePool : readPool
}

# 3. Update queries to use appropriate pool
# Edit backend/src/controllers/*.controller.ts

// Read operations
const profiles = await getPool('read').query(
  'SELECT * FROM skill_profiles WHERE owner = $1',
  [address]
)

// Write operations
await getPool('write').query(
  'INSERT INTO skill_profiles ...',
  [...]
)

# 4. Deploy updated backend
pm2 restart backend

# 5. Monitor replication lag
psql -h replica-host -U takumi -d takumi_prod -c "
  SELECT 
    CASE 
      WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() 
      THEN 0 
      ELSE EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())
    END AS replication_lag_seconds;
"

# Target: <1 second lag
```

### Option C: Table Partitioning

**Best for**: Large tables with time-series data  
**Downtime**: Minimal (during migration)

```sql
-- 1. Create partitioned table structure
CREATE TABLE skill_profiles_partitioned (
  id BIGSERIAL,
  owner VARCHAR(42) NOT NULL,
  name VARCHAR(255) NOT NULL,
  metadata_uri TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 2. Create partitions (monthly)
CREATE TABLE skill_profiles_2024_01 PARTITION OF skill_profiles_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE skill_profiles_2024_02 PARTITION OF skill_profiles_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ... create partitions for each month

-- 3. Create indexes on partitions
CREATE INDEX idx_profiles_2024_01_owner ON skill_profiles_2024_01(owner);
CREATE INDEX idx_profiles_2024_02_owner ON skill_profiles_2024_02(owner);

-- 4. Migrate data (in batches to avoid locks)
DO $$
DECLARE
  batch_size INT := 10000;
  offset_val INT := 0;
BEGIN
  LOOP
    INSERT INTO skill_profiles_partitioned
    SELECT * FROM skill_profiles
    ORDER BY id
    LIMIT batch_size OFFSET offset_val;
    
    EXIT WHEN NOT FOUND;
    offset_val := offset_val + batch_size;
    
    -- Pause between batches
    PERFORM pg_sleep(1);
  END LOOP;
END $$;

-- 5. Verify data migration
SELECT COUNT(*) FROM skill_profiles;
SELECT COUNT(*) FROM skill_profiles_partitioned;
-- Counts should match

-- 6. Rename tables (requires brief downtime)
BEGIN;
  ALTER TABLE skill_profiles RENAME TO skill_profiles_old;
  ALTER TABLE skill_profiles_partitioned RENAME TO skill_profiles;
COMMIT;

-- 7. Update application (no code changes needed if using same table name)

-- 8. Monitor performance improvement
EXPLAIN ANALYZE
SELECT * FROM skill_profiles
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';
-- Should only scan one partition

-- 9. Drop old table after verification
DROP TABLE skill_profiles_old;
```

### Option D: Increase Connection Pool

**Best for**: Connection exhaustion without CPU/memory pressure  
**Downtime**: None

```bash
# 1. Check current connection usage
psql -U takumi -d takumi_prod -c "
  SELECT 
    max_conn,
    used,
    res_for_super,
    max_conn - used - res_for_super AS available
  FROM (
    SELECT count(*) AS used FROM pg_stat_activity
  ) t1,
  (
    SELECT setting::int AS res_for_super 
    FROM pg_settings 
    WHERE name = 'superuser_reserved_connections'
  ) t2,
  (
    SELECT setting::int AS max_conn 
    FROM pg_settings 
    WHERE name = 'max_connections'
  ) t3;
"

# 2. Increase PostgreSQL max_connections
# Edit postgresql.conf
max_connections = 200  # Increase from 100

# Restart PostgreSQL
sudo systemctl restart postgresql

# 3. Increase backend connection pool
# Edit backend/src/config/database.ts
export const pool = new Pool({
  max: 100,  // Increase from 50
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

# 4. Restart backend
pm2 restart backend

# 5. Monitor connection usage
watch -n 5 'psql -U takumi -d takumi_prod -c "
  SELECT count(*), state 
  FROM pg_stat_activity 
  GROUP BY state;"'
```

---

## 3. Scale Backend API

**When to Scale**:
- API response time >500ms p95
- CPU >70% sustained
- Request queue building up
- Error rate increasing under load

**Estimated Time**: 1-3 hours  
**Complexity**: Medium  
**Risk**: Low

### Option A: Vertical Scaling (Increase Server Resources)

```bash
# 1. For AWS EC2, resize instance
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
aws ec2 modify-instance-attribute \
  --instance-id i-1234567890abcdef0 \
  --instance-type t3.xlarge
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# 2. For PM2 cluster mode, increase workers
pm2 scale backend +2  # Add 2 more workers

# 3. Monitor CPU usage
pm2 monit
```

### Option B: Horizontal Scaling (Multiple Backend Instances)

```bash
# 1. Set up load balancer (Nginx example)
cat > /etc/nginx/conf.d/takumi-backend.conf << EOF
upstream backend {
  least_conn;  # Load balancing method
  server 10.0.1.10:3000 max_fails=3 fail_timeout=30s;
  server 10.0.1.11:3000 max_fails=3 fail_timeout=30s;
  server 10.0.1.12:3000 max_fails=3 fail_timeout=30s;
}

server {
  listen 80;
  server_name api.takumi.io;

  location / {
    proxy_pass http://backend;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    
    # Health check
    proxy_next_upstream error timeout http_500 http_502 http_503;
  }

  location /health {
    access_log off;
    proxy_pass http://backend/health;
  }
}
EOF

# 2. Reload Nginx
sudo nginx -t && sudo nginx -s reload

# 3. Deploy backend to additional servers
# On each new server:
git clone https://github.com/your-org/takumi.git
cd takumi/backend
npm install
cp .env.example .env
# Edit .env with production values
pm2 start npm --name backend -- start

# 4. Verify load balancing
for i in {1..10}; do
  curl -s http://api.takumi.io/health | jq .hostname
done
# Should see different hostnames

# 5. Monitor load distribution
watch -n 5 'curl -s http://api.takumi.io/metrics | grep request_count'
```

### Option C: Implement Caching Layer

```bash
# 1. Install Redis (if not already)
sudo apt-get install redis-server

# 2. Update backend to use caching
# Edit backend/src/middleware/cache.ts

import { createClient } from 'redis'

const redis = createClient({
  url: process.env.REDIS_URL
})

export async function cacheMiddleware(req, res, next) {
  const key = `cache:${req.path}:${JSON.stringify(req.query)}`
  
  try {
    const cached = await redis.get(key)
    if (cached) {
      return res.json(JSON.parse(cached))
    }
    
    // Store original res.json
    const originalJson = res.json.bind(res)
    
    // Override res.json to cache response
    res.json = (data) => {
      redis.setEx(key, 300, JSON.stringify(data))  // Cache for 5 minutes
      return originalJson(data)
    }
    
    next()
  } catch (error) {
    next()  // Continue without cache on error
  }
}

# 3. Apply caching to routes
# Edit backend/src/routes/profile.routes.ts

import { cacheMiddleware } from '../middleware/cache'

router.get('/profiles', cacheMiddleware, getProfiles)
router.get('/profiles/:id', cacheMiddleware, getProfile)

# 4. Deploy updated backend
pm2 restart backend

# 5. Monitor cache hit rate
redis-cli INFO stats | grep keyspace_hits
```

---

## 4. Scale Frontend Infrastructure

**When to Scale**:
- Slow page load times
- High CDN costs
- Geographic latency issues

**Estimated Time**: 1-2 hours  
**Complexity**: Low  
**Risk**: Low

### Option A: Optimize Build & Bundle Size

```bash
# 1. Analyze bundle size
pnpm build
pnpm analyze

# 2. Implement code splitting
# Edit vite.config.ts

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'wagmi': ['wagmi', 'viem'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})

# 3. Enable compression
# Vercel does this automatically
# For self-hosted, enable gzip in Nginx

# 4. Optimize images
pnpm add -D vite-plugin-image-optimizer

# Edit vite.config.ts
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      webp: { quality: 80 }
    })
  ]
})

# 5. Rebuild and deploy
pnpm build
vercel --prod
```

### Option B: Multi-Region Deployment

```bash
# 1. Deploy to multiple regions (Vercel example)
# Vercel automatically deploys to edge locations

# For self-hosted, use CloudFront with multiple origins

# 2. Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name takumi-us-east.s3.amazonaws.com \
  --default-root-object index.html

# 3. Add additional origins for other regions
# Edit CloudFront distribution to add origin groups

# 4. Configure geo-routing
# Route users to nearest origin based on location

# 5. Update DNS to point to CloudFront
# CNAME: takumi.io -> d111111abcdef8.cloudfront.net
```

---

## 5. Scale Monitoring Stack

**When to Scale**:
- Prometheus storage >80% full
- Query timeouts in Grafana
- Alert delays

**Estimated Time**: 2-4 hours  
**Complexity**: Medium  
**Risk**: Low

```bash
# 1. Increase Prometheus retention
# Edit monitoring/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Increase storage retention
storage:
  tsdb:
    retention.time: 30d  # Increase from 15d
    retention.size: 50GB  # Add size limit

# 2. Implement Prometheus federation for long-term storage
# Set up Thanos or Cortex for multi-cluster monitoring

# 3. Optimize Grafana queries
# Use recording rules for expensive queries

# Edit monitoring/prometheus.yml
groups:
  - name: recording_rules
    interval: 1m
    rules:
      - record: api:request_rate:5m
        expr: rate(http_requests_total[5m])
      
      - record: api:error_rate:5m
        expr: rate(http_errors_total[5m]) / rate(http_requests_total[5m])

# 4. Restart monitoring stack
cd monitoring
docker-compose down
docker-compose up -d

# 5. Verify increased capacity
docker exec prometheus df -h /prometheus
```

---

## 6. Scale Storage (IPFS)

**When to Scale**:
- IPFS pin quota approaching limit
- Slow IPFS retrieval times
- High Pinata costs

**Estimated Time**: 2-4 hours  
**Complexity**: Medium  
**Risk**: Low

### Option A: Self-Hosted IPFS Node

```bash
# 1. Install IPFS
wget https://dist.ipfs.io/go-ipfs/v0.18.0/go-ipfs_v0.18.0_linux-amd64.tar.gz
tar -xvzf go-ipfs_v0.18.0_linux-amd64.tar.gz
cd go-ipfs
sudo bash install.sh

# 2. Initialize IPFS
ipfs init

# 3. Configure IPFS
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
ipfs config --json Datastore.StorageMax '"100GB"'

# 4. Start IPFS daemon
ipfs daemon &

# 5. Update backend to use self-hosted IPFS
# Edit backend/.env
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080

# 6. Migrate existing pins from Pinata
# List all pins
curl -X GET "https://api.pinata.cloud/data/pinList" \
  -H "Authorization: Bearer $PINATA_JWT"

# Pin to self-hosted node
ipfs pin add QmHash...

# 7. Monitor IPFS storage
ipfs repo stat
```

### Option B: Upgrade Pinata Plan

```bash
# 1. Review current usage
curl -X GET "https://api.pinata.cloud/data/userPinnedDataTotal" \
  -H "Authorization: Bearer $PINATA_JWT"

# 2. Upgrade plan via Pinata dashboard
# https://app.pinata.cloud/billing

# 3. No code changes needed
```

---

## Scaling Decision Matrix

| Component | Current Load | Scaling Trigger | Recommended Action | Complexity | Downtime |
|-----------|--------------|-----------------|-------------------|------------|----------|
| Database | 60% CPU | >70% CPU | Vertical scaling | Medium | 5-15 min |
| Database | 85% storage | >80% storage | Add storage / Archive old data | Low | None |
| Backend API | 200ms p95 | >500ms p95 | Horizontal scaling + caching | Medium | None |
| Frontend | 2s load time | >3s load time | Bundle optimization | Low | None |
| IPFS | 80% quota | >90% quota | Self-hosted node | Medium | None |
| Monitoring | 80% storage | >85% storage | Increase retention / Add Thanos | Medium | None |

---

## Post-Scaling Verification

After any scaling operation:

- [ ] Run load tests to verify capacity increase
- [ ] Monitor metrics for 24 hours
- [ ] Update capacity planning projections
- [ ] Document changes in runbook
- [ ] Update cost projections
- [ ] Schedule next scaling review

---

## Notes

- **Plan ahead**: Scale before hitting limits, not after
- **Test first**: Always test scaling procedures on staging
- **Monitor closely**: Watch metrics for 24-48 hours after scaling
- **Document everything**: Update runbooks and architecture docs
- **Cost awareness**: Consider cost implications of scaling decisions
