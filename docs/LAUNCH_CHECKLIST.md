# Day 1 Launch Checklist

## Pre-Launch (T-7 Days)

### Smart Contract Verification
- [ ] All contracts deployed to target networks (Ethereum, Polygon, BSC, Arbitrum, Optimism, Base)
- [ ] Contract addresses recorded in `contracts/interfaces/deploy.json`
- [ ] All contracts verified on block explorers (Etherscan, PolygonScan, etc.)
- [ ] Proxy upgrade paths tested on testnet
- [ ] Timelock delays configured (48 hours for production)
- [ ] Multi-sig wallet configured with required signers
- [ ] Emergency pause functionality tested
- [ ] Gas optimization verified (deployment < 5M gas per contract)

### Backend Infrastructure
- [ ] Production database provisioned (PostgreSQL 14+)
- [ ] Database migrations applied successfully
- [ ] Redis cache cluster configured
- [ ] Connection pooling limits set (max 100 connections)
- [ ] Database backups scheduled (hourly snapshots, daily full backups)
- [ ] SSL/TLS certificates installed and verified
- [ ] Environment variables configured in `.env`
- [ ] API keys rotated and secured in vault
- [ ] Rate limiting configured (100 req/min per IP)
- [ ] CORS policies configured for production domains

### Monitoring & Alerting
- [ ] Prometheus scraping all targets (contracts, backend, frontend)
- [ ] Grafana dashboards imported and accessible
- [ ] AlertManager configured with notification channels (Slack, PagerDuty, email)
- [ ] ELK stack ingesting logs from all services
- [ ] Critical alerts tested (contract paused, high error rate, database down)
- [ ] On-call rotation established
- [ ] Runbook links added to all alert definitions

### Frontend Deployment
- [ ] Production build tested locally (`pnpm build`)
- [ ] Environment variables configured (RPC URLs, contract addresses)
- [ ] CDN configured (Cloudflare, Vercel Edge)
- [ ] DNS records configured and propagated
- [ ] SSL certificate active
- [ ] Wallet connection tested (MetaMask, WalletConnect, Coinbase Wallet)
- [ ] Mobile responsiveness verified
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)

### Security Audit
- [ ] Smart contract audit completed by reputable firm
- [ ] All critical/high severity findings resolved
- [ ] Medium severity findings documented with mitigation plan
- [ ] Backend API penetration test completed
- [ ] Dependency vulnerabilities scanned (`pnpm audit`)
- [ ] Secrets scanning completed (no API keys in code)
- [ ] Access control policies reviewed
- [ ] Bug bounty program prepared (optional)

### Documentation
- [ ] README.md updated with production URLs
- [ ] API documentation published
- [ ] User guides created
- [ ] FAQ updated with launch-specific questions
- [ ] Support channels established (Discord, Telegram, email)
- [ ] Status page configured (status.takumi.io)

---

## Launch Day (T-0)

### Morning (8:00 AM UTC)

#### Final System Checks
- [ ] Run health check script: `./scripts/health-check.sh`
- [ ] Verify all services responding (contracts, backend, frontend)
- [ ] Check database connection pool: `SELECT count(*) FROM pg_stat_activity;`
- [ ] Verify Redis cache hit rate: `redis-cli INFO stats | grep keyspace_hits`
- [ ] Confirm monitoring dashboards showing green status
- [ ] Test transaction flow end-to-end on testnet

#### Team Readiness
- [ ] All team members online and available
- [ ] War room channel created (Slack/Discord)
- [ ] Incident response roles assigned
- [ ] Emergency contact list distributed
- [ ] Rollback procedures reviewed

### Launch Window (12:00 PM UTC)

#### Go-Live Sequence
1. [ ] **T-15 min**: Final database backup
   ```bash
   ./scripts/backup-database.sh
   ```

2. [ ] **T-10 min**: Enable monitoring alerts
   ```bash
   curl -X POST http://alertmanager:9093/-/reload
   ```

3. [ ] **T-5 min**: Verify contract ownership
   ```bash
   cast call $SKILL_PROFILE_ADDRESS "owner()" --rpc-url $RPC_URL
   ```

4. [ ] **T-0**: Deploy frontend to production
   ```bash
   vercel --prod
   ```

5. [ ] **T+2 min**: Verify DNS propagation
   ```bash
   dig takumi.io +short
   ```

6. [ ] **T+5 min**: Test first transaction on mainnet
   - Create test profile
   - Verify event emission
   - Confirm indexer processing
   - Check frontend update

7. [ ] **T+10 min**: Announce launch on social channels
   - Twitter/X announcement
   - Discord announcement
   - Blog post publication

### Post-Launch Monitoring (First 4 Hours)

#### Every 15 Minutes
- [ ] Check Grafana dashboard for anomalies
- [ ] Review error logs in Kibana
- [ ] Monitor transaction success rate (target: >99%)
- [ ] Check API response times (target: <200ms p95)
- [ ] Verify database query performance
- [ ] Monitor gas prices and adjust if needed

#### Metrics to Watch
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Transaction Success Rate | >99% | <95% |
| API Response Time (p95) | <200ms | >500ms |
| Error Rate | <0.1% | >1% |
| Database CPU | <50% | >80% |
| Redis Memory | <70% | >85% |
| Contract Gas Usage | <500k per tx | >1M per tx |

#### Common Issues & Quick Fixes

**High Error Rate**
```bash
# Check recent errors
curl http://backend:3000/api/metrics | grep error_rate

# Review logs
docker logs backend --tail 100 | grep ERROR

# If database connection issue, restart backend
pm2 restart backend
```

**Slow API Response**
```bash
# Check database slow queries
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# Clear Redis cache if stale
redis-cli FLUSHDB

# Scale backend horizontally
pm2 scale backend +2
```

**Contract Transaction Failures**
```bash
# Check contract status
cast call $SKILL_PROFILE_ADDRESS "paused()" --rpc-url $RPC_URL

# Review recent transactions
cast logs --address $SKILL_PROFILE_ADDRESS --from-block latest-100

# If gas price issue, update frontend config
# Edit src/utils/wagmiConfig.ts and increase maxFeePerGas
```

---

## End of Day 1 (8:00 PM UTC)

### Final Checks
- [ ] Review all metrics from launch window
- [ ] Document any incidents or issues encountered
- [ ] Update runbooks with lessons learned
- [ ] Verify all backups completed successfully
- [ ] Confirm monitoring alerts functioning correctly
- [ ] Schedule post-launch retrospective (within 48 hours)

### Success Criteria
- [ ] Zero critical incidents
- [ ] Transaction success rate >99%
- [ ] API uptime >99.9%
- [ ] No security incidents
- [ ] User feedback predominantly positive
- [ ] All monitoring systems operational

### Handoff to Operations Team
- [ ] Incident log shared with team
- [ ] Known issues documented in tracking system
- [ ] On-call rotation confirmed for next 7 days
- [ ] Escalation procedures reviewed
- [ ] Next day monitoring plan established

---

## Post-Launch (T+1 to T+7 Days)

### Daily Tasks
- [ ] Review previous 24h metrics
- [ ] Check for new error patterns
- [ ] Monitor user growth and transaction volume
- [ ] Verify backup integrity
- [ ] Update status page with any incidents
- [ ] Respond to user support requests

### Weekly Review (T+7)
- [ ] Analyze full week of metrics
- [ ] Identify optimization opportunities
- [ ] Review and close launch-related incidents
- [ ] Update documentation based on real-world usage
- [ ] Plan capacity scaling if needed
- [ ] Celebrate successful launch! 🎉

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Incident Commander | TBD | TBD |
| Smart Contract Lead | TBD | TBD |
| Backend Lead | TBD | TBD |
| Frontend Lead | TBD | TBD |
| DevOps Lead | TBD | TBD |
| Security Lead | TBD | TBD |

## Rollback Criteria

Initiate emergency rollback if:
- Transaction success rate drops below 90% for >15 minutes
- Critical security vulnerability discovered
- Data corruption detected
- Unrecoverable contract state
- Regulatory compliance issue

**Rollback Procedure**: See [EMERGENCY_PROCEDURES.md](./EMERGENCY_PROCEDURES.md)

---

## Notes

- This checklist should be reviewed and updated after each launch
- All checkboxes must be completed before proceeding to next phase
- Document any deviations from this checklist with justification
- Keep war room channel active for 7 days post-launch
