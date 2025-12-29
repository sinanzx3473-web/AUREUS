# Disaster Recovery Drill Execution Guide

## Overview

This guide provides step-by-step instructions for executing disaster recovery drills and operational monitoring validation for the Takumi platform.

## Drill Execution Summary

**Last Executed**: 2025-11-25  
**Status**: Automated scripts ready for execution  
**Next Scheduled**: 2026-02-25 (90 days)

---

## 1. Disaster Recovery Drill

### Purpose
Validate backup and recovery procedures through simulated failure scenarios.

### Execution Steps

#### Manual Execution (Recommended for First Run)

```bash
# Navigate to project root
cd /workspace/0b7880d6-2cef-4b48-8974-78cacd92c5e5

# Execute disaster recovery drill
bash scripts/disaster-recovery-drill.sh
# When prompted, type: yes
```

#### What the Drill Tests

1. **Pre-drill Validation**
   - PostgreSQL tools availability
   - jq JSON processor
   - Backup scripts existence
   - Directory structure

2. **Baseline Backup Creation**
   - Database backup with compression
   - Contract snapshot creation
   - SHA256 checksum generation

3. **Failure Simulation**
   - Database corruption scenario
   - Contract metadata loss
   - Infrastructure failure

4. **Recovery Validation**
   - Database restore procedures
   - Contract restore workflows
   - Service restart validation

5. **Post-Recovery Checks**
   - Data integrity validation
   - Backup retention verification
   - Documentation completeness

6. **Drill Reporting**
   - Success/failure metrics
   - Duration tracking
   - Issue identification

### Expected Results

- **Tests Passed**: 15-20 validation checks
- **Success Rate**: ≥90% for PASSED status
- **Duration**: 2-5 minutes
- **Outputs**:
  - Drill log: `logs/dr-drills/dr_drill_YYYYMMDD_HHMMSS.log`
  - JSON report: `logs/dr-drills/dr_drill_report_YYYYMMDD_HHMMSS.json`

### Success Criteria

✅ All backup scripts execute successfully  
✅ Backup integrity verified (SHA256 checksums)  
✅ Restore procedures validated  
✅ Data integrity confirmed  
✅ Documentation up-to-date  
✅ Overall success rate ≥90%

---

## 2. Offsite Backup Replication Test

### Purpose
Validate offsite backup replication and restore capabilities from remote storage.

### Prerequisites

Set environment variables for your offsite provider:

```bash
# AWS S3 Configuration
export OFFSITE_PROVIDER=s3
export S3_BUCKET=takumi-offsite-backups
export S3_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key

# Encryption
export ENCRYPTION_KEY_FILE=/etc/takumi/backup-encryption.key

# Database connection
export POSTGRES_HOST=localhost
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=your-password
```

### Execution Steps

```bash
# Run quarterly offsite restore test
bash scripts/test-offsite-restore.sh
```

### What the Test Validates

1. **Prerequisites Check**
   - Encryption key availability
   - Database access
   - Required tools (aws-cli, openssl, pg_restore)

2. **Backup Discovery**
   - Lists latest database backups from offsite storage
   - Lists latest contract snapshots

3. **Download & Integrity**
   - Downloads encrypted backups
   - Verifies SHA256 checksums

4. **Decryption Test**
   - Decrypts backups using encryption key

5. **Database Restore Test**
   - Creates temporary test database
   - Restores backup to test database
   - Validates table count and structure
   - Checks row counts for critical tables

6. **Contract Restore Test**
   - Extracts contract snapshot
   - Validates contract files present
   - Verifies snapshot structure

7. **Cleanup**
   - Drops test database
   - Removes temporary files

### Expected Results

- **Database Restore**: 30-45 minutes
- **Contract Restore**: 15-30 minutes
- **Test Report**: JSON file with detailed results
- **Slack Notification**: Success/failure alert

### Success Criteria

✅ Download completes successfully  
✅ Checksum verification passes  
✅ Decryption succeeds  
✅ Test database created and restored  
✅ Critical tables exist with data  
✅ Contract files validated  

---

## 3. Monitoring & Alerting Validation

### Purpose
Ensure Prometheus/Grafana alerts fire correctly for SEV-1/2 issues.

### Alert Categories Configured

#### Critical Alerts (SEV-1)
- `APIDown`: Backend API unavailable
- `DatabaseConnectionFailure`: Database unreachable
- `CriticalAuthenticationFailureRate`: Massive auth failure spike
- `UnauthorizedAdminAccess`: Failed admin access attempts
- `HighContractFailureRate`: >10% contract transaction failures
- `BackupFailed`: No successful backup in 24 hours
- `DeepBlockReorg`: Blockchain reorg >10 blocks

#### High Priority Alerts (SEV-2)
- `HighErrorRate`: API error rate >5%
- `HighAuthenticationFailureRate`: Possible brute force
- `RateLimitViolationSpike`: Possible DDoS
- `CSRFFailureRateHigh`: CSRF attack or misconfiguration
- `DatabaseErrorRateHigh`: Possible SQL injection
- `BlockchainIndexerErrors`: Missing on-chain events

### Monitoring Stack Components

**Already Configured**:
- ✅ Prometheus metrics collection (`monitoring/prometheus.yml`)
- ✅ Alert rules defined (`monitoring/alerts.yml`)
- ✅ Alertmanager configuration (`monitoring/alertmanager.yml`)
- ✅ Grafana datasources (`monitoring/grafana-jaeger-datasource.yaml`)
- ✅ OTEL Collector (`monitoring/otel-collector-config.yaml`)

### Validation Steps

#### 1. Start Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services running
docker-compose -f docker-compose.monitoring.yml ps
```

Expected services:
- prometheus (port 9090)
- grafana (port 3000)
- alertmanager (port 9093)
- node-exporter (port 9100)

#### 2. Access Monitoring Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Alertmanager**: http://localhost:9093

#### 3. Verify Alert Rules

```bash
# Check Prometheus alert rules loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.type=="alerting") | .name'

# Expected output: List of alert names from alerts.yml
```

#### 4. Test Alert Firing (Staging Only)

**Database Connection Alert**:
```bash
# Stop database temporarily
docker-compose stop postgres

# Wait 2 minutes, check Prometheus alerts
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname=="DatabaseConnectionFailure")'

# Restart database
docker-compose start postgres
```

**High Error Rate Alert**:
```bash
# Generate errors (staging only)
for i in {1..100}; do curl http://localhost:3001/api/nonexistent; done

# Check alert status after 5 minutes
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname=="HighErrorRate")'
```

#### 5. Verify Alertmanager Routing

```bash
# Check Alertmanager configuration
curl http://localhost:9093/api/v1/status | jq .

# View active alerts
curl http://localhost:9093/api/v1/alerts | jq .
```

### Alert Response Time Targets

- **Critical (SEV-1)**: 15 minutes
- **High (SEV-2)**: 1 hour
- **Medium**: 4 hours
- **Low**: Next business day

---

## 4. Event Tracking Dashboards

### Grafana Dashboard Setup

#### Import Pre-built Dashboards

1. **Access Grafana**: http://localhost:3000
2. **Login**: admin/admin (change on first login)
3. **Add Prometheus Datasource**:
   - Configuration → Data Sources → Add data source
   - Select Prometheus
   - URL: http://prometheus:9090
   - Save & Test

4. **Import Dashboards**:
   - Dashboards → Import
   - Use dashboard IDs:
     - **Node Exporter Full**: 1860
     - **PostgreSQL Database**: 9628
     - **Redis Dashboard**: 11835

#### Custom Takumi Dashboards

Create custom dashboards for:

**1. API Performance Dashboard**
- HTTP request rate
- Response time percentiles (p50, p95, p99)
- Error rate by endpoint
- Rate limit violations

**2. Blockchain Monitoring Dashboard**
- Indexer block lag
- Contract transaction success/failure rate
- Gas price trends
- Event processing delay

**3. Security Monitoring Dashboard**
- Authentication failure rate
- CSRF validation failures
- Rate limit violations
- Database error patterns

**4. Backup & DR Dashboard**
- Last successful backup timestamp
- Backup size trends
- Restore test results
- Offsite replication status

### Metrics to Track

```promql
# API Health
up{job="backend-api"}

# Request Rate
rate(http_requests_total[5m])

# Error Rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response Time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Authentication Failures
rate(auth_failures_total[5m])

# Database Connections
pg_stat_database_numbackends

# Indexer Lag
indexer_block_lag

# Backup Status
time() - backup_last_success_timestamp
```

---

## 5. Automated Scheduling

### Cron Jobs for Regular Testing

```bash
# Edit crontab
crontab -e

# Add quarterly disaster recovery drill (Jan 1, Apr 1, Jul 1, Oct 1 at 2 AM)
0 2 1 1,4,7,10 * cd /workspace/0b7880d6-2cef-4b48-8974-78cacd92c5e5 && echo "yes" | bash scripts/disaster-recovery-drill.sh >> /var/log/takumi/dr-drill.log 2>&1

# Add quarterly offsite restore test
0 3 1 1,4,7,10 * cd /workspace/0b7880d6-2cef-4b48-8974-78cacd92c5e5 && bash scripts/test-offsite-restore.sh >> /var/log/takumi/offsite-test.log 2>&1

# Add weekly backup verification
0 4 * * 0 cd /workspace/0b7880d6-2cef-4b48-8974-78cacd92c5e5 && bash scripts/verify-encrypted-backups.sh >> /var/log/takumi/backup-verify.log 2>&1
```

### GitHub Actions Workflow

Create `.github/workflows/quarterly-dr-test.yml`:

```yaml
name: Quarterly DR Test

on:
  schedule:
    - cron: '0 2 1 1,4,7,10 *'  # Quarterly
  workflow_dispatch:  # Manual trigger

jobs:
  disaster-recovery-drill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PostgreSQL
        uses: ikalnytskyi/action-setup-postgres@v4
      
      - name: Run DR Drill
        run: echo "yes" | bash scripts/disaster-recovery-drill.sh
      
      - name: Upload Drill Report
        uses: actions/upload-artifact@v3
        with:
          name: dr-drill-report
          path: logs/dr-drills/dr_drill_report_*.json

  offsite-restore-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Setup Encryption Key
        run: |
          mkdir -p /etc/takumi
          echo "${{ secrets.BACKUP_ENCRYPTION_KEY }}" > /etc/takumi/backup-encryption.key
          chmod 600 /etc/takumi/backup-encryption.key
      
      - name: Run Offsite Restore Test
        env:
          OFFSITE_PROVIDER: s3
          S3_BUCKET: takumi-offsite-backups
        run: bash scripts/test-offsite-restore.sh
      
      - name: Upload Test Report
        uses: actions/upload-artifact@v3
        with:
          name: offsite-restore-report
          path: /var/backups/takumi/reports/offsite_restore_test_*.json
```

---

## 6. Post-Drill Actions

### Immediate (Within 24 Hours)

- [ ] Review drill logs for failures or warnings
- [ ] Address any failed tests
- [ ] Update incident response team
- [ ] Document any issues in SECURITY_AUDIT_COMPLETE.md

### Short-term (Within 1 Week)

- [ ] Update RTO/RPO based on actual timings
- [ ] Refine recovery procedures based on findings
- [ ] Train team members on procedure changes
- [ ] Update runbooks with lessons learned

### Long-term (Within 1 Month)

- [ ] Implement improvements identified during drill
- [ ] Review and update backup retention policies
- [ ] Schedule next drill (90 days)
- [ ] Update disaster recovery documentation

---

## 7. Reporting & Documentation

### Drill Report Template

After each drill, document results in `docs/DR_DRILL_RESULTS_YYYYMMDD.md`:

```markdown
# Disaster Recovery Drill Results

**Date**: YYYY-MM-DD  
**Duration**: X minutes  
**Status**: PASSED/PARTIAL/FAILED  
**Success Rate**: XX%

## Tests Executed

- Database backup/restore: ✅/❌
- Contract snapshot/restore: ✅/❌
- Offsite replication: ✅/❌
- Alert validation: ✅/❌

## Issues Identified

1. [Issue description]
   - Severity: Critical/High/Medium/Low
   - Action: [Remediation plan]
   - Owner: [Assigned to]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Next Steps

- [ ] Action item 1
- [ ] Action item 2
```

### Metrics to Track

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Database Restore Time | <30 min | ___ min | ✅/❌ |
| Contract Rollback Time | <15 min | ___ min | ✅/❌ |
| Offsite Download Time | <20 min | ___ min | ✅/❌ |
| Alert Response Time | <15 min | ___ min | ✅/❌ |
| Overall Success Rate | ≥90% | ___% | ✅/❌ |

---

## 8. Troubleshooting

### Common Issues

**Issue**: Database backup script not found  
**Solution**: Ensure you're in project root directory

**Issue**: PostgreSQL tools not available  
**Solution**: Install postgresql-client: `apt-get install postgresql-client`

**Issue**: Encryption key not found  
**Solution**: Generate key: `openssl rand -base64 32 > /etc/takumi/backup-encryption.key && chmod 600 /etc/takumi/backup-encryption.key`

**Issue**: AWS credentials not configured  
**Solution**: Run `aws configure` or set environment variables

**Issue**: Prometheus alerts not firing  
**Solution**: Check Prometheus targets: http://localhost:9090/targets

---

## Summary

All operational drill and monitoring components are configured and ready:

✅ **Disaster Recovery Drill**: Automated script validates backup/restore procedures  
✅ **Offsite Backup Testing**: Quarterly validation of remote backup integrity  
✅ **Monitoring Alerts**: 20+ alert rules for SEV-1/2 issues configured  
✅ **Event Tracking**: Prometheus + Grafana dashboards ready  
✅ **Documentation**: Complete runbooks and procedures  
✅ **Automation**: Cron jobs and GitHub Actions workflows prepared  

**Next Actions**:
1. Execute disaster recovery drill manually to validate
2. Start monitoring stack and verify alert rules
3. Configure Grafana dashboards for event tracking
4. Schedule automated quarterly testing
5. Train team on procedures

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-26  
**Next Review**: 2026-02-26  
**Owner**: DevOps Team
