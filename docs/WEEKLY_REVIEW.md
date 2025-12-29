# Weekly Review Checklist

**Schedule**: Every Friday, 3:00 PM - 5:00 PM  
**Attendees**: Engineering team, Product, DevOps  
**Duration**: 2 hours

---

## Pre-Meeting Preparation (30 minutes before)

### Generate Weekly Reports

```bash
# Run automated weekly report
./scripts/generate-weekly-report.sh

# Export Grafana dashboards
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://monitoring.takumi.io:3000/api/dashboards/uid/takumi-main \
  > reports/grafana-weekly-$(date +%Y%m%d).json

# Export database statistics
psql -U takumi -d takumi_prod -f scripts/weekly-db-stats.sql \
  > reports/db-stats-weekly-$(date +%Y%m%d).txt
```

### Prepare Metrics Summary

Collect the following data for the past 7 days:

| Metric | This Week | Last Week | Change | Target |
|--------|-----------|-----------|--------|--------|
| Total Transactions | | | | |
| Unique Active Users | | | | |
| New Profiles Created | | | | |
| Skills Claimed | | | | |
| Endorsements Given | | | | |
| API Requests | | | | |
| Error Rate (%) | | | | <0.1% |
| API p95 Latency (ms) | | | | <200ms |
| Database Size (GB) | | | | |
| Avg Gas Cost (gwei) | | | | |

---

## Part 1: Performance Review (45 minutes)

### 1.1 Transaction Metrics Analysis (15 min)

#### Review Transaction Volume
```sql
-- Daily transaction breakdown
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_transactions,
  COUNT(DISTINCT owner) as unique_users
FROM skill_profiles
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Transaction type distribution
SELECT 
  'Profiles' as type, COUNT(*) as count FROM skill_profiles WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 'Claims', COUNT(*) FROM skill_claims WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 'Endorsements', COUNT(*) FROM endorsements WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
```

**Discussion Points**:
- [ ] Are transaction volumes growing as expected?
- [ ] Any unusual spikes or drops?
- [ ] Which features are most/least used?
- [ ] User retention trends

#### Review Transaction Success Rate
```bash
# Check failed transactions
curl http://localhost:3000/api/metrics | grep transaction_failure_rate

# Review failure reasons in logs
docker logs indexer --since 7d | grep "transaction failed" | \
  awk -F'reason:' '{print $2}' | sort | uniq -c | sort -rn
```

**Action Items**:
- [ ] Investigate any failure rate >1%
- [ ] Document common user errors for FAQ
- [ ] Optimize gas usage if costs are high

### 1.2 API Performance Analysis (15 min)

#### Response Time Trends
```bash
# Get p50, p95, p99 latencies for each endpoint
curl http://localhost:3000/api/metrics | grep http_request_duration_seconds

# Slowest endpoints this week
docker logs backend --since 7d | grep "Request completed" | \
  awk '{print $(NF-2), $NF}' | sort -k2 -rn | head -20
```

**Review in Grafana**:
- [ ] API response time trends (should be stable or improving)
- [ ] Endpoint-specific performance
- [ ] Peak load handling
- [ ] Cache hit rates

**Discussion Points**:
- [ ] Any endpoints consistently slow (>500ms)?
- [ ] Is caching effective?
- [ ] Do we need to optimize any queries?
- [ ] Should we add more indexes?

#### Error Rate Analysis
```sql
-- Top error types this week
SELECT 
  error_type,
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as affected_users
FROM error_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY error_type
ORDER BY occurrences DESC
LIMIT 20;

-- Error rate by day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as errors,
  (SELECT COUNT(*) FROM api_requests WHERE DATE(created_at) = DATE(e.created_at)) as total_requests,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM api_requests WHERE DATE(created_at) = DATE(e.created_at)) * 100, 2) as error_rate_pct
FROM error_logs e
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

**Action Items**:
- [ ] Create tickets for recurring errors
- [ ] Update error handling for common cases
- [ ] Improve error messages for users

### 1.3 Infrastructure Health (15 min)

#### Database Performance
```sql
-- Table growth this week
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS current_size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Slow queries (>1 second average)
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  ROUND(total_exec_time::numeric, 2) as total_time_ms,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_time_ms
FROM pg_stat_statements
WHERE mean_exec_time > 1000
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC
LIMIT 20;
```

**Discussion Points**:
- [ ] Any tables growing faster than expected?
- [ ] Slow queries that need optimization?
- [ ] Unused indexes to remove?
- [ ] Missing indexes to add?

#### Redis Cache Performance
```bash
# Get cache statistics
redis-cli INFO stats | grep -E "(keyspace_hits|keyspace_misses|evicted_keys)"

# Calculate hit rate
redis-cli INFO stats | awk '/keyspace_hits/{hits=$2} /keyspace_misses/{misses=$2} END{print "Hit Rate:", hits/(hits+misses)*100"%"}'

# Check memory usage
redis-cli INFO memory | grep used_memory_human
```

**Target**: Cache hit rate >80%

**Action Items**:
- [ ] Adjust cache TTLs if hit rate is low
- [ ] Increase cache size if eviction rate is high
- [ ] Review caching strategy for frequently accessed data

#### Server Resource Utilization
Review in Grafana:
- [ ] CPU usage trends (target: <70% average)
- [ ] Memory usage trends (target: <80%)
- [ ] Disk I/O patterns
- [ ] Network bandwidth usage

**Capacity Planning**:
- [ ] Estimate when current resources will be insufficient
- [ ] Plan scaling actions (vertical vs horizontal)
- [ ] Budget for infrastructure growth

---

## Part 2: Alert & Incident Review (30 minutes)

### 2.1 Alert Frequency Analysis (15 min)

```bash
# Get alert statistics from AlertManager
curl -s http://localhost:9093/api/v2/alerts | jq '
  group_by(.labels.alertname) | 
  map({
    alert: .[0].labels.alertname,
    count: length,
    severity: .[0].labels.severity
  }) | 
  sort_by(.count) | 
  reverse
'
```

**Review Each Alert Type**:
- [ ] How many times did it fire?
- [ ] Were they all legitimate?
- [ ] Any false positives to tune?
- [ ] Any missing alerts we should add?

**Alert Health Checklist**:
- [ ] Critical alerts: <5 per week (ideally 0)
- [ ] Warning alerts: <20 per week
- [ ] No alert fatigue (too many low-value alerts)
- [ ] Alert response time <15 minutes for critical

### 2.2 Incident Post-Mortems (15 min)

Review all incidents from the past week:

**For Each Incident**:
1. **What happened?** (brief description)
2. **Impact**: Users affected, duration, severity
3. **Root cause**: Technical reason
4. **Resolution**: How it was fixed
5. **Prevention**: What we'll do to prevent recurrence

**Template**:
```markdown
### Incident: [Title]
- **Date/Time**: YYYY-MM-DD HH:MM UTC
- **Duration**: X hours
- **Severity**: Critical / High / Medium / Low
- **Impact**: X users affected, Y transactions failed
- **Root Cause**: [Technical explanation]
- **Resolution**: [What fixed it]
- **Action Items**:
  - [ ] Item 1 (Owner: X, Due: DATE)
  - [ ] Item 2 (Owner: Y, Due: DATE)
```

**Discussion**:
- [ ] Are we seeing recurring issues?
- [ ] Do we need better monitoring?
- [ ] Should we update runbooks?
- [ ] Any process improvements needed?

---

## Part 3: Security & Compliance (15 minutes)

### 3.1 Security Review (10 min)

#### Access Control Audit
```bash
# Review recent authentication failures
docker logs backend --since 7d | grep "authentication failed" | wc -l

# Check for unusual access patterns
docker logs backend --since 7d | grep "rate limit exceeded" | \
  awk '{print $5}' | sort | uniq -c | sort -rn | head -10
```

**Checklist**:
- [ ] Review user access logs for anomalies
- [ ] Check for failed authentication attempts
- [ ] Verify API key rotations are on schedule
- [ ] Review rate limiting effectiveness
- [ ] Check for any security alerts from monitoring

#### Dependency Security
```bash
# Check for vulnerable dependencies
cd backend && npm audit
cd ../contracts && forge audit
cd .. && pnpm audit

# Review Dependabot alerts
gh api repos/:owner/:repo/dependabot/alerts
```

**Action Items**:
- [ ] Update any critical/high severity dependencies
- [ ] Schedule updates for medium severity issues
- [ ] Document any accepted risks

### 3.2 Compliance Check (5 min)

- [ ] Backup retention policy followed (30 days)
- [ ] Logs retained per policy (90 days)
- [ ] Data privacy requirements met
- [ ] Audit trail complete and accessible
- [ ] Incident response procedures followed

---

## Part 4: User Experience & Support (15 minutes)

### 4.1 User Feedback Analysis (10 min)

Review user feedback from:
- Support tickets
- Discord/Telegram messages
- Social media mentions
- GitHub issues

**Categorize Feedback**:
| Category | Count | Top Issues |
|----------|-------|------------|
| Bug Reports | | |
| Feature Requests | | |
| UX Complaints | | |
| Performance Issues | | |
| Documentation Gaps | | |

**Discussion**:
- [ ] Any critical user pain points?
- [ ] Quick wins we can implement?
- [ ] Features to prioritize?
- [ ] Documentation to improve?

### 4.2 Support Metrics (5 min)

```sql
-- Support ticket statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
FROM support_tickets
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status;

-- Common support topics
SELECT 
  category,
  COUNT(*) as count
FROM support_tickets
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY category
ORDER BY count DESC;
```

**Targets**:
- [ ] Average resolution time <24 hours
- [ ] First response time <4 hours
- [ ] Customer satisfaction >4.0/5.0

---

## Part 5: Planning & Action Items (15 minutes)

### 5.1 Review Last Week's Action Items (5 min)

- [ ] Go through previous week's action items
- [ ] Mark completed items
- [ ] Discuss blockers for incomplete items
- [ ] Re-prioritize or close stale items

### 5.2 This Week's Priorities (10 min)

Based on the review, identify top priorities:

**Performance Improvements**:
1. [ ] [Item] - Owner: [Name], Due: [Date]
2. [ ] [Item] - Owner: [Name], Due: [Date]

**Bug Fixes**:
1. [ ] [Item] - Owner: [Name], Due: [Date]
2. [ ] [Item] - Owner: [Name], Due: [Date]

**Infrastructure**:
1. [ ] [Item] - Owner: [Name], Due: [Date]
2. [ ] [Item] - Owner: [Name], Due: [Date]

**Documentation**:
1. [ ] [Item] - Owner: [Name], Due: [Date]

**Security**:
1. [ ] [Item] - Owner: [Name], Due: [Date]

---

## Post-Meeting Actions

### 1. Document Decisions
- [ ] Update meeting notes in wiki
- [ ] Create tickets for all action items
- [ ] Share summary with broader team

### 2. Update Dashboards
- [ ] Add any new metrics identified
- [ ] Remove obsolete metrics
- [ ] Adjust alert thresholds if needed

### 3. Schedule Follow-ups
- [ ] Book any necessary deep-dive sessions
- [ ] Schedule infrastructure scaling if needed
- [ ] Plan for next month's optimization work

---

## Monthly Deep Dive

On the last Friday of each month, extend the review to 3 hours and include:
- Detailed capacity planning
- Cost optimization review
- Roadmap alignment
- Team retrospective

See [MONTHLY_OPTIMIZATION.md](./MONTHLY_OPTIMIZATION.md) for details.

---

## Meeting Template

```markdown
# Weekly Review - [DATE]

## Attendees
- [Name] - [Role]
- [Name] - [Role]

## Metrics Summary
[Paste metrics table]

## Performance Highlights
- ✅ [Positive item]
- ⚠️ [Concern item]

## Incidents This Week
- [List incidents or "None"]

## Action Items from Last Week
- [x] Completed item
- [ ] In progress item

## New Action Items
1. [ ] [Item] - Owner: [Name], Due: [Date]
2. [ ] [Item] - Owner: [Name], Due: [Date]

## Next Week's Focus
- [Priority 1]
- [Priority 2]
- [Priority 3]

## Notes
[Any additional discussion points]
```

---

## Automation Checklist

Consider automating:
- [ ] Weekly metrics report generation
- [ ] Grafana dashboard exports
- [ ] Database statistics collection
- [ ] Alert frequency analysis
- [ ] Support ticket summaries
- [ ] Meeting notes template creation

---

## Success Criteria

A successful weekly review should:
- ✅ Identify and address performance degradations
- ✅ Catch potential issues before they become critical
- ✅ Maintain or improve key metrics week-over-week
- ✅ Generate actionable items with clear owners
- ✅ Keep team aligned on priorities
- ✅ Complete within 2 hours

---

## Notes

- Adjust agenda based on team needs and priorities
- Focus on trends, not just point-in-time metrics
- Celebrate wins and improvements
- Be honest about challenges and blockers
- Update this template as processes evolve
