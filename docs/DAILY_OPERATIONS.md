# Daily Monitoring Procedures

## Morning Routine (9:00 AM Local Time)

### 1. System Health Check (15 minutes)

#### Check Monitoring Dashboards
Access Grafana at `http://monitoring.takumi.io:3000`

**Main Dashboard Review**:
- [ ] Overall system status (all services green)
- [ ] Transaction volume last 24h (compare to 7-day average)
- [ ] Error rate <0.1%
- [ ] API response time p95 <200ms
- [ ] Database CPU <60%
- [ ] Redis memory usage <75%

```bash
# Quick CLI health check
./scripts/health-check.sh

# Expected output:
# ✓ Smart Contracts: Healthy
# ✓ Backend API: Healthy
# ✓ Database: Healthy
# ✓ Redis: Healthy
# ✓ Frontend: Healthy
```

#### Review Active Alerts
Check AlertManager at `http://monitoring.takumi.io:9093`

- [ ] No critical alerts firing
- [ ] Review any warning-level alerts
- [ ] Acknowledge and assign any new alerts
- [ ] Verify on-call rotation is current

```bash
# List active alerts via CLI
curl -s http://localhost:9093/api/v2/alerts | jq '.[] | select(.status.state=="active")'
```

### 2. Transaction Flow Verification (10 minutes)

#### Verify Event Processing
Check that blockchain events are being indexed correctly:

```bash
# Check latest indexed block
curl http://localhost:3000/api/metrics | grep latest_indexed_block

# Compare with current block on chain
cast block-number --rpc-url $ETHEREUM_RPC_URL

# Lag should be <10 blocks
```

#### Test End-to-End Flow
Perform a test transaction on testnet:

- [ ] Create a test skill profile
- [ ] Verify event emission in block explorer
- [ ] Confirm indexer processed event (check logs)
- [ ] Verify profile appears in frontend
- [ ] Check API returns correct data

```bash
# Monitor indexer logs for test transaction
docker logs indexer --tail 50 --follow | grep "ProfileCreated"
```

### 3. Database Health (10 minutes)

#### Check Database Metrics
```sql
-- Connect to database
psql -h localhost -U takumi -d takumi_prod

-- Check active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
-- Should be <50 during normal operation

-- Check slow queries (>1 second)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';
-- Unused indexes should be investigated
```

#### Verify Backups
- [ ] Check last backup timestamp
- [ ] Verify backup file size is reasonable
- [ ] Test restore on staging environment (weekly)

```bash
# List recent backups
ls -lh /backups/database/ | head -10

# Check backup age
find /backups/database/ -name "*.sql.gz" -mtime -1 | wc -l
# Should return at least 24 (hourly backups)
```

### 4. Application Logs Review (15 minutes)

#### Check Error Logs in Kibana
Access Kibana at `http://monitoring.takumi.io:5601`

**Search Queries**:
```
# Critical errors in last 24h
level:ERROR AND @timestamp:[now-24h TO now]

# Failed transactions
message:"transaction failed" AND @timestamp:[now-24h TO now]

# Authentication failures
message:"authentication failed" AND @timestamp:[now-24h TO now]

# Rate limit hits
message:"rate limit exceeded" AND @timestamp:[now-24h TO now]
```

#### Review Top Error Messages
- [ ] Identify any new error patterns
- [ ] Check if errors are user-caused or system issues
- [ ] Create tickets for recurring system errors
- [ ] Update FAQ if user errors are common

```bash
# Quick CLI log check for backend
docker logs backend --since 24h | grep ERROR | sort | uniq -c | sort -rn | head -10

# Check for contract revert reasons
docker logs indexer --since 24h | grep "revert" | tail -20
```

---

## Midday Check (1:00 PM Local Time)

### Quick Status Review (5 minutes)

- [ ] Check Grafana main dashboard
- [ ] Verify no new critical alerts
- [ ] Review transaction volume (compare to morning)
- [ ] Check API error rate trend

```bash
# Quick metrics snapshot
curl -s http://localhost:3000/api/metrics | grep -E "(request_count|error_rate|response_time)"
```

---

## Afternoon Routine (4:00 PM Local Time)

### 1. Performance Analysis (15 minutes)

#### API Performance
```bash
# Check API endpoint performance
curl http://localhost:3000/api/metrics | grep http_request_duration

# Top 10 slowest endpoints
docker logs backend --since 24h | grep "Request completed" | \
  awk '{print $NF, $(NF-2)}' | sort -rn | head -10
```

#### Database Query Performance
```sql
-- Top 10 slowest queries today
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Queries with high I/O
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  shared_blks_hit,
  shared_blks_read,
  shared_blks_read / NULLIF(shared_blks_hit + shared_blks_read, 0)::float as cache_miss_ratio
FROM pg_stat_statements
WHERE shared_blks_read > 1000
ORDER BY cache_miss_ratio DESC
LIMIT 10;
```

### 2. Capacity Planning Check (10 minutes)

#### Resource Utilization Trends
- [ ] Database storage growth rate
- [ ] Redis memory trend
- [ ] API request volume trend
- [ ] Transaction gas cost trend

```bash
# Database size growth
psql -U takumi -d takumi_prod -c "
SELECT 
  pg_size_pretty(pg_database_size('takumi_prod')) as current_size,
  (SELECT pg_size_pretty(size) FROM database_size_history ORDER BY timestamp DESC LIMIT 1 OFFSET 7) as size_7d_ago
"

# Calculate daily growth rate
# If growth >10GB/day, plan for scaling
```

### 3. User Activity Review (10 minutes)

#### Check User Metrics
```sql
-- New profiles created today
SELECT COUNT(*) FROM skill_profiles 
WHERE created_at >= CURRENT_DATE;

-- Active users today (made any transaction)
SELECT COUNT(DISTINCT owner) FROM skill_profiles 
WHERE updated_at >= CURRENT_DATE;

-- Top skills claimed today
SELECT skill_name, COUNT(*) as claims
FROM skill_claims
WHERE created_at >= CURRENT_DATE
GROUP BY skill_name
ORDER BY claims DESC
LIMIT 10;

-- Endorsement activity
SELECT COUNT(*) FROM endorsements
WHERE created_at >= CURRENT_DATE;
```

---

## End of Day Routine (6:00 PM Local Time)

### 1. Daily Summary Report (15 minutes)

Generate and review daily metrics report:

```bash
# Run daily report script
./scripts/generate-daily-report.sh

# Report includes:
# - Total transactions processed
# - Error rate summary
# - API performance metrics
# - Database growth
# - Top errors
# - User activity summary
```

**Key Metrics to Document**:
| Metric | Today | Yesterday | 7-Day Avg | Status |
|--------|-------|-----------|-----------|--------|
| Transactions | | | | |
| Error Rate | | | | |
| API p95 Latency | | | | |
| New Profiles | | | | |
| Active Users | | | | |
| Database Size | | | | |

### 2. Incident Review (10 minutes)

- [ ] Review any incidents from today
- [ ] Update incident tickets with resolution
- [ ] Document lessons learned
- [ ] Update runbooks if needed
- [ ] Schedule follow-up tasks for tomorrow

### 3. Prepare for Tomorrow (5 minutes)

- [ ] Check scheduled maintenance windows
- [ ] Review on-call schedule
- [ ] Flag any concerning trends for deeper investigation
- [ ] Update team in daily standup channel

```markdown
## Daily Summary - [DATE]

**System Status**: 🟢 Healthy / 🟡 Degraded / 🔴 Critical

**Key Metrics**:
- Transactions: X,XXX (±X% vs yesterday)
- Error Rate: 0.0X%
- API p95: XXXms
- New Users: XXX

**Incidents**: None / [Brief description]

**Action Items**:
- [ ] Item 1
- [ ] Item 2

**Notes**: [Any observations or concerns]
```

---

## Weekly Deep Dive (Friday 3:00 PM)

See [WEEKLY_REVIEW.md](./WEEKLY_REVIEW.md) for detailed weekly procedures.

---

## Escalation Procedures

### When to Escalate

**Immediate Escalation** (page on-call):
- Transaction success rate <95% for >10 minutes
- API error rate >5% for >5 minutes
- Database down or unresponsive
- Security incident detected
- Contract paused unexpectedly

**Standard Escalation** (notify team):
- Error rate >1% for >30 minutes
- API p95 latency >500ms for >30 minutes
- Backup failure
- Monitoring system down
- Unusual user activity pattern

### Escalation Contacts

1. **On-Call Engineer**: Check PagerDuty rotation
2. **Team Lead**: [Contact info]
3. **Incident Commander**: [Contact info]
4. **Security Team**: security@takumi.io

---

## Automation Opportunities

Consider automating these daily checks:
- [ ] Health check script runs automatically every hour
- [ ] Daily summary report emailed to team
- [ ] Backup verification automated
- [ ] Slow query alerts configured
- [ ] Capacity planning dashboard created
- [ ] User activity report automated

---

## Checklist Summary

**Morning** (30 min):
- ✓ System health check
- ✓ Transaction flow verification
- ✓ Database health
- ✓ Log review

**Midday** (5 min):
- ✓ Quick status check

**Afternoon** (35 min):
- ✓ Performance analysis
- ✓ Capacity planning
- ✓ User activity review

**End of Day** (30 min):
- ✓ Daily summary report
- ✓ Incident review
- ✓ Prepare for tomorrow

**Total Time**: ~100 minutes/day

---

## Notes

- Adjust timing based on your team's timezone and peak usage hours
- Automate repetitive tasks to reduce manual effort
- Document any deviations or issues in daily summary
- Update this runbook as processes evolve
