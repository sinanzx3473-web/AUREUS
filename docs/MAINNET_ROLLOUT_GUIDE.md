# Mainnet Gradual Rollout Guide

## Overview

This guide outlines the phased approach for deploying Takumi to mainnet, minimizing risk through gradual rollout, monitoring, and controlled user onboarding.

**CRITICAL**: This guide assumes all prerequisites from `DEPLOYMENT.md` are completed, including professional security audit sign-off.

## Rollout Philosophy

### Principles

1. **Start Small**: Begin with limited functionality and users
2. **Monitor Closely**: Watch metrics at every stage
3. **Fail Fast**: Quick rollback if issues detected
4. **Learn Continuously**: Gather feedback and iterate
5. **Scale Gradually**: Increase capacity as confidence grows

### Risk Mitigation

- **Phased Deployment**: Roll out in stages, not all at once
- **Feature Flags**: Enable/disable features without redeployment
- **Circuit Breakers**: Automatic pause on anomalies
- **Rollback Plan**: Tested procedures for quick reversion
- **Monitoring**: Real-time alerts and dashboards
- **Limited Blast Radius**: Contain failures to small user groups

## Pre-Rollout Checklist

### Security Audit Completion

- [ ] Professional audit completed by tier-1 firm
- [ ] All CRITICAL findings resolved and verified
- [ ] All HIGH findings resolved and verified
- [ ] All MEDIUM findings addressed or risk-accepted
- [ ] Final audit sign-off letter received
- [ ] Audit report published publicly

### Technical Readiness

- [ ] All tests passing (216/217 or better)
- [ ] Code coverage ≥95%
- [ ] Zero compilation errors
- [ ] Dependency vulnerabilities resolved
- [ ] Testnet running stable for 4+ weeks
- [ ] Load testing completed successfully
- [ ] Disaster recovery tested

### Infrastructure Readiness

- [ ] Production environment provisioned
- [ ] Database backups automated and tested
- [ ] Monitoring and alerting configured
- [ ] SSL/TLS certificates installed
- [ ] CDN configured
- [ ] DDoS protection enabled
- [ ] Secrets management configured
- [ ] Multi-sig wallet configured

### Operational Readiness

- [ ] Incident response plan documented
- [ ] On-call rotation established
- [ ] Runbooks created for common scenarios
- [ ] Team trained on procedures
- [ ] Communication channels established
- [ ] Status page configured
- [ ] Support system ready

### Stakeholder Sign-Offs

- [ ] Security Lead approval
- [ ] CTO approval
- [ ] CEO approval
- [ ] Legal counsel approval
- [ ] External auditor approval

## Rollout Phases

### Phase 0: Pre-Launch (Week -2 to -1)

**Objective**: Final preparation and validation

**Activities**:
1. **Deploy to Staging**
   ```bash
   # Deploy contracts to mainnet (paused state)
   cd contracts
   ./scripts/deploy.sh mainnet
   
   # Verify deployment
   cast call $SKILL_PROFILE_ADDRESS "paused()(bool)" --rpc-url $RPC_URL_MAINNET
   # Should return: true
   ```

2. **Configure Monitoring**
   ```bash
   # Deploy monitoring stack
   docker-compose -f docker-compose.monitoring.yml up -d
   
   # Verify all services healthy
   docker-compose -f docker-compose.monitoring.yml ps
   
   # Import Grafana dashboards
   # Access http://monitoring.takumi.example
   ```

3. **Final Security Checks**
   ```bash
   # Run Slither
   cd contracts
   slither . --exclude-dependencies
   
   # Run dependency audit
   cd backend && pnpm audit
   cd .. && pnpm audit
   
   # Scan for secrets
   trufflehog git file://. --only-verified
   ```

4. **Smoke Testing**
   - Test wallet connection
   - Test transaction signing (on testnet)
   - Verify API endpoints
   - Check monitoring dashboards
   - Test alert notifications

**Success Criteria**:
- All checks passing
- Monitoring operational
- Team ready
- Stakeholders aligned

**Duration**: 1-2 weeks

---

### Phase 1: Dark Launch (Week 1-2)

**Objective**: Deploy to production but keep paused, validate infrastructure

**User Access**: None (contracts paused)

**Activities**:

1. **Deploy Backend**
   ```bash
   cd backend
   
   # Build production image
   docker build -t takumi-backend:v1.0.0 .
   
   # Deploy with PM2
   pm2 start ecosystem.config.js --env production
   
   # Verify health
   curl https://api.takumi.example/health
   ```

2. **Deploy Frontend**
   ```bash
   # Build production
   pnpm run build
   
   # Deploy to Vercel
   vercel --prod
   
   # Or deploy to custom server
   scp -r dist/* user@takumi.example:/var/www/takumi
   ```

3. **Verify Contract Deployment**
   ```bash
   # Check all contracts deployed
   cast call $SKILL_PROFILE_ADDRESS "owner()(address)" --rpc-url $RPC_URL_MAINNET
   
   # Verify contracts are paused
   cast call $SKILL_PROFILE_ADDRESS "paused()(bool)" --rpc-url $RPC_URL_MAINNET
   # Should return: true
   
   # Verify on Etherscan
   open https://etherscan.io/address/$SKILL_PROFILE_ADDRESS
   ```

4. **Internal Testing**
   - Team members test full flow
   - Create profiles (contracts still paused, so use testnet)
   - Verify monitoring captures events
   - Test alert notifications
   - Validate rollback procedures

**Monitoring**:
- Infrastructure metrics (CPU, memory, disk)
- API response times
- Database performance
- Error rates (should be zero)

**Success Criteria**:
- All services healthy
- Zero errors in logs
- Monitoring working correctly
- Team confident in infrastructure

**Rollback Trigger**:
- Infrastructure failures
- Monitoring gaps
- Configuration errors

**Duration**: 1-2 weeks

---

### Phase 2: Alpha Launch (Week 3-4)

**Objective**: Unpause contracts, invite 10-20 alpha testers

**User Access**: Invite-only (10-20 users)

**Activities**:

1. **Unpause Contracts**
   ```bash
   # Unpause SkillProfile
   cast send $SKILL_PROFILE_ADDRESS \
     "unpause()" \
     --private-key $ADMIN_PRIVATE_KEY \
     --rpc-url $RPC_URL_MAINNET
   
   # Verify unpaused
   cast call $SKILL_PROFILE_ADDRESS "paused()(bool)" --rpc-url $RPC_URL_MAINNET
   # Should return: false
   
   # Unpause other contracts
   cast send $SKILL_CLAIM_ADDRESS "unpause()" --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL_MAINNET
   cast send $ENDORSEMENT_ADDRESS "unpause()" --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL_MAINNET
   ```

2. **Invite Alpha Testers**
   - Select 10-20 trusted users
   - Provide onboarding guide
   - Set up feedback channel (Discord/Slack)
   - Monitor their activity closely

3. **Enable Feature Flags**
   ```typescript
   // backend/src/config/features.ts
   export const features = {
     profileCreation: true,
     skillAddition: true,
     claimSubmission: true,
     endorsements: false,  // Not yet enabled
     advancedSearch: false,
     notifications: false
   };
   ```

4. **Daily Standups**
   - Review previous 24h metrics
   - Discuss user feedback
   - Address any issues
   - Plan next steps

**Monitoring**:
- Transaction success rate (target: >99%)
- Gas usage per transaction
- API response times (target: <200ms p95)
- Error rates (target: <0.1%)
- User feedback sentiment

**Success Criteria**:
- 10+ profiles created
- 50+ skills added
- 20+ claims submitted
- Zero critical issues
- Positive user feedback
- Transaction success rate >99%

**Rollback Trigger**:
- Transaction success rate <95%
- Critical security issue
- Data corruption
- Negative user feedback

**Duration**: 1-2 weeks

---

### Phase 3: Beta Launch (Week 5-8)

**Objective**: Expand to 100-200 beta users, enable more features

**User Access**: Invite + waitlist (100-200 users)

**Activities**:

1. **Expand User Base**
   - Invite 100-200 beta users
   - Open waitlist for public
   - Announce on social media (limited)
   - Create beta user community

2. **Enable Additional Features**
   ```typescript
   // backend/src/config/features.ts
   export const features = {
     profileCreation: true,
     skillAddition: true,
     claimSubmission: true,
     endorsements: true,      // Now enabled
     advancedSearch: true,    // Now enabled
     notifications: true,     // Now enabled
     analytics: false         // Still disabled
   };
   ```

3. **Launch Bug Bounty**
   - Activate mainnet bug bounty program
   - Announce to security community
   - Monitor submissions
   - Respond to reports promptly

4. **Optimize Performance**
   ```bash
   # Analyze slow queries
   psql -d takumi -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
   
   # Add indexes if needed
   psql -d takumi -c "CREATE INDEX idx_profiles_address ON profiles(address);"
   
   # Optimize Redis caching
   redis-cli INFO stats
   ```

5. **Weekly Reviews**
   - Analyze weekly metrics
   - Review user feedback
   - Identify optimization opportunities
   - Plan feature releases

**Monitoring**:
- All Phase 2 metrics
- User growth rate
- Feature adoption rates
- Cache hit rates
- Database query performance

**Success Criteria**:
- 100+ active users
- 500+ profiles created
- 2,000+ skills added
- 1,000+ claims submitted
- Transaction success rate >99%
- API uptime >99.9%
- Positive community sentiment

**Rollback Trigger**:
- Transaction success rate <95% for >1 hour
- Critical security vulnerability
- Database performance degradation
- Widespread user complaints

**Duration**: 3-4 weeks

---

### Phase 4: Public Launch (Week 9-12)

**Objective**: Open to public, full feature set, scale infrastructure

**User Access**: Public (unlimited)

**Activities**:

1. **Public Announcement**
   
   **Twitter/X**:
   ```
   🚀 Takumi is LIVE on Ethereum Mainnet!
   
   The decentralized skills verification platform is now open to everyone.
   
   ✅ Create your skill profile
   ✅ Get verified by experts
   ✅ Earn endorsements
   ✅ Build your reputation on-chain
   
   Start now: https://takumi.example
   
   Audited by [Audit Firm]
   Bug Bounty: $50K pool
   
   #Web3 #Blockchain #Skills #Decentralized
   ```
   
   **Blog Post**:
   - Announce launch
   - Explain platform benefits
   - Share audit results
   - Highlight security measures
   - Provide getting started guide

2. **Enable All Features**
   ```typescript
   // backend/src/config/features.ts
   export const features = {
     profileCreation: true,
     skillAddition: true,
     claimSubmission: true,
     endorsements: true,
     advancedSearch: true,
     notifications: true,
     analytics: true,         // Now enabled
     integrations: true       // Now enabled
   };
   ```

3. **Scale Infrastructure**
   ```bash
   # Scale backend horizontally
   pm2 scale backend 4
   
   # Increase database connection pool
   # Edit backend/.env
   DB_POOL_MAX=50
   
   # Add read replicas if needed
   # Configure in backend/src/config/database.ts
   
   # Enable CDN caching
   # Configure Cloudflare or similar
   ```

4. **Marketing Push**
   - Press releases
   - Social media campaign
   - Community events
   - Partnership announcements
   - Content marketing

5. **24/7 Monitoring**
   - On-call rotation active
   - Real-time dashboards
   - Automated alerts
   - Incident response ready

**Monitoring**:
- All previous metrics
- User acquisition rate
- Viral coefficient
- Revenue metrics (if applicable)
- Infrastructure costs
- Scalability metrics

**Success Criteria**:
- 1,000+ active users
- 5,000+ profiles created
- 20,000+ skills added
- 10,000+ claims submitted
- Transaction success rate >99%
- API uptime >99.9%
- Positive press coverage
- Growing community

**Rollback Trigger**:
- Same as Phase 3
- Regulatory issues
- Overwhelming demand causing outages

**Duration**: 3-4 weeks

---

### Phase 5: Growth & Optimization (Week 13+)

**Objective**: Optimize, scale, and grow user base

**User Access**: Public (unlimited)

**Activities**:

1. **Continuous Optimization**
   - Gas optimization
   - Database query optimization
   - Frontend performance
   - UX improvements

2. **Feature Development**
   - New features based on feedback
   - Integration with other platforms
   - Mobile app development
   - Advanced analytics

3. **Community Building**
   - Ambassador program
   - Developer grants
   - Hackathons
   - Educational content

4. **Business Development**
   - Partnerships
   - Enterprise features
   - Revenue streams
   - Token economics (if applicable)

**Monitoring**:
- All previous metrics
- Long-term trends
- Competitive analysis
- Market positioning

**Success Criteria**:
- Sustained growth
- High user retention
- Positive unit economics
- Strong community
- Market leadership

**Duration**: Ongoing

---

## Monitoring & Metrics

### Key Performance Indicators (KPIs)

**Technical KPIs**:
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Transaction Success Rate | >99% | <95% |
| API Response Time (p95) | <200ms | >500ms |
| API Uptime | >99.9% | <99% |
| Error Rate | <0.1% | >1% |
| Database CPU | <50% | >80% |
| Database Connections | <70% of max | >90% of max |
| Redis Memory | <70% | >85% |
| Contract Gas Usage | <500k per tx | >1M per tx |

**Business KPIs**:
| Metric | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|--------|---------|---------|---------|---------|
| Active Users | 10-20 | 100-200 | 1,000+ | 10,000+ |
| Profiles Created | 10+ | 100+ | 1,000+ | 10,000+ |
| Skills Added | 50+ | 500+ | 5,000+ | 50,000+ |
| Claims Submitted | 20+ | 200+ | 2,000+ | 20,000+ |
| Daily Active Users | 5+ | 50+ | 500+ | 5,000+ |

### Dashboards

**Grafana Dashboards**:
1. **System Overview**
   - All services health
   - Key metrics at a glance
   - Alert status

2. **Smart Contracts**
   - Transaction volume
   - Gas usage
   - Success/failure rates
   - Event emissions

3. **Backend API**
   - Request rates
   - Response times
   - Error rates
   - Endpoint performance

4. **Database**
   - Query performance
   - Connection pool usage
   - Slow queries
   - Replication lag

5. **User Metrics**
   - Active users
   - User growth
   - Feature adoption
   - Retention rates

### Alerts

**Critical Alerts** (PagerDuty + Slack):
- Contract paused unexpectedly
- Transaction success rate <95%
- API uptime <99%
- Database down
- Critical security event

**Warning Alerts** (Slack):
- Transaction success rate <99%
- API response time >500ms
- Error rate >1%
- Database CPU >80%
- Disk space <20%

**Info Alerts** (Slack):
- Deployment completed
- Backup completed
- Unusual traffic patterns
- Feature flag changes

## Rollback Procedures

### When to Rollback

**Immediate Rollback**:
- Critical security vulnerability discovered
- Transaction success rate <90% for >15 minutes
- Data corruption detected
- Unrecoverable contract state
- Regulatory compliance issue

**Planned Rollback**:
- Transaction success rate <95% for >1 hour
- Persistent errors affecting >10% of users
- Performance degradation not resolved in 2 hours
- Negative user feedback overwhelming

### Rollback Steps

**1. Pause Contracts**
```bash
# Pause all contracts immediately
cast send $SKILL_PROFILE_ADDRESS "pause()" --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL_MAINNET
cast send $SKILL_CLAIM_ADDRESS "pause()" --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL_MAINNET
cast send $ENDORSEMENT_ADDRESS "pause()" --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL_MAINNET

# Verify paused
cast call $SKILL_PROFILE_ADDRESS "paused()(bool)" --rpc-url $RPC_URL_MAINNET
```

**2. Communicate**
```bash
# Update status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth YOUR_API_KEY" \
  -d '{
    "incident": {
      "name": "Platform Maintenance",
      "status": "investigating",
      "impact_override": "major",
      "body": "We are investigating an issue and have temporarily paused the platform. Updates will be provided every 30 minutes."
    }
  }'

# Post to social media
# Twitter: "We are experiencing technical issues and have temporarily paused the platform for safety. We are investigating and will provide updates every 30 minutes. User funds are safe."

# Discord/Telegram announcement
```

**3. Investigate**
```bash
# Check recent transactions
cast logs --address $SKILL_PROFILE_ADDRESS --from-block latest-1000

# Review error logs
docker logs backend --tail 1000 | grep ERROR

# Check database
psql -d takumi -c "SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 100;"

# Review monitoring dashboards
open https://monitoring.takumi.example
```

**4. Fix or Revert**

**Option A: Quick Fix**
```bash
# If fix is simple and tested
git checkout hotfix-branch
pnpm run build
pm2 restart backend

# Test fix
curl https://api.takumi.example/health

# Unpause contracts
cast send $SKILL_PROFILE_ADDRESS "unpause()" --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL_MAINNET
```

**Option B: Full Rollback**
```bash
# Rollback backend
pm2 stop backend
git checkout previous-stable-tag
pnpm install
pnpm run build
pm2 start backend

# Rollback frontend
vercel rollback

# Rollback database (if needed)
./scripts/restore-database.sh backup-YYYYMMDD.sql.gz

# Rollback contracts (if needed - requires upgrade)
./scripts/rollback.sh mainnet
```

**5. Verify**
```bash
# Test all critical paths
./scripts/smoke-test.sh

# Check monitoring
# Verify all metrics green

# Unpause contracts
cast send $SKILL_PROFILE_ADDRESS "unpause()" --private-key $ADMIN_PRIVATE_KEY --rpc-url $RPC_URL_MAINNET
```

**6. Post-Mortem**
- Document incident timeline
- Identify root cause
- List action items
- Update runbooks
- Share learnings with team

## Communication Plan

### Channels

**Internal**:
- Slack #takumi-ops (real-time updates)
- Email (major announcements)
- Weekly all-hands (progress updates)

**External**:
- Status page (https://status.takumi.example)
- Twitter/X (@takumi)
- Discord/Telegram (community)
- Blog (detailed updates)
- Email (user notifications)

### Templates

**Incident Notification**:
```
Subject: [Takumi] Platform Maintenance in Progress

We are currently investigating a technical issue and have temporarily paused the platform as a precautionary measure.

Status: Investigating
Impact: All transactions paused
User Funds: Safe and secure

We will provide updates every 30 minutes until resolved.

Latest updates: https://status.takumi.example

Thank you for your patience.
- Takumi Team
```

**Resolution Notification**:
```
Subject: [Takumi] Platform Restored

The technical issue has been resolved and the platform is now fully operational.

Issue: [Brief description]
Duration: [X hours]
Impact: [Description]
Resolution: [What was done]

We apologize for any inconvenience. User funds were never at risk.

Post-mortem: [Link to detailed report]

Thank you for your patience and support.
- Takumi Team
```

## Success Metrics

### Phase Completion Criteria

**Phase 1 (Dark Launch)**:
- ✅ All infrastructure deployed
- ✅ Monitoring operational
- ✅ Zero errors in logs
- ✅ Team confident

**Phase 2 (Alpha)**:
- ✅ 10+ active users
- ✅ 50+ transactions
- ✅ Transaction success rate >99%
- ✅ Positive feedback

**Phase 3 (Beta)**:
- ✅ 100+ active users
- ✅ 1,000+ transactions
- ✅ Bug bounty active
- ✅ Community engaged

**Phase 4 (Public)**:
- ✅ 1,000+ active users
- ✅ 10,000+ transactions
- ✅ Press coverage
- ✅ Growing organically

**Phase 5 (Growth)**:
- ✅ 10,000+ active users
- ✅ Sustained growth
- ✅ Market leadership
- ✅ Profitable (if applicable)

## Resources

- [Deployment Guide](./DEPLOYMENT.md)
- [Testnet Deployment Guide](./TESTNET_DEPLOYMENT_GUIDE.md)
- [Bug Bounty Program](./BUG_BOUNTY_PROGRAM.md)
- [Launch Checklist](./LAUNCH_CHECKLIST.md)
- [Emergency Procedures](./EMERGENCY_PROCEDURES.md)
- [Monitoring Setup](./MONITORING_SETUP.md)

---

**Remember**: Slow and steady wins the race. It's better to launch late and stable than early and broken. 🐢🚀
