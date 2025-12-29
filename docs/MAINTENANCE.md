# Takumi Platform Maintenance Guide

## Table of Contents
- [Overview](#overview)
- [Backup & Recovery](#backup--recovery)
- [Scaling Procedures](#scaling-procedures)
- [Database Maintenance](#database-maintenance)
- [Smart Contract Maintenance](#smart-contract-maintenance)
- [Monitoring & Alerts](#monitoring--alerts)
- [Performance Optimization](#performance-optimization)
- [Security Updates](#security-updates)
- [Disaster Recovery](#disaster-recovery)

## Overview

This guide covers routine maintenance, scaling, and operational procedures for the Takumi platform.

### Maintenance Schedule

| Task | Frequency | Script/Tool |
|------|-----------|-------------|
| Database backup | Daily | `scripts/automated-backup.sh` |
| Contract snapshot | Daily | `scripts/snapshot-contracts.sh` |
| Log rotation | Weekly | `logrotate` |
| Security updates | Weekly | Manual review |
| Performance review | Monthly | Grafana dashboards |
| Disaster recovery drill | Quarterly | Manual |

## Backup & Recovery

### Automated Backups

Configure automated daily backups using cron:

```bash
# Add to crontab
0 2 * * * /path/to/takumi/scripts/automated-backup.sh

# With cloud backup enabled
CLOUD_BACKUP=true S3_BUCKET=takumi-backups /path/to/takumi/scripts/automated-backup.sh
```

### Manual Database Backup

```bash
# Create database backup
./scripts/backup-database.sh

# Backup to specific location
BACKUP_DIR=/custom/path ./scripts/backup-database.sh

# With custom retention
RETENTION_DAYS=60 ./scripts/backup-database.sh
```

### Database Restore

```bash
# List available backups
./scripts/restore-database.sh

# Restore from specific backup
./scripts/restore-database.sh /var/backups/takumi/database/takumi_db_20240115_020000.sql.gz

# Restore with custom database
DB_NAME=takumi_test ./scripts/restore-database.sh backup.sql.gz
```

### Contract Snapshots

```bash
# Create contract snapshot
./scripts/snapshot-contracts.sh

# Snapshot for specific network
NETWORK=polygon ./scripts/snapshot-contracts.sh

# Restore contract snapshot
./scripts/restore-contracts.sh /var/backups/takumi/contracts/contract_snapshot_20240115_020000.tar.gz
```

### Backup Verification

Regularly verify backup integrity:

```bash
# Verify database backup checksum
sha256sum -c /var/backups/takumi/database/takumi_db_20240115_020000.sql.gz.sha256

# Test restore to staging environment
DB_NAME=takumi_staging ./scripts/restore-database.sh backup.sql.gz
```

## Scaling Procedures

### Horizontal Scaling

#### Backend API Scaling

1. **Add new backend instances:**
```bash
# Update docker-compose.yml
services:
  backend-1:
    build: ./backend
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=backend-1
  
  backend-2:
    build: ./backend
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=backend-2
```

2. **Configure load balancer:**
```nginx
upstream backend {
  least_conn;
  server backend-1:3000;
  server backend-2:3000;
  server backend-3:3000;
}

server {
  location /api {
    proxy_pass http://backend;
  }
}
```

3. **Update health checks:**
```bash
# Add health check monitoring
curl -f http://backend-1:3000/health || exit 1
curl -f http://backend-2:3000/health || exit 1
```

#### Database Scaling

**Read Replicas:**

```bash
# Configure PostgreSQL streaming replication
# On primary:
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64

# On replica:
primary_conninfo = 'host=primary port=5432 user=replicator'
hot_standby = on
```

**Connection Pooling:**

```bash
# Install PgBouncer
apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
takumi = host=localhost port=5432 dbname=takumi

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

### Vertical Scaling

#### Database Resources

```bash
# Increase PostgreSQL memory
# Edit postgresql.conf
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB

# Restart PostgreSQL
systemctl restart postgresql
```

#### Backend Resources

```bash
# Update docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### Auto-Scaling Configuration

```yaml
# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: takumi-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: takumi-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Database Maintenance

### Routine Maintenance

```bash
# Vacuum and analyze
psql -U postgres -d takumi -c "VACUUM ANALYZE;"

# Reindex
psql -U postgres -d takumi -c "REINDEX DATABASE takumi;"

# Update statistics
psql -U postgres -d takumi -c "ANALYZE;"
```

### Performance Monitoring

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

### Index Optimization

```sql
-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_profiles_owner ON profiles(owner);
CREATE INDEX CONCURRENTLY idx_skills_claimer ON skills(claimer);
CREATE INDEX CONCURRENTLY idx_endorsements_endorser ON endorsements(endorser);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_unused_index;
```

### Connection Management

```sql
-- Check active connections
SELECT 
  datname,
  count(*) as connections
FROM pg_stat_activity
GROUP BY datname;

-- Terminate idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < now() - interval '1 hour';
```

## Smart Contract Maintenance

### Contract Upgrades

```bash
# Test upgrade on testnet
cd contracts
forge script script/Upgrade.s.sol --rpc-url sepolia --broadcast

# Verify upgrade
forge verify-contract <new_implementation> src/SkillProfile.sol:SkillProfile --chain sepolia

# Deploy to mainnet
forge script script/Upgrade.s.sol --rpc-url polygon --broadcast --verify
```

### State Verification

```bash
# Export contract state
cast call <contract_address> "getProfile(address)" <user_address> --rpc-url polygon

# Verify storage slots
cast storage <contract_address> <slot> --rpc-url polygon

# Check implementation address
cast call <proxy_address> "implementation()" --rpc-url polygon
```

### Gas Optimization

```bash
# Run gas report
forge test --gas-report

# Optimize contract
forge build --optimize --optimizer-runs 200

# Compare gas usage
forge snapshot --diff
```

## Monitoring & Alerts

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Database health
pg_isready -h localhost -p 5432

# Redis health
redis-cli ping

# Contract health (check latest block)
cast block-number --rpc-url polygon
```

### Alert Configuration

```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack'

receivers:
- name: 'slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#takumi-alerts'
    title: 'Takumi Alert'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

### Custom Metrics

```typescript
// Add custom metrics to backend
import { register, Counter, Histogram } from 'prom-client';

const profileCreations = new Counter({
  name: 'takumi_profile_creations_total',
  help: 'Total number of profile creations'
});

const apiLatency = new Histogram({
  name: 'takumi_api_latency_seconds',
  help: 'API endpoint latency',
  labelNames: ['method', 'route', 'status']
});
```

## Performance Optimization

### Database Optimization

```sql
-- Partition large tables
CREATE TABLE skills_partitioned (
  LIKE skills INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE skills_2024_q1 PARTITION OF skills_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- Materialized views for analytics
CREATE MATERIALIZED VIEW skill_stats AS
SELECT 
  skill_name,
  COUNT(*) as total_claims,
  COUNT(CASE WHEN status = 1 THEN 1 END) as approved_claims
FROM skills
GROUP BY skill_name;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY skill_stats;
```

### Caching Strategy

```typescript
// Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis();

async function getProfile(address: string) {
  const cacheKey = `profile:${address}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Fetch from database
  const profile = await db.query('SELECT * FROM profiles WHERE owner = $1', [address]);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(profile));
  
  return profile;
}
```

### CDN Configuration

```nginx
# Nginx caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# API response caching
location /api/public {
  proxy_cache api_cache;
  proxy_cache_valid 200 5m;
  proxy_cache_key "$scheme$request_method$host$request_uri";
  add_header X-Cache-Status $upstream_cache_status;
}
```

## Security Updates

### Dependency Updates

```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update

# Update smart contract dependencies
cd contracts
forge update
```

### Security Scanning

```bash
# Scan smart contracts
slither contracts/src/

# Scan Docker images
docker scan takumi-backend:latest

# Scan dependencies
npm audit --audit-level=moderate
```

### SSL Certificate Renewal

```bash
# Renew Let's Encrypt certificates
certbot renew --dry-run
certbot renew

# Reload nginx
systemctl reload nginx
```

## Disaster Recovery

### Recovery Time Objectives (RTO)

| Component | RTO | RPO |
|-----------|-----|-----|
| Database | 1 hour | 24 hours |
| Backend API | 30 minutes | N/A |
| Smart Contracts | N/A | N/A (immutable) |
| Frontend | 15 minutes | N/A |

### Disaster Recovery Procedures

#### Complete System Failure

1. **Assess damage:**
```bash
# Check system status
systemctl status postgresql
systemctl status docker
docker ps -a
```

2. **Restore database:**
```bash
# Restore from latest backup
./scripts/restore-database.sh /var/backups/takumi/database/latest.sql.gz
```

3. **Restore contract metadata:**
```bash
# Restore contract snapshots
./scripts/restore-contracts.sh /var/backups/takumi/contracts/latest.tar.gz
```

4. **Restart services:**
```bash
# Restart all services
docker-compose down
docker-compose up -d

# Verify services
curl http://localhost:3000/health
```

5. **Verify data integrity:**
```bash
# Check database
psql -U postgres -d takumi -c "SELECT COUNT(*) FROM profiles;"

# Check contract state
cast call <contract_address> "totalProfiles()" --rpc-url polygon
```

#### Data Corruption

1. **Identify corruption:**
```sql
-- Check for inconsistencies
SELECT * FROM profiles WHERE owner IS NULL;
SELECT * FROM skills WHERE claimer NOT IN (SELECT owner FROM profiles);
```

2. **Restore from backup:**
```bash
# Restore to point before corruption
./scripts/restore-database.sh /var/backups/takumi/database/backup_before_corruption.sql.gz
```

3. **Replay transactions:**
```bash
# Re-index blockchain events from specific block
INDEXER_START_BLOCK=12345678 npm run indexer
```

### Failover Procedures

```bash
# Promote read replica to primary
pg_ctl promote -D /var/lib/postgresql/data

# Update application configuration
export DB_HOST=new-primary-host
docker-compose restart backend

# Verify failover
psql -h new-primary-host -U postgres -c "SELECT pg_is_in_recovery();"
```

## Maintenance Checklist

### Daily
- [ ] Check automated backup logs
- [ ] Review error logs
- [ ] Monitor disk space
- [ ] Check API response times

### Weekly
- [ ] Review security alerts
- [ ] Update dependencies
- [ ] Analyze slow queries
- [ ] Review Grafana dashboards

### Monthly
- [ ] Performance review
- [ ] Capacity planning
- [ ] Security audit
- [ ] Update documentation

### Quarterly
- [ ] Disaster recovery drill
- [ ] Contract upgrade review
- [ ] Infrastructure review
- [ ] Cost optimization

## Support & Escalation

### Contact Information

- **DevOps Team:** devops@takumi.io
- **Security Team:** security@takumi.io
- **On-call:** +1-XXX-XXX-XXXX

### Escalation Matrix

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| P0 (Critical) | 15 minutes | CTO |
| P1 (High) | 1 hour | Engineering Lead |
| P2 (Medium) | 4 hours | Team Lead |
| P3 (Low) | 24 hours | Developer |

## Additional Resources

- [Deployment Guide](DEPLOYMENT.md)
- [Security Guide](SECURITY.md)
- [Emergency Procedures](EMERGENCY_PROCEDURES.md)
- [Architecture Overview](ARCHITECTURE.md)
