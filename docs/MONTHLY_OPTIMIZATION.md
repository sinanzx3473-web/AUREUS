# Monthly Optimization Procedures

**Schedule**: Last Friday of each month, 2:00 PM - 5:00 PM  
**Attendees**: Engineering, DevOps, Product, Finance  
**Duration**: 3 hours

---

## Pre-Meeting Preparation (1 week before)

### Generate Monthly Reports

```bash
# Run comprehensive monthly report
./scripts/generate-monthly-report.sh

# Export all Grafana dashboards
for dashboard in takumi-main takumi-contracts takumi-database; do
  curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
    "http://monitoring.takumi.io:3000/api/dashboards/uid/$dashboard" \
    > "reports/grafana-${dashboard}-$(date +%Y%m).json"
done

# Generate cost analysis report
./scripts/analyze-monthly-costs.sh > reports/cost-analysis-$(date +%Y%m).txt

# Database growth analysis
psql -U takumi -d takumi_prod -f scripts/monthly-db-analysis.sql \
  > reports/db-analysis-$(date +%Y%m).txt
```

### Collect Monthly Metrics

| Category | Metric | This Month | Last Month | 3-Month Avg | YoY |
|----------|--------|------------|------------|-------------|-----|
| **Users** | Total Active Users | | | | |
| | New Users | | | | |
| | Retained Users (%) | | | | |
| | Churned Users | | | | |
| **Transactions** | Total Transactions | | | | |
| | Avg Daily Transactions | | | | |
| | Peak Daily Transactions | | | | |
| | Transaction Success Rate | | | | |
| **Performance** | Avg API Latency (p95) | | | | |
| | Error Rate (%) | | | | |
| | Uptime (%) | | | | |
| **Infrastructure** | Database Size (GB) | | | | |
| | Monthly Growth (GB) | | | | |
| | Avg CPU Usage (%) | | | | |
| | Avg Memory Usage (%) | | | | |
| **Costs** | Infrastructure Costs | | | | |
| | Gas Costs (ETH) | | | | |
| | Cost per Transaction | | | | |
| | Cost per User | | | | |

---

## Part 1: Gas Cost Optimization (45 minutes)

### 1.1 Gas Usage Analysis (20 min)

#### Review Monthly Gas Consumption
```bash
# Get gas usage by contract
cast logs --from-block $(date -d "1 month ago" +%s) \
  --to-block latest \
  --address $SKILL_PROFILE_ADDRESS \
  | jq '.[] | {hash: .transactionHash, gasUsed: .gasUsed}' \
  | jq -s 'group_by(.hash) | map({tx: .[0].hash, gas: (map(.gasUsed | tonumber) | add)})'

# Calculate average gas per transaction type
```

**Analyze by Function**:
```solidity
// Expected gas costs (update based on actual data)
createProfile()      : ~150,000 gas
claimSkill()        : ~100,000 gas
endorseSkill()      : ~80,000 gas
updateProfile()     : ~50,000 gas
```

**Discussion Points**:
- [ ] Are gas costs within expected ranges?
- [ ] Any functions using excessive gas?
- [ ] Impact of recent network gas price changes?
- [ ] Opportunities for optimization?

#### Gas Optimization Opportunities

**Storage Optimization**:
```solidity
// Review storage layout
// Identify:
// - Unused storage slots
// - Inefficient packing
// - Redundant data
```

**Batch Operations**:
- [ ] Can we batch multiple operations?
- [ ] Would multicall reduce costs?
- [ ] Are there patterns of sequential transactions?

**Code Optimization**:
```bash
# Run gas profiler on contracts
forge test --gas-report

# Compare with previous month
diff reports/gas-report-$(date -d "1 month ago" +%Y%m).txt \
     reports/gas-report-$(date +%Y%m).txt
```

**Action Items**:
- [ ] Optimize functions using >200k gas
- [ ] Implement batching for common patterns
- [ ] Consider L2 deployment for high-frequency operations
- [ ] Update gas estimates in frontend

### 1.2 Network Cost Analysis (15 min)

#### Multi-Chain Cost Comparison
```bash
# Calculate average transaction cost per network
for network in ethereum polygon bsc arbitrum optimism base; do
  echo "=== $network ==="
  # Get average gas price
  # Calculate USD cost per transaction
  # Compare with last month
done
```

**Cost Comparison Table**:
| Network | Avg Gas Price | Avg Tx Cost (USD) | Monthly Volume | Total Cost |
|---------|---------------|-------------------|----------------|------------|
| Ethereum | | | | |
| Polygon | | | | |
| BSC | | | | |
| Arbitrum | | | | |
| Optimism | | | | |
| Base | | | | |

**Discussion**:
- [ ] Should we prioritize certain networks?
- [ ] Are users migrating to cheaper networks?
- [ ] Should we adjust our multi-chain strategy?

### 1.3 Gas Subsidy Strategy (10 min)

If offering gas subsidies:
- [ ] Review subsidy budget vs actual spend
- [ ] Analyze subsidy effectiveness (user acquisition)
- [ ] Identify abuse or inefficient usage
- [ ] Adjust subsidy limits if needed

```sql
-- Analyze subsidized transactions
SELECT 
  user_address,
  COUNT(*) as subsidized_txs,
  SUM(gas_cost_usd) as total_subsidy
FROM transactions
WHERE subsidized = true
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_address
ORDER BY total_subsidy DESC
LIMIT 50;
```

---

## Part 2: Database Query Optimization (45 minutes)

### 2.1 Query Performance Review (20 min)

#### Identify Slow Queries
```sql
-- Top 20 slowest queries this month
SELECT 
  queryid,
  substring(query, 1, 100) as query_preview,
  calls,
  ROUND(total_exec_time::numeric / 1000, 2) as total_time_sec,
  ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
  ROUND(max_exec_time::numeric, 2) as max_time_ms,
  ROUND((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) as pct_total_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
  AND calls > 100
ORDER BY total_exec_time DESC
LIMIT 20;

-- Queries with high variance (unpredictable performance)
SELECT 
  queryid,
  substring(query, 1, 100) as query_preview,
  calls,
  ROUND(mean_exec_time::numeric, 2) as avg_ms,
  ROUND(stddev_exec_time::numeric, 2) as stddev_ms,
  ROUND((stddev_exec_time / NULLIF(mean_exec_time, 0))::numeric, 2) as coefficient_of_variation
FROM pg_stat_statements
WHERE calls > 100
  AND stddev_exec_time > mean_exec_time
ORDER BY coefficient_of_variation DESC
LIMIT 20;
```

#### Analyze Query Plans
For each slow query:
```sql
-- Get actual query from queryid
SELECT query FROM pg_stat_statements WHERE queryid = [ID];

-- Analyze execution plan
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
[PASTE QUERY HERE];
```

**Look for**:
- Sequential scans on large tables
- Missing indexes
- Inefficient joins
- Unnecessary sorting
- High buffer usage

### 2.2 Index Optimization (15 min)

#### Review Index Usage
```sql
-- Unused indexes (candidates for removal)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Duplicate indexes
SELECT 
  pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) as size,
  (array_agg(idx))[1] as idx1,
  (array_agg(idx))[2] as idx2,
  (array_agg(idx))[3] as idx3,
  (array_agg(idx))[4] as idx4
FROM (
  SELECT 
    indexrelid::regclass as idx,
    (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
     COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) as key
  FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;

-- Index bloat
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### Missing Index Analysis
```sql
-- Tables with high sequential scan counts
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / NULLIF(seq_scan, 0) as avg_seq_tup_read,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

**Action Items**:
- [ ] Remove unused indexes (save space, improve write performance)
- [ ] Add missing indexes for frequent queries
- [ ] Consider partial indexes for filtered queries
- [ ] Schedule index maintenance (REINDEX)

### 2.3 Table Maintenance (10 min)

#### Vacuum and Analyze Status
```sql
-- Tables needing vacuum
SELECT 
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  n_dead_tup,
  n_live_tup,
  ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_tup_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- Table bloat estimate
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Maintenance Tasks**:
```bash
# Schedule vacuum during low-traffic window
psql -U takumi -d takumi_prod -c "VACUUM ANALYZE;"

# For heavily bloated tables, consider VACUUM FULL (requires downtime)
# psql -U takumi -d takumi_prod -c "VACUUM FULL [table_name];"

# Update table statistics
psql -U takumi -d takumi_prod -c "ANALYZE;"
```

---

## Part 3: Capacity Planning (45 minutes)

### 3.1 Growth Projections (20 min)

#### Database Growth Analysis
```sql
-- Historical growth data
SELECT 
  date_trunc('week', timestamp) as week,
  pg_size_pretty(AVG(size_bytes)::bigint) as avg_size,
  pg_size_pretty(MAX(size_bytes)::bigint) as max_size
FROM database_size_history
WHERE timestamp >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY week
ORDER BY week;

-- Project future growth
WITH growth_rate AS (
  SELECT 
    (MAX(size_bytes) - MIN(size_bytes)) / 
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) * 86400 as bytes_per_day
  FROM database_size_history
  WHERE timestamp >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
  pg_size_pretty((SELECT bytes_per_day FROM growth_rate) * 30) as projected_monthly_growth,
  pg_size_pretty((SELECT bytes_per_day FROM growth_rate) * 365) as projected_yearly_growth;
```

**Growth Projections**:
| Resource | Current | 3-Month Projection | 6-Month Projection | 12-Month Projection |
|----------|---------|-------------------|-------------------|---------------------|
| Database Size | | | | |
| Daily Transactions | | | | |
| Active Users | | | | |
| API Requests | | | | |
| Storage (IPFS) | | | | |

#### Capacity Thresholds
```bash
# Current resource utilization
df -h /var/lib/postgresql  # Database disk
free -h                     # Memory
top -bn1 | grep "Cpu(s)"   # CPU

# Calculate time to capacity limits
# Database: 80% of provisioned storage
# Memory: 85% of available RAM
# CPU: 75% sustained usage
```

**Discussion**:
- [ ] When will we hit capacity limits?
- [ ] What's our scaling strategy?
- [ ] Vertical vs horizontal scaling?
- [ ] Cost implications?

### 3.2 Scaling Strategy (15 min)

#### Database Scaling Options

**Vertical Scaling** (increase instance size):
- Pros: Simple, no code changes
- Cons: Expensive, eventual limits
- Timeline: Can be done in hours
- Cost: $X → $Y per month

**Horizontal Scaling** (read replicas):
- Pros: Better read performance, high availability
- Cons: Eventual consistency, code changes needed
- Timeline: 1-2 weeks implementation
- Cost: +$X per replica per month

**Partitioning** (table partitioning):
- Pros: Better query performance, easier archival
- Cons: Complex migration, query changes
- Timeline: 2-4 weeks implementation
- Cost: Minimal additional cost

**Recommendation**: [Choose based on current needs]

#### API Scaling Options

**Current Setup**:
- Single backend instance
- PM2 cluster mode (4 workers)
- No load balancer

**Scaling Options**:
1. **Increase PM2 workers**: Quick, limited by single server
2. **Add backend instances**: Requires load balancer, better redundancy
3. **Implement caching layer**: Reduce database load, improve response times
4. **Use CDN for static content**: Reduce server load

**Recommendation**: [Choose based on bottlenecks]

### 3.3 Archival Strategy (10 min)

#### Data Retention Policy
```sql
-- Identify old data candidates for archival
SELECT 
  'skill_profiles' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE updated_at < CURRENT_DATE - INTERVAL '1 year') as old_rows,
  pg_size_pretty(pg_total_relation_size('skill_profiles')) as table_size
FROM skill_profiles
UNION ALL
SELECT 
  'skill_claims',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at < CURRENT_DATE - INTERVAL '1 year'),
  pg_size_pretty(pg_total_relation_size('skill_claims'))
FROM skill_claims
UNION ALL
SELECT 
  'endorsements',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at < CURRENT_DATE - INTERVAL '1 year'),
  pg_size_pretty(pg_total_relation_size('endorsements'))
FROM endorsements;
```

**Archival Candidates**:
- [ ] Inactive profiles (no activity >1 year)
- [ ] Old transaction logs (>6 months)
- [ ] Expired notifications (>90 days)
- [ ] Old error logs (>90 days)

**Archival Process**:
1. Export to cold storage (S3 Glacier)
2. Verify export integrity
3. Delete from production database
4. Document archival in metadata table

```bash
# Archive old data
./scripts/archive-old-data.sh --table skill_profiles --older-than "1 year"
```

---

## Part 4: Cost Optimization (30 minutes)

### 4.1 Infrastructure Cost Analysis (15 min)

#### Monthly Cost Breakdown
```bash
# Generate cost report
./scripts/analyze-monthly-costs.sh

# Expected output:
# === Infrastructure Costs ===
# Database (RDS): $XXX
# Backend (EC2): $XXX
# Redis (ElastiCache): $XXX
# Monitoring (EC2): $XXX
# Storage (S3): $XXX
# CDN (CloudFront): $XXX
# Total: $XXX
#
# === Blockchain Costs ===
# Gas Fees (Ethereum): $XXX
# Gas Fees (Polygon): $XXX
# Gas Fees (Other): $XXX
# Total: $XXX
#
# === Third-Party Services ===
# IPFS (Pinata): $XXX
# Email (SendGrid): $XXX
# Monitoring (Datadog): $XXX
# Total: $XXX
#
# === Grand Total: $XXX ===
```

**Cost per Metric**:
- Cost per transaction: $X.XX
- Cost per active user: $X.XX
- Cost per API request: $X.XX

**Trends**:
- [ ] Are costs growing faster than usage?
- [ ] Any unexpected cost spikes?
- [ ] Opportunities for optimization?

#### Cost Optimization Opportunities

**Database**:
- [ ] Right-size instance (currently over/under-provisioned?)
- [ ] Use reserved instances (save 30-50%)
- [ ] Optimize storage (delete old data, compress)
- [ ] Review backup retention (reduce backup storage costs)

**Compute**:
- [ ] Use spot instances for non-critical workloads
- [ ] Implement auto-scaling (scale down during low traffic)
- [ ] Optimize container images (smaller = faster = cheaper)
- [ ] Review instance types (newer generations often cheaper)

**Storage**:
- [ ] Implement lifecycle policies (move old data to cheaper tiers)
- [ ] Compress large files
- [ ] Delete unused files
- [ ] Review IPFS pinning costs

**Networking**:
- [ ] Optimize CDN usage (cache more aggressively)
- [ ] Reduce data transfer (compress responses)
- [ ] Use regional endpoints where possible

**Third-Party Services**:
- [ ] Review usage vs plan limits
- [ ] Negotiate volume discounts
- [ ] Consider alternatives for expensive services

### 4.2 Gas Cost Optimization (10 min)

See Part 1 for detailed gas optimization.

**Quick Wins**:
- [ ] Deploy to L2s for high-frequency operations
- [ ] Batch transactions where possible
- [ ] Optimize contract code (see Part 1.1)
- [ ] Use gas tokens during high gas price periods
- [ ] Implement gas price monitoring and transaction queuing

### 4.3 ROI Analysis (5 min)

**Calculate Return on Investment**:
```
Monthly Revenue: $XXX
Monthly Costs: $XXX
Monthly Profit: $XXX
Profit Margin: XX%

Cost per User Acquisition: $XX
Lifetime Value per User: $XX
LTV/CAC Ratio: X.X
```

**Discussion**:
- [ ] Are we profitable?
- [ ] What's our path to profitability?
- [ ] Where should we invest for growth?
- [ ] What costs can we cut without impacting quality?

---

## Part 5: Action Planning (15 minutes)

### 5.1 Prioritize Optimizations (10 min)

**Impact vs Effort Matrix**:

| Optimization | Impact | Effort | Priority | Owner | Deadline |
|--------------|--------|--------|----------|-------|----------|
| [Item 1] | High | Low | P0 | | |
| [Item 2] | High | Medium | P1 | | |
| [Item 3] | Medium | Low | P1 | | |
| [Item 4] | Low | High | P3 | | |

**This Month's Focus**:
1. [ ] [High impact, low effort item]
2. [ ] [High impact, medium effort item]
3. [ ] [Medium impact, low effort item]

### 5.2 Set Goals for Next Month (5 min)

**Performance Goals**:
- [ ] Reduce API p95 latency to <XXms
- [ ] Improve transaction success rate to >XX%
- [ ] Reduce error rate to <X%

**Cost Goals**:
- [ ] Reduce infrastructure costs by X%
- [ ] Reduce gas costs by X%
- [ ] Improve cost per transaction to $X.XX

**Capacity Goals**:
- [ ] Prepare for XX% user growth
- [ ] Scale database to handle XX transactions/day
- [ ] Implement archival for XX GB of old data

---

## Post-Meeting Actions

### 1. Document Decisions
```bash
# Create monthly optimization report
cat > reports/optimization-$(date +%Y%m).md << EOF
# Monthly Optimization Report - $(date +%B\ %Y)

## Summary
[Brief overview of key findings and decisions]

## Gas Optimization
[Summary of gas optimization actions]

## Database Optimization
[Summary of database optimization actions]

## Capacity Planning
[Summary of capacity planning decisions]

## Cost Optimization
[Summary of cost optimization actions]

## Action Items
[List of prioritized action items with owners and deadlines]

## Next Month's Goals
[List of goals for next month]
EOF
```

### 2. Implement Quick Wins
- [ ] Execute low-effort, high-impact optimizations immediately
- [ ] Schedule larger optimization projects
- [ ] Update monitoring dashboards with new metrics

### 3. Schedule Follow-ups
- [ ] Book capacity planning review (if scaling needed)
- [ ] Schedule database maintenance window
- [ ] Plan contract upgrade (if gas optimization requires it)

---

## Quarterly Deep Dive

Every 3 months, extend this review to include:
- Architecture review and refactoring opportunities
- Technology stack evaluation
- Competitive analysis
- Long-term roadmap alignment
- Team skills and training needs

---

## Success Metrics

A successful monthly optimization should:
- ✅ Identify and plan for capacity needs 3-6 months ahead
- ✅ Reduce costs by 5-10% through optimizations
- ✅ Improve performance metrics month-over-month
- ✅ Maintain or improve system reliability
- ✅ Generate clear, actionable optimization roadmap

---

## Notes

- Focus on data-driven decisions
- Balance cost optimization with performance and reliability
- Don't optimize prematurely - focus on bottlenecks
- Document all optimization attempts and results
- Update this template based on learnings
