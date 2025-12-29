# Disaster Recovery Test Plan

## Overview

This document outlines the comprehensive disaster recovery test procedure for the Takumi platform. Tests should be conducted quarterly to ensure backup and recovery procedures are effective.

## Test Schedule

**Frequency**: Quarterly (Q4 of each year - December)  
**Duration**: 4-8 hours  
**Environment**: Isolated staging environment  
**Participants**: DevOps team, Security team, Engineering lead

## Pre-Test Preparation

### 1 Week Before Test

- [ ] Schedule test date/time with all participants
- [ ] Notify stakeholders of planned test
- [ ] Provision isolated staging environment
- [ ] Verify backup systems are operational
- [ ] Document current production state
- [ ] Prepare test scenario documentation
- [ ] Set up monitoring for test environment

### 1 Day Before Test

- [ ] Create fresh production backups:
  - Database backup
  - Contract deployment snapshots
  - Configuration files
  - Environment variables (encrypted)
- [ ] Verify backup integrity
- [ ] Prepare rollback procedures
- [ ] Set up communication channels (Slack war room)
- [ ] Prepare metrics tracking sheet

## Test Scenarios

### Scenario 1: Complete Database Loss

**Objective**: Restore full database from backup

**Steps**:

1. **Simulate Disaster** (in staging):
   ```bash
   # Drop staging database
   psql $STAGING_DATABASE_URL -c "DROP DATABASE takumi_staging;"
   ```

2. **Detect and Assess**:
   - [ ] Monitoring alerts fire (DatabaseConnectionFailure)
   - [ ] Team acknowledges alert
   - [ ] Severity assessed as P0
   - [ ] Record time-to-detect (TTD)

3. **Restore Database**:
   ```bash
   # List available backups
   ls -lh /var/backups/takumi/database/
   
   # Restore from most recent backup
   ./scripts/restore-database.sh /var/backups/takumi/database/takumi_db_YYYYMMDD_HHMMSS.sql.gz
   
   # Verify restoration
   psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM profiles;"
   psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM skills;"
   psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM endorsements;"
   ```

4. **Validate Data Integrity**:
   ```bash
   # Run data integrity checks
   psql $STAGING_DATABASE_URL -f scripts/verify-data-integrity.sql
   
   # Compare record counts with pre-disaster snapshot
   # Expected: All counts match within acceptable delta
   ```

5. **Test Application Functionality**:
   - [ ] API health check passes
   - [ ] User authentication works
   - [ ] Profile creation works
   - [ ] Skill claims work
   - [ ] Endorsements work
   - [ ] Search functionality works

6. **Record Metrics**:
   - Time-to-detect: _____ minutes
   - Time-to-restore: _____ minutes
   - Data loss: _____ records (should be 0 or minimal)
   - Downtime: _____ minutes

**Success Criteria**:
- ✅ Database restored within 30 minutes
- ✅ Data integrity verified (0 corruption)
- ✅ All core functionality operational
- ✅ Data loss < 5 minutes (RPO)

---

### Scenario 2: Smart Contract Rollback

**Objective**: Rollback to previous contract version after failed upgrade

**Steps**:

1. **Simulate Failed Upgrade** (in staging):
   ```bash
   # Deploy intentionally broken contract
   cd contracts
   PROXY_ADDRESS=$STAGING_PROXY \
   NEW_IMPLEMENTATION=$BROKEN_IMPL \
   forge script script/Upgrade.s.sol --broadcast --rpc-url $STAGING_RPC
   ```

2. **Detect Issue**:
   - [ ] Contract transaction failures spike
   - [ ] Alert: HighContractFailureRate fires
   - [ ] Team investigates and confirms bad upgrade
   - [ ] Record time-to-detect

3. **Execute Emergency Rollback**:
   ```bash
   # Restore from contract snapshot
   ./scripts/restore-contracts.sh
   
   # Verify previous implementation restored
   cast call $STAGING_PROXY "implementation()" --rpc-url $STAGING_RPC
   ```

4. **Validate Contract State**:
   ```bash
   # Test contract functions
   cast call $STAGING_PROXY "getProfile(address)" $TEST_ADDRESS --rpc-url $STAGING_RPC
   
   # Verify state integrity
   # Compare on-chain state with pre-upgrade snapshot
   ```

5. **Test Contract Interactions**:
   - [ ] Profile creation works
   - [ ] Skill claims work
   - [ ] Endorsements work
   - [ ] Events emit correctly
   - [ ] Gas costs are normal

6. **Record Metrics**:
   - Time-to-detect: _____ minutes
   - Time-to-rollback: _____ minutes
   - Failed transactions: _____ count
   - State corruption: Yes/No

**Success Criteria**:
- ✅ Rollback completed within 15 minutes
- ✅ Contract state preserved
- ✅ All contract functions operational
- ✅ No permanent state corruption

---

### Scenario 3: Complete Infrastructure Failure

**Objective**: Failover to backup infrastructure

**Steps**:

1. **Simulate Infrastructure Failure**:
   ```bash
   # Shut down all services in staging
   docker-compose down
   pm2 stop all
   ```

2. **Detect Outage**:
   - [ ] Multiple alerts fire (APIDown, DatabaseConnectionFailure, etc.)
   - [ ] Team acknowledges critical outage
   - [ ] Record time-to-detect

3. **Activate Backup Infrastructure**:
   ```bash
   # Start services on backup server
   ssh backup-server
   cd /opt/takumi
   
   # Restore database
   ./scripts/restore-database.sh /var/backups/takumi/database/latest.sql.gz
   
   # Start services
   docker-compose up -d
   # OR
   pm2 start ecosystem.config.js
   ```

4. **Update DNS/Load Balancer**:
   ```bash
   # Point traffic to backup infrastructure
   # (Simulated in staging - document steps)
   
   # Verify new endpoint responds
   curl https://staging-backup.takumi.example/health
   ```

5. **Validate Full System**:
   - [ ] All services healthy
   - [ ] Database accessible
   - [ ] Redis accessible
   - [ ] Monitoring operational
   - [ ] API endpoints responding
   - [ ] Frontend loads correctly

6. **Record Metrics**:
   - Time-to-detect: _____ minutes
   - Time-to-failover: _____ minutes
   - Total downtime: _____ minutes
   - Data loss: _____ minutes

**Success Criteria**:
- ✅ Failover completed within 1 hour
- ✅ All services operational on backup infrastructure
- ✅ Data loss < 15 minutes (RPO)
- ✅ RTO (Recovery Time Objective) < 2 hours

---

### Scenario 4: Backup Corruption Detection

**Objective**: Identify and handle corrupted backups

**Steps**:

1. **Simulate Corrupted Backup**:
   ```bash
   # Create intentionally corrupted backup file
   dd if=/dev/urandom of=/var/backups/takumi/database/corrupted.sql.gz bs=1M count=10
   ```

2. **Attempt Restoration**:
   ```bash
   # Try to restore corrupted backup
   ./scripts/restore-database.sh /var/backups/takumi/database/corrupted.sql.gz
   
   # Expected: Restoration fails with error
   ```

3. **Detect Corruption**:
   - [ ] Restoration script detects corruption
   - [ ] Alert: BackupCorrupted fires
   - [ ] Team investigates backup integrity

4. **Fallback to Previous Backup**:
   ```bash
   # List available backups
   ls -lht /var/backups/takumi/database/
   
   # Restore from previous valid backup
   ./scripts/restore-database.sh /var/backups/takumi/database/takumi_db_PREVIOUS.sql.gz
   ```

5. **Verify Backup Integrity Process**:
   ```bash
   # Run backup verification script
   ./scripts/verify-backups.sh
   
   # Check backup checksums
   sha256sum /var/backups/takumi/database/*.sql.gz
   ```

6. **Record Metrics**:
   - Corrupted backups detected: _____ count
   - Time to identify corruption: _____ minutes
   - Time to restore from valid backup: _____ minutes
   - Data loss from using older backup: _____ hours

**Success Criteria**:
- ✅ Corruption detected automatically
- ✅ Fallback to previous backup successful
- ✅ Backup verification process effective
- ✅ Data loss minimized

---

## Post-Test Activities

### Immediate (within 1 hour)

- [ ] Restore staging environment to normal state
- [ ] Document all test results
- [ ] Calculate and record all metrics
- [ ] Identify any failures or issues
- [ ] Create incident tickets for issues found

### Within 48 Hours

- [ ] Conduct post-test review meeting
- [ ] Complete test report (use template below)
- [ ] Create action items for improvements
- [ ] Update disaster recovery procedures
- [ ] Update backup/restore scripts if needed
- [ ] Share results with stakeholders

### Within 1 Week

- [ ] Implement critical improvements
- [ ] Update documentation
- [ ] Schedule follow-up for action items
- [ ] Update RTO/RPO targets if needed

## Test Report Template

```markdown
# Disaster Recovery Test Report

**Test Date**: YYYY-MM-DD  
**Test Duration**: X hours  
**Participants**: [List of participants]  
**Environment**: Staging

## Executive Summary

[Brief overview of test results - pass/fail, key findings]

## Test Results

### Scenario 1: Complete Database Loss
- **Status**: ✅ Pass / ❌ Fail
- **TTD**: ___ minutes (Target: < 5 min)
- **Time to Restore**: ___ minutes (Target: < 30 min)
- **Data Loss**: ___ records (Target: 0)
- **Issues**: [List any issues]

### Scenario 2: Smart Contract Rollback
- **Status**: ✅ Pass / ❌ Fail
- **TTD**: ___ minutes (Target: < 5 min)
- **Time to Rollback**: ___ minutes (Target: < 15 min)
- **State Corruption**: Yes/No
- **Issues**: [List any issues]

### Scenario 3: Complete Infrastructure Failure
- **Status**: ✅ Pass / ❌ Fail
- **TTD**: ___ minutes (Target: < 5 min)
- **Time to Failover**: ___ minutes (Target: < 60 min)
- **Total Downtime**: ___ minutes (Target: < 120 min)
- **Issues**: [List any issues]

### Scenario 4: Backup Corruption Detection
- **Status**: ✅ Pass / ❌ Fail
- **Corruption Detected**: Yes/No
- **Fallback Successful**: Yes/No
- **Data Loss**: ___ hours
- **Issues**: [List any issues]

## Metrics Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Database Restore Time | < 30 min | ___ min | ✅/❌ |
| Contract Rollback Time | < 15 min | ___ min | ✅/❌ |
| Infrastructure Failover | < 60 min | ___ min | ✅/❌ |
| Total Test Duration | 4-8 hours | ___ hours | ✅/❌ |
| Data Loss (RPO) | < 15 min | ___ min | ✅/❌ |
| Recovery Time (RTO) | < 2 hours | ___ hours | ✅/❌ |

## Issues Identified

1. **Issue 1**: [Description]
   - **Severity**: Critical/High/Medium/Low
   - **Impact**: [Impact description]
   - **Action Item**: [Remediation plan]
   - **Owner**: [Assigned to]
   - **Due Date**: [Date]

2. **Issue 2**: [Description]
   - ...

## Lessons Learned

### What Went Well
- [Positive finding 1]
- [Positive finding 2]

### What Needs Improvement
- [Improvement area 1]
- [Improvement area 2]

## Action Items

| Action | Owner | Due Date | Priority | Status |
|--------|-------|----------|----------|--------|
| [Action 1] | [Name] | YYYY-MM-DD | P0/P1/P2 | Open |
| [Action 2] | [Name] | YYYY-MM-DD | P0/P1/P2 | Open |

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Next Test

**Scheduled Date**: [Next quarter - YYYY-MM-DD]  
**Focus Areas**: [Areas to emphasize based on this test]

---

**Prepared By**: [Name]  
**Reviewed By**: [Name]  
**Approved By**: [Name]  
**Date**: YYYY-MM-DD
```

## Backup Verification Script

Create `scripts/verify-backups.sh`:

```bash
#!/bin/bash

# Verify backup integrity
BACKUP_DIR="/var/backups/takumi/database"
ERRORS=0

echo "Verifying backups in $BACKUP_DIR..."

for backup in $BACKUP_DIR/*.sql.gz; do
  echo "Checking $backup..."
  
  # Test gzip integrity
  if ! gunzip -t "$backup" 2>/dev/null; then
    echo "❌ CORRUPTED: $backup"
    ((ERRORS++))
  else
    echo "✅ OK: $backup"
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✅ All backups verified successfully"
  exit 0
else
  echo "❌ Found $ERRORS corrupted backup(s)"
  exit 1
fi
```

## RTO/RPO Targets

**Recovery Time Objective (RTO)**: Maximum acceptable downtime
- **Critical Systems (Database, API)**: 2 hours
- **Smart Contracts**: 15 minutes (emergency rollback)
- **Monitoring Systems**: 30 minutes
- **Full Infrastructure**: 4 hours

**Recovery Point Objective (RPO)**: Maximum acceptable data loss
- **Database**: 15 minutes (backup frequency)
- **Smart Contracts**: 0 (blockchain immutability)
- **Logs**: 5 minutes (buffer time)
- **Configuration**: 0 (version controlled)

## Compliance Requirements

- **SOC 2**: Annual DR test required
- **ISO 27001**: DR plan must be tested and updated
- **GDPR**: Data recovery procedures documented
- **Internal Policy**: Quarterly DR tests

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-24  
**Next Review**: 2025-02-24  
**Owner**: DevOps Team
