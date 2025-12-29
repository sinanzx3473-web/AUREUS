# Emergency Procedures & Runbooks

## Overview

This document outlines emergency procedures for critical incidents affecting the Takumi platform. All procedures are designed for rapid response while maintaining security and data integrity.

## Emergency Contacts

**On-Call Rotation**
- Primary: DevOps Team (Slack: #takumi-oncall)
- Secondary: Backend Team (Slack: #takumi-backend)
- Escalation: CTO (emergency-only phone)

**External Contacts**
- Infrastructure Provider: AWS Support
- Security Team: security@takumi.io
- Legal/Compliance: legal@takumi.io

## Severity Levels

### P0 - Critical (Response: Immediate)
- Complete service outage
- Data breach or security incident
- Smart contract exploit
- Database corruption

### P1 - High (Response: <15 minutes)
- Partial service degradation
- API error rate >10%
- Indexer stopped or lagging >1000 blocks
- Authentication system failure

### P2 - Medium (Response: <1 hour)
- Non-critical feature failure
- Performance degradation
- Monitoring alert failures
- Third-party service issues

### P3 - Low (Response: <4 hours)
- Minor bugs
- Documentation issues
- Non-urgent improvements

---

## Smart Contract Emergency Procedures

### 🚨 PROCEDURE: Contract Exploit Detected

**Trigger**: Unusual contract activity, security alert, or user report

**Immediate Actions (0-5 minutes)**

1. **Activate Emergency Pause**
   ```bash
   # Connect to production environment
   cd contracts
   
   # Pause all contracts immediately
   forge script script/EmergencyPause.s.sol \
     --rpc-url $RPC_URL_MAINNET \
     --private-key $EMERGENCY_ADMIN_KEY \
     --broadcast
   ```

2. **Notify Stakeholders**
   ```bash
   # Send emergency notification
   curl -X POST https://api.slack.com/webhooks/EMERGENCY \
     -d '{"text": "🚨 EMERGENCY: Smart contracts paused due to security incident"}'
   ```

3. **Assess Damage**
   - Check contract balances
   - Review recent transactions
   - Identify affected users
   - Estimate financial impact

**Investigation (5-30 minutes)**

4. **Gather Evidence**
   ```bash
   # Export recent transactions
   cast logs --from-block $INCIDENT_BLOCK \
     --address $CONTRACT_ADDRESS \
     --rpc-url $RPC_URL > incident_logs.json
   
   # Analyze transaction traces
   cast run $EXPLOIT_TX_HASH --rpc-url $RPC_URL
   ```

5. **Root Cause Analysis**
   - Review contract code for vulnerability
   - Check if exploit is reproducible
   - Determine attack vector
   - Assess other contracts for same vulnerability

**Mitigation (30 minutes - 2 hours)**

6. **Deploy Fix**
   ```bash
   # If using upgradeable contracts
   forge script script/Upgrade.s.sol \
     --rpc-url $RPC_URL_MAINNET \
     --private-key $EMERGENCY_ADMIN_KEY \
     --broadcast \
     --verify
   ```

7. **Verify Fix**
   ```bash
   # Run comprehensive test suite
   forge test --match-contract SecurityTest -vvv
   
   # Attempt to reproduce exploit
   forge test --match-test testExploitMitigation
   ```

8. **Resume Operations**
   ```bash
   # Unpause contracts after verification
   forge script script/EmergencyUnpause.s.sol \
     --rpc-url $RPC_URL_MAINNET \
     --private-key $EMERGENCY_ADMIN_KEY \
     --broadcast
   ```

**Post-Incident (2-24 hours)**

9. **User Communication**
   - Publish incident report
   - Notify affected users
   - Outline compensation plan if applicable

10. **Post-Mortem**
    - Document timeline
    - Identify prevention measures
    - Update security procedures
    - Schedule security audit

---

### 🔄 PROCEDURE: Emergency Contract Upgrade

**When to Use**: Critical bug fix, security patch, or urgent feature deployment

**Prerequisites**
- Contracts must be upgradeable (UUPS pattern)
- Admin must have `DEFAULT_ADMIN_ROLE`
- New implementation must be audited

**Steps**

1. **Prepare New Implementation**
   ```bash
   # Compile new implementation
   forge build
   
   # Run full test suite
   forge test
   
   # Generate storage layout diff
   forge inspect src/SkillProfile.sol:SkillProfile storage-layout > new_layout.json
   diff old_layout.json new_layout.json
   ```

2. **Deploy to Testnet First**
   ```bash
   # Deploy to Sepolia
   forge script script/Upgrade.s.sol \
     --rpc-url $RPC_URL_SEPOLIA \
     --private-key $TESTNET_ADMIN_KEY \
     --broadcast
   
   # Verify upgrade successful
   cast call $PROXY_ADDRESS "version()" --rpc-url $RPC_URL_SEPOLIA
   ```

3. **Production Upgrade**
   ```bash
   # Pause contracts during upgrade
   forge script script/EmergencyPause.s.sol \
     --rpc-url $RPC_URL_MAINNET \
     --private-key $EMERGENCY_ADMIN_KEY \
     --broadcast
   
   # Deploy new implementation
   forge script script/Upgrade.s.sol \
     --rpc-url $RPC_URL_MAINNET \
     --private-key $EMERGENCY_ADMIN_KEY \
     --broadcast \
     --verify
   
   # Verify upgrade
   cast call $PROXY_ADDRESS "version()" --rpc-url $RPC_URL_MAINNET
   
   # Unpause contracts
   forge script script/EmergencyUnpause.s.sol \
     --rpc-url $RPC_URL_MAINNET \
     --private-key $EMERGENCY_ADMIN_KEY \
     --broadcast
   ```

4. **Monitoring**
   ```bash
   # Watch for errors in next 100 blocks
   cast logs --from-block latest \
     --address $CONTRACT_ADDRESS \
     --rpc-url $RPC_URL_MAINNET \
     --follow
   ```

---

## Backend Emergency Procedures

### 🚨 PROCEDURE: API Service Down

**Trigger**: Health check failures, 503 errors, or monitoring alerts

**Immediate Actions (0-2 minutes)**

1. **Check Service Status**
   ```bash
   # Check if backend is running
   docker ps | grep takumi-backend
   
   # Check logs for errors
   docker logs takumi-backend --tail 100
   
   # Check health endpoint
   curl http://localhost:3001/health
   ```

2. **Quick Restart**
   ```bash
   # Restart backend service
   docker-compose restart backend
   
   # Verify service is up
   curl http://localhost:3001/health
   ```

**If Restart Fails (2-10 minutes)**

3. **Check Dependencies**
   ```bash
   # Check database connection
   docker exec takumi-postgres pg_isready
   
   # Check Redis connection
   docker exec takumi-redis redis-cli ping
   
   # Check disk space
   df -h
   ```

4. **Rebuild and Redeploy**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Rebuild containers
   docker-compose build backend
   
   # Restart with fresh containers
   docker-compose up -d backend
   ```

5. **Rollback if Needed**
   ```bash
   # Rollback to previous version
   ./scripts/rollback.sh
   
   # Verify rollback successful
   curl http://localhost:3001/health
   ```

---

### 🚨 PROCEDURE: Database Connection Failure

**Trigger**: Database connection errors, query timeouts

**Immediate Actions (0-5 minutes)**

1. **Check Database Status**
   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres
   
   # Check database logs
   docker logs takumi-postgres --tail 100
   
   # Test connection
   docker exec takumi-postgres psql -U takumi -c "SELECT 1"
   ```

2. **Restart Database**
   ```bash
   # Restart PostgreSQL
   docker-compose restart postgres
   
   # Wait for database to be ready
   docker exec takumi-postgres pg_isready
   ```

**If Database Corruption Detected (5-30 minutes)**

3. **Restore from Backup**
   ```bash
   # Stop backend to prevent writes
   docker-compose stop backend
   
   # Restore latest backup
   docker exec takumi-postgres pg_restore \
     -U takumi -d takumi \
     /backups/takumi_latest.dump
   
   # Verify data integrity
   docker exec takumi-postgres psql -U takumi -c "
     SELECT COUNT(*) FROM profiles;
     SELECT COUNT(*) FROM skills;
     SELECT COUNT(*) FROM endorsements;
   "
   
   # Restart backend
   docker-compose start backend
   ```

---

### 🚨 PROCEDURE: Indexer Service Failure

**Trigger**: Indexer stopped, block lag >1000, no events indexed

**Immediate Actions (0-5 minutes)**

1. **Check Indexer Status**
   ```bash
   # Check indexer logs
   docker logs takumi-backend | grep indexer
   
   # Check current block height
   curl http://localhost:3001/metrics/indexer
   ```

2. **Restart Indexer**
   ```bash
   # Restart backend (includes indexer)
   docker-compose restart backend
   
   # Monitor indexer startup
   docker logs -f takumi-backend | grep indexer
   ```

**If RPC Issues Detected (5-15 minutes)**

3. **Switch RPC Provider**
   ```bash
   # Update RPC URL in environment
   echo "RPC_URL_SEPOLIA=https://backup-rpc-url.com" >> backend/.env
   
   # Restart backend
   docker-compose restart backend
   ```

4. **Manual Resync**
   ```bash
   # Reset indexer state to resync from specific block
   docker exec takumi-postgres psql -U takumi -c "
     UPDATE indexer_state 
     SET last_synced_block = $SAFE_BLOCK_NUMBER 
     WHERE chain = 'sepolia';
   "
   
   # Restart indexer
   docker-compose restart backend
   ```

---

## Database Emergency Procedures

### 🚨 PROCEDURE: Database Backup & Restore

**Regular Backups (Automated)**

```bash
# Backup script (runs daily via cron)
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
docker exec takumi-postgres pg_dump -U takumi takumi \
  > $BACKUP_DIR/takumi_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/takumi_$TIMESTAMP.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/takumi_$TIMESTAMP.sql.gz \
  s3://takumi-backups/database/

# Keep only last 30 days locally
find $BACKUP_DIR -name "takumi_*.sql.gz" -mtime +30 -delete
```

**Emergency Restore**

```bash
# Download latest backup from S3
aws s3 cp s3://takumi-backups/database/takumi_latest.sql.gz /tmp/

# Decompress
gunzip /tmp/takumi_latest.sql.gz

# Stop backend
docker-compose stop backend

# Drop and recreate database
docker exec takumi-postgres psql -U postgres -c "
  DROP DATABASE IF EXISTS takumi;
  CREATE DATABASE takumi;
"

# Restore backup
docker exec -i takumi-postgres psql -U takumi takumi \
  < /tmp/takumi_latest.sql

# Restart backend
docker-compose start backend
```

---

## Monitoring & Alerting Emergency Procedures

### 🚨 PROCEDURE: Alert Storm

**Trigger**: >100 alerts in 5 minutes

**Immediate Actions**

1. **Silence Non-Critical Alerts**
   ```bash
   # Silence all warning-level alerts for 1 hour
   curl -X POST http://alertmanager:9093/api/v1/silences \
     -d '{
       "matchers": [{"name": "severity", "value": "warning"}],
       "startsAt": "now",
       "endsAt": "+1h",
       "createdBy": "oncall",
       "comment": "Alert storm - investigating critical issues first"
     }'
   ```

2. **Focus on Critical Alerts**
   - Identify root cause alert
   - Address critical issues first
   - Document incident timeline

3. **Restore Normal Alerting**
   ```bash
   # Remove silences after resolution
   curl -X DELETE http://alertmanager:9093/api/v1/silence/$SILENCE_ID
   ```

---

## Communication Templates

### Critical Incident Notification

```
🚨 CRITICAL INCIDENT ALERT

Status: INVESTIGATING
Severity: P0
Impact: [Service/Feature] unavailable
Started: [Timestamp]
ETA: [Estimated resolution time]

We are investigating [brief description]. 
Updates will be posted every 15 minutes.

Status page: https://status.takumi.io
```

### Incident Resolution

```
✅ INCIDENT RESOLVED

The incident affecting [service] has been resolved.
Duration: [X hours Y minutes]
Root cause: [Brief explanation]

Full post-mortem will be published within 48 hours.
We apologize for the disruption.
```

---

## Post-Incident Checklist

- [ ] Incident timeline documented
- [ ] Root cause identified
- [ ] Fix verified in production
- [ ] Monitoring alerts updated
- [ ] Runbook updated with lessons learned
- [ ] Post-mortem scheduled (within 48 hours)
- [ ] User communication sent
- [ ] Compensation plan executed (if applicable)
- [ ] Prevention measures implemented
- [ ] Team debrief completed

---

## Emergency Access

### Production Access

**Smart Contracts**
- Emergency admin key stored in hardware wallet
- Requires 2-of-3 multisig for critical operations
- Access logs audited weekly

**Backend Infrastructure**
- SSH access via bastion host only
- MFA required for all production access
- Session recording enabled

**Database**
- Read-only access for on-call engineers
- Write access requires approval
- All queries logged and audited

### Key Rotation

**After Emergency Use**
1. Rotate all keys used during incident
2. Update key management system
3. Notify security team
4. Document key usage in incident report

---

## Testing Emergency Procedures

**Quarterly Drills**
- Simulate contract exploit
- Practice database restore
- Test alert escalation
- Verify communication channels

**Annual Disaster Recovery**
- Full system restore from backups
- Multi-region failover test
- Complete incident response simulation

---

## Appendix: Quick Reference

### Critical Commands

```bash
# Pause all contracts
forge script script/EmergencyPause.s.sol --broadcast

# Restart all services
docker-compose restart

# Check service health
curl http://localhost:3001/health

# View recent logs
docker-compose logs --tail=100 -f

# Database backup
docker exec takumi-postgres pg_dump -U takumi takumi > backup.sql

# Rollback deployment
./scripts/rollback.sh
```

### Monitoring URLs

- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Kibana: http://localhost:5601

### Emergency Contacts

- On-Call: #takumi-oncall (Slack)
- Security: security@takumi.io
- Infrastructure: ops@takumi.io
