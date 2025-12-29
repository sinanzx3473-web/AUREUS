# Emergency Procedures Runbook

**Quick Reference Guide for Critical Incidents**

---

## 🚨 Emergency Response Framework

### Immediate Actions (First 5 Minutes)

1. **Assess Severity** - Determine incident priority (P0-P3)
2. **Alert Team** - Notify on-call and relevant teams
3. **Create War Room** - Establish communication channel
4. **Begin Mitigation** - Execute appropriate runbook
5. **Document** - Start incident timeline

### Emergency Contacts

| Role | Primary Contact | Backup | Escalation |
|------|----------------|--------|------------|
| Incident Commander | On-call DevOps | DevOps Lead | CTO |
| Smart Contract | Contract Lead | Security Team | Audit Firm |
| Backend | Backend Lead | Senior Engineer | Engineering Manager |
| Database | DBA | DevOps Lead | Infrastructure Team |
| Security | Security Lead | CISO | Legal |

**Communication Channels**:
- War Room: `#incident-war-room` (Slack)
- Status Updates: `#takumi-status`
- External: status.takumi.io

---

## 🔴 P0: Critical Incidents

### 1. Pause Smart Contract (Emergency Stop)

**When to Use**:
- Contract exploit detected
- Unusual transaction patterns
- Security vulnerability discovered
- Unauthorized access to admin functions

**Execution Time**: 2-5 minutes

#### Step-by-Step Procedure

```bash
# 1. Verify you have the correct private key
export PRIVATE_KEY="0x..."  # Admin/owner key
export RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"

# 2. Check current contract status
cast call $SKILL_PROFILE_ADDRESS "paused()" --rpc-url $RPC_URL
# Should return: false (0x0000...0000)

# 3. Verify you are the owner
cast call $SKILL_PROFILE_ADDRESS "owner()" --rpc-url $RPC_URL
# Should return your address

# 4. PAUSE THE CONTRACT
cast send $SKILL_PROFILE_ADDRESS \
  "pause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --gas-limit 100000

# 5. Verify contract is paused
cast call $SKILL_PROFILE_ADDRESS "paused()" --rpc-url $RPC_URL
# Should return: true (0x0000...0001)

# 6. Repeat for ALL networks
for network in polygon bsc arbitrum optimism base; do
  echo "Pausing on $network..."
  cast send $SKILL_PROFILE_ADDRESS \
    "pause()" \
    --private-key $PRIVATE_KEY \
    --rpc-url ${network}_RPC_URL \
    --gas-limit 100000
done
```

#### Post-Pause Actions

- [ ] Update status page: "Platform temporarily paused for maintenance"
- [ ] Notify users via Twitter/Discord
- [ ] Begin root cause analysis
- [ ] Prepare fix or mitigation strategy
- [ ] Document incident timeline

**Unpause Procedure**: See "Resume Contract Operations" below

---

### 2. Drain Contract Funds (Emergency Withdrawal)

**When to Use**:
- Critical vulnerability allows fund theft
- Contract upgrade failed and funds at risk
- Regulatory requirement to freeze assets

**⚠️ WARNING**: This is a last resort. Only use if funds are at immediate risk.

**Execution Time**: 5-10 minutes

#### Step-by-Step Procedure

```bash
# 1. Ensure contract is paused first
cast call $SKILL_PROFILE_ADDRESS "paused()" --rpc-url $RPC_URL
# Must return: true

# 2. Check contract balance
cast balance $SKILL_PROFILE_ADDRESS --rpc-url $RPC_URL

# 3. Prepare secure receiving address (multi-sig recommended)
export SAFE_ADDRESS="0x..."  # Multi-sig wallet

# 4. If contract has emergency withdraw function
cast send $SKILL_PROFILE_ADDRESS \
  "emergencyWithdraw(address)" \
  $SAFE_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# 5. If no emergency withdraw, use owner privileges
# (Depends on contract implementation)

# 6. Verify funds transferred
cast balance $SAFE_ADDRESS --rpc-url $RPC_URL
cast balance $SKILL_PROFILE_ADDRESS --rpc-url $RPC_URL
# Contract should be empty or minimal
```

#### Post-Drain Actions

- [ ] Secure funds in multi-sig cold wallet
- [ ] Document all transactions with txhash
- [ ] Notify users of fund protection measures
- [ ] Prepare recovery plan
- [ ] Engage legal counsel if needed

---

### 3. Rollback Contract Upgrade

**When to Use**:
- New contract version has critical bug
- Upgrade caused unexpected behavior
- Data corruption after upgrade

**Execution Time**: 10-20 minutes

#### Step-by-Step Procedure

```bash
# 1. Pause the contract first
cast send $SKILL_PROFILE_ADDRESS "pause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# 2. Identify previous implementation address
cast call $PROXY_ADDRESS \
  "implementation()" \
  --rpc-url $RPC_URL

# 3. Get previous implementation from deploy history
export PREVIOUS_IMPL=$(cat contracts/interfaces/deploy.json | \
  jq -r '.ethereum.SkillProfile.previousImplementation')

# 4. Execute rollback via timelock (if using timelock)
# First, queue the rollback transaction
cast send $TIMELOCK_ADDRESS \
  "schedule(address,uint256,bytes,bytes32,bytes32,uint256)" \
  $PROXY_ADDRESS \
  0 \
  $(cast calldata "upgradeTo(address)" $PREVIOUS_IMPL) \
  "0x0000000000000000000000000000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000000000000000000000000000" \
  0 \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# Wait for timelock delay (or use emergency bypass if available)

# 5. Execute the rollback
cast send $TIMELOCK_ADDRESS \
  "execute(address,uint256,bytes,bytes32,bytes32)" \
  $PROXY_ADDRESS \
  0 \
  $(cast calldata "upgradeTo(address)" $PREVIOUS_IMPL) \
  "0x0000000000000000000000000000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000000000000000000000000000" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# 6. Verify rollback successful
cast call $PROXY_ADDRESS "implementation()" --rpc-url $RPC_URL
# Should match $PREVIOUS_IMPL

# 7. Test basic functionality
cast send $SKILL_PROFILE_ADDRESS \
  "createProfile(string,string)" \
  "Test" \
  "ipfs://test" \
  --private-key $TEST_PRIVATE_KEY \
  --rpc-url $RPC_URL

# 8. Unpause if tests pass
cast send $SKILL_PROFILE_ADDRESS "unpause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

#### Alternative: Use Rollback Script

```bash
# Use automated rollback script
./scripts/emergency-rollback.sh \
  --network ethereum \
  --contract SkillProfile \
  --to-version v1.2.0

# Script will:
# - Pause contract
# - Verify previous implementation
# - Execute rollback via timelock
# - Run smoke tests
# - Unpause if successful
```

---

### 4. Database Emergency Restore

**When to Use**:
- Database corruption detected
- Accidental data deletion
- Failed migration corrupted data
- Ransomware attack

**Execution Time**: 15-60 minutes (depending on database size)

#### Step-by-Step Procedure

```bash
# 1. STOP ALL SERVICES IMMEDIATELY
pm2 stop all
docker-compose down

# 2. Identify latest good backup
ls -lh /backups/database/ | head -20

# Find backup before corruption
# Format: takumi_prod_YYYYMMDD_HHMMSS.sql.gz

# 3. Verify backup integrity
gunzip -t /backups/database/takumi_prod_20240115_120000.sql.gz
echo $?  # Should return 0 (success)

# 4. Create snapshot of current (corrupted) database
pg_dump -U takumi -d takumi_prod | gzip > /backups/corrupted_$(date +%Y%m%d_%H%M%S).sql.gz

# 5. Drop current database (⚠️ POINT OF NO RETURN)
psql -U postgres -c "DROP DATABASE takumi_prod;"

# 6. Create fresh database
psql -U postgres -c "CREATE DATABASE takumi_prod OWNER takumi;"

# 7. Restore from backup
gunzip -c /backups/database/takumi_prod_20240115_120000.sql.gz | \
  psql -U takumi -d takumi_prod

# 8. Verify restoration
psql -U takumi -d takumi_prod -c "
  SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# 9. Check row counts match expectations
psql -U takumi -d takumi_prod -c "
  SELECT 'skill_profiles' as table, COUNT(*) FROM skill_profiles
  UNION ALL
  SELECT 'skill_claims', COUNT(*) FROM skill_claims
  UNION ALL
  SELECT 'endorsements', COUNT(*) FROM endorsements;
"

# 10. Restart services
pm2 start all
docker-compose up -d

# 11. Verify application functionality
curl http://localhost:3000/health
curl http://localhost:3000/api/profiles?limit=10
```

#### Alternative: Use Restore Script

```bash
# Automated restore with safety checks
./scripts/restore-database.sh \
  --backup /backups/database/takumi_prod_20240115_120000.sql.gz \
  --verify \
  --restart-services
```

#### Data Loss Assessment

After restore, determine data loss:

```sql
-- Find latest transaction in restored database
SELECT MAX(created_at) FROM skill_profiles;
SELECT MAX(created_at) FROM skill_claims;
SELECT MAX(created_at) FROM endorsements;

-- Compare with blockchain data
-- Re-index missing transactions from blockchain
```

---

### 5. API Complete Outage

**When to Use**:
- Backend server unresponsive
- Database connection failure
- Critical dependency failure

**Execution Time**: 5-15 minutes

#### Quick Diagnosis

```bash
# 1. Check if backend is running
pm2 status

# 2. Check backend logs
pm2 logs backend --lines 100

# 3. Check database connectivity
psql -U takumi -d takumi_prod -c "SELECT 1;"

# 4. Check Redis connectivity
redis-cli ping

# 5. Check system resources
df -h        # Disk space
free -h      # Memory
top -bn1     # CPU
```

#### Common Fixes

**Backend Crashed**:
```bash
# Restart backend
pm2 restart backend

# If restart fails, check logs
pm2 logs backend --err --lines 50

# Nuclear option: delete and recreate
pm2 delete backend
cd backend && pm2 start npm --name backend -- start
```

**Database Connection Pool Exhausted**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND state_change < NOW() - INTERVAL '5 minutes';

-- Restart backend to reset connection pool
pm2 restart backend
```

**Out of Memory**:
```bash
# Check memory usage
free -h

# Identify memory hog
ps aux --sort=-%mem | head -10

# Restart services to free memory
pm2 restart all

# If critical, reboot server (last resort)
sudo reboot
```

**Disk Full**:
```bash
# Find large files
du -sh /* | sort -rh | head -10

# Clean up logs
pm2 flush
find /var/log -name "*.log" -mtime +7 -delete

# Clean up old backups
find /backups -name "*.sql.gz" -mtime +30 -delete

# Clean up Docker
docker system prune -af
```

---

## 🟡 P1: High Priority Incidents

### 6. Indexer Stopped or Lagging

**When to Use**:
- Indexer not processing new blocks
- Indexer lag >1000 blocks
- Events not appearing in database

**Execution Time**: 5-10 minutes

#### Diagnosis

```bash
# 1. Check indexer status
pm2 status indexer

# 2. Check indexer logs
pm2 logs indexer --lines 100

# 3. Check latest indexed block
curl http://localhost:3000/api/metrics | grep latest_indexed_block

# 4. Compare with current block
cast block-number --rpc-url $RPC_URL

# 5. Calculate lag
# Lag = current_block - latest_indexed_block
```

#### Common Fixes

**Indexer Crashed**:
```bash
# Restart indexer
pm2 restart indexer

# Monitor logs
pm2 logs indexer --lines 0 --follow
```

**RPC Rate Limit**:
```bash
# Check for rate limit errors in logs
pm2 logs indexer | grep -i "rate limit"

# Switch to backup RPC provider
# Edit backend/.env
ETHEREUM_RPC_URL="https://backup-rpc-provider.com"

# Restart indexer
pm2 restart indexer
```

**Database Lock**:
```sql
-- Check for blocking queries
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Kill blocking query if safe
SELECT pg_terminate_backend([blocking_pid]);
```

**Re-index from Specific Block**:
```bash
# If data corruption, re-index from last known good block
./scripts/reindex-from-block.sh --from-block 12345678 --network ethereum
```

---

### 7. High Error Rate (>10%)

**When to Use**:
- API error rate suddenly spikes
- Multiple endpoints failing
- Widespread user reports

**Execution Time**: 10-20 minutes

#### Diagnosis

```bash
# 1. Check error rate
curl http://localhost:3000/api/metrics | grep error_rate

# 2. Identify failing endpoints
pm2 logs backend | grep "ERROR" | awk '{print $5}' | sort | uniq -c | sort -rn

# 3. Check recent errors
curl http://localhost:3000/api/errors/recent

# 4. Review error logs in Kibana
# Search: level:ERROR AND @timestamp:[now-15m TO now]
```

#### Common Causes & Fixes

**Third-Party API Down**:
```bash
# Check external dependencies
curl -I https://api.pinata.cloud/data/testAuthentication
curl -I https://api.sendgrid.com/v3/mail/send

# Enable fallback or disable feature temporarily
# Edit backend/.env
ENABLE_IPFS_UPLOAD=false

pm2 restart backend
```

**Database Slow Queries**:
```sql
-- Find slow queries
SELECT 
  substring(query, 1, 100),
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing index if identified
CREATE INDEX CONCURRENTLY idx_name ON table_name(column_name);
```

**Memory Leak**:
```bash
# Check memory trend
pm2 monit

# Restart backend to free memory
pm2 restart backend

# Monitor for recurrence
watch -n 5 'pm2 status | grep backend'
```

---

## 🔵 P2: Medium Priority Incidents

### 8. Monitoring System Down

**When to Use**:
- Grafana/Prometheus unreachable
- Alerts not firing
- Metrics not being collected

**Execution Time**: 10-15 minutes

```bash
# 1. Check monitoring containers
docker ps | grep -E "(prometheus|grafana|alertmanager)"

# 2. Restart monitoring stack
cd monitoring
docker-compose restart

# 3. Verify Prometheus targets
curl http://localhost:9090/api/v1/targets

# 4. Verify Grafana
curl http://localhost:3000/api/health

# 5. Test alert firing
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"TestAlert","severity":"warning"}}]'
```

---

## Resume Normal Operations

### Unpause Smart Contract

**After incident is resolved and fix is verified**:

```bash
# 1. Verify fix is deployed and tested
# 2. Run smoke tests on testnet
# 3. Get approval from incident commander

# 4. Unpause contract
cast send $SKILL_PROFILE_ADDRESS \
  "unpause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL

# 5. Verify contract is operational
cast call $SKILL_PROFILE_ADDRESS "paused()" --rpc-url $RPC_URL
# Should return: false

# 6. Test transaction
cast send $SKILL_PROFILE_ADDRESS \
  "createProfile(string,string)" \
  "Test Recovery" \
  "ipfs://test" \
  --private-key $TEST_PRIVATE_KEY \
  --rpc-url $RPC_URL

# 7. Monitor for 15 minutes
# Watch for any errors or unusual activity

# 8. Update status page
# "All systems operational"

# 9. Notify users
# "Platform has been restored. Thank you for your patience."
```

---

## Post-Incident Procedures

### Immediate (Within 1 Hour)

- [ ] Update status page to "Resolved"
- [ ] Notify users of resolution
- [ ] Document incident timeline
- [ ] Preserve all logs and evidence
- [ ] Schedule post-mortem meeting (within 48 hours)

### Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date**: YYYY-MM-DD  
**Duration**: X hours  
**Severity**: P0/P1/P2/P3  
**Incident Commander**: [Name]

## Summary
[Brief description of what happened]

## Impact
- Users affected: X
- Transactions failed: X
- Revenue impact: $X
- Downtime: X hours

## Timeline
- HH:MM - Incident detected
- HH:MM - Team alerted
- HH:MM - Mitigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
[Technical explanation of what caused the incident]

## Resolution
[What was done to fix it]

## What Went Well
- [Item 1]
- [Item 2]

## What Went Wrong
- [Item 1]
- [Item 2]

## Action Items
- [ ] [Preventive measure 1] - Owner: [Name], Due: [Date]
- [ ] [Preventive measure 2] - Owner: [Name], Due: [Date]
- [ ] [Process improvement] - Owner: [Name], Due: [Date]

## Lessons Learned
[Key takeaways for future incidents]
```

---

## Emergency Checklist

**Before Executing Any Emergency Procedure**:

- [ ] Verify you have correct permissions and keys
- [ ] Confirm incident severity warrants emergency action
- [ ] Alert incident commander and relevant teams
- [ ] Create war room communication channel
- [ ] Begin documenting timeline
- [ ] Take snapshot/backup before making changes
- [ ] Verify commands on testnet first (if time permits)
- [ ] Have rollback plan ready

**After Executing Emergency Procedure**:

- [ ] Verify fix was successful
- [ ] Monitor for 15-30 minutes
- [ ] Update status page
- [ ] Notify users
- [ ] Document all actions taken
- [ ] Schedule post-mortem
- [ ] Update runbooks with learnings

---

## Notes

- **Practice emergency procedures** quarterly on testnet
- **Keep this runbook updated** with new procedures and learnings
- **Test backup restoration** monthly
- **Verify emergency contacts** are current
- **Review and improve** after each incident
