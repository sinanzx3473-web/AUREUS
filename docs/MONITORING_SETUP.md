# Monitoring & Alerting Setup Guide

## Overview

This guide covers the complete setup and configuration of the Takumi platform's monitoring, alerting, and observability stack.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Monitoring Stack                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Prometheus  │  │ Elasticsearch│  │   Grafana    │      │
│  │   (Metrics)  │  │    (Logs)    │  │ (Dashboards) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         │                  │                  │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │
│  │ Alertmanager │  │   Logstash   │  │    Kibana    │      │
│  │   (Alerts)   │  │ (Processing) │  │ (Log Search) │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │  Slack / Email / PagerDuty / Webhooks        │          │
│  └──────────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# Check logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601
- **Alertmanager**: http://localhost:9093

### 3. Configure Environment Variables

Create `.env.monitoring` file:

```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email Alerts
ALERT_EMAIL=alerts@takumi.io
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Cloud Backup (Optional)
CLOUD_BACKUP=true
S3_BUCKET=takumi-backups
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

Load environment:

```bash
source .env.monitoring
```

## Detailed Configuration

### Prometheus Setup

**Configuration File**: `monitoring/prometheus.yml`

**Key Features:**
- 15-second scrape interval
- Automatic service discovery
- Alert rule evaluation
- Multi-target scraping (API, DB, Redis, Indexer)

**Add Custom Metrics:**

```typescript
// backend/src/middleware/metricsMiddleware.ts
import { Counter, Histogram } from 'prom-client';

// Custom counter
const customCounter = new Counter({
  name: 'custom_events_total',
  help: 'Total custom events',
  labelNames: ['event_type']
});

// Custom histogram
const customDuration = new Histogram({
  name: 'custom_operation_duration_seconds',
  help: 'Duration of custom operations',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Usage
customCounter.inc({ event_type: 'profile_created' });
customDuration.observe(operationDuration);
```

### Grafana Dashboards

**Pre-configured Dashboards:**

1. **Takumi Overview** (`takumi-dashboard.json`)
   - HTTP request rates
   - Response latency (p50, p95, p99)
   - Error rates
   - Database connections
   - Contract transaction metrics

2. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

3. **Blockchain Metrics**
   - Gas prices
   - Transaction success/failure rates
   - Event processing lag
   - Indexer block height

**Create Custom Dashboard:**

1. Open Grafana (http://localhost:3000)
2. Click "+" → "Dashboard"
3. Add Panel
4. Select Prometheus data source
5. Enter PromQL query:

```promql
# Request rate by endpoint
rate(takumi_http_requests_total[5m])

# Error rate
rate(takumi_http_requests_total{status=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, rate(takumi_http_request_duration_seconds_bucket[5m]))

# Contract transaction rate
rate(indexer_contract_tx_total[5m])

# Gas price trend
avg_over_time(indexer_avg_gas_price[1h])
```

### Alert Rules

**Configuration File**: `monitoring/alerts.yml`

**Alert Severity Levels:**

- **Critical**: Immediate action required (15-min response)
- **Warning**: Investigate within 1 hour
- **Info**: Informational, no immediate action

**Key Alerts:**

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| APIDown | 2 minutes | Critical | Restart service |
| HighErrorRate | >5% for 5min | Warning | Check logs |
| DatabaseConnectionFailure | 1 minute | Critical | Check DB |
| AnomalousGasSpike | 3x average | Warning | Monitor |
| HighContractFailureRate | >10% for 10min | Critical | Pause contracts |
| SlowAPIResponse | p95 >2s for 10min | Warning | Optimize |

**Add Custom Alert:**

```yaml
# monitoring/alerts.yml
- alert: CustomAlert
  expr: custom_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Custom alert triggered"
    description: "Custom metric exceeded threshold"
```

### Alertmanager Configuration

**Configuration File**: `monitoring/alertmanager.yml`

**Notification Channels:**

1. **Slack** (Critical + Warning)
2. **Email** (Critical only)
3. **Webhook** (All alerts to backend)

**Alert Routing:**

```yaml
routes:
  - match:
      severity: critical
    receiver: 'critical'
    continue: true
  - match:
      severity: warning
    receiver: 'warning'
```

**Test Alerts:**

```bash
# Trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "Test alert",
      "description": "This is a test"
    }
  }]'
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

**Log Sources:**

1. **Backend API** → Logstash (port 5000)
2. **Contract Events** → Indexer → Logstash
3. **Frontend Errors** → API → Logstash
4. **System Logs** → Filebeat → Logstash

**Logstash Pipeline**: `monitoring/logstash/pipeline/logstash.conf`

**Send Logs to Logstash:**

```typescript
// backend/src/utils/logger.ts
import winston from 'winston';
import LogstashTransport from 'winston-logstash';

const logger = winston.createLogger({
  transports: [
    new LogstashTransport({
      host: 'logstash',
      port: 5000
    })
  ]
});

logger.info('Application started', { service: 'backend' });
logger.error('Error occurred', { error: err.message, stack: err.stack });
```

**Kibana Queries:**

```
# Find errors in last hour
level:error AND @timestamp:[now-1h TO now]

# Search by service
service:backend AND level:error

# Contract transaction failures
event_type:contract_tx AND status:failed

# Slow queries
query_duration:>1000
```

### Contract Event Monitoring

**Indexer Metrics:**

```typescript
// backend/src/services/indexer.service.ts
import { Counter, Gauge, Histogram } from 'prom-client';

const eventCounter = new Counter({
  name: 'indexer_events_total',
  help: 'Total events indexed',
  labelNames: ['contract', 'event_type']
});

const blockLag = new Gauge({
  name: 'indexer_block_lag',
  help: 'Blocks behind chain head'
});

const processingTime = new Histogram({
  name: 'indexer_event_processing_duration_seconds',
  help: 'Event processing duration',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Usage
eventCounter.inc({ contract: 'SkillProfile', event_type: 'ProfileCreated' });
blockLag.set(currentBlock - latestIndexedBlock);
processingTime.observe(duration);
```

## Automated Backups

### Database Backups

**Schedule**: Daily at 2 AM UTC

**Setup Cron:**

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Setup automated backups
./scripts/setup-cron-backups.sh

# Verify cron jobs
crontab -l
```

**Manual Backup:**

```bash
# Run backup manually
./scripts/backup-database.sh

# Run full automated backup (DB + contracts)
./scripts/automated-backup.sh

# Enable cloud backup
CLOUD_BACKUP=true S3_BUCKET=takumi-backups ./scripts/automated-backup.sh
```

**Backup Locations:**

- **Local**: `/var/backups/takumi/database/`
- **Cloud**: `s3://takumi-backups/database/`
- **Retention**: 30 days local, 90 days S3

### Contract Snapshots

**Trigger**: Before each deployment

**Contents:**
- Contract ABIs
- Deployment addresses
- Implementation addresses
- Network configuration

**Create Snapshot:**

```bash
./scripts/snapshot-contracts.sh
```

## Health Checks

### Automated Health Monitoring

**Schedule**: Hourly

**Checks:**
- API health endpoint
- Database connectivity
- Redis connectivity
- Disk space
- Memory usage
- Monitoring services status

**Run Health Check:**

```bash
# Manual health check
./scripts/health-check.sh

# View health check logs
tail -f /var/log/takumi-health.log
```

### API Health Endpoint

```bash
# Check API health
curl http://localhost:3001/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "redis": "connected",
  "uptime": 86400
}
```

## Disaster Recovery

### Contract Rollback

**Standard Rollback** (with timelock):

```bash
# Schedule upgrade with 48-hour delay
PROXY_ADDRESS=$PROXY \
NEW_IMPLEMENTATION=$NEW_IMPL \
PROXY_ADMIN=$ADMIN \
TIMELOCK_ADDRESS=$TIMELOCK \
forge script script/UpgradeWithTimelock.s.sol --broadcast

# After 48 hours, execute
forge script script/ExecuteTimelockUpgrade.s.sol --broadcast
```

**Emergency Rollback** (bypass timelock):

```bash
# ⚠️ CRITICAL INCIDENTS ONLY
# Requires multi-sig approval

PROXY_ADMIN_ADDRESS=$ADMIN \
EMERGENCY_KEY=$KEY \
RPC_URL=$RPC \
./scripts/emergency-rollback.sh
```

### Database Recovery

```bash
# List available backups
./scripts/restore-database.sh

# Restore from specific backup
./scripts/restore-database.sh /var/backups/takumi/database/takumi_db_20240115_020000.sql.gz
```

## Monitoring Best Practices

### 1. Alert Fatigue Prevention

- Set appropriate thresholds
- Use `for` duration to avoid flapping
- Implement alert inhibition rules
- Regular alert review and tuning

### 2. Dashboard Organization

- Overview dashboard for executives
- Detailed dashboards per service
- SLA/SLO tracking dashboards
- Incident response dashboards

### 3. Log Management

- Structured logging (JSON format)
- Consistent log levels
- Include correlation IDs
- Set retention policies

### 4. Metric Naming

Follow Prometheus conventions:
- `<namespace>_<metric>_<unit>`
- Example: `takumi_http_requests_total`
- Use labels for dimensions

### 5. Regular Testing

- Monthly disaster recovery drills
- Alert testing
- Backup restoration tests
- Runbook validation

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify service is exposing metrics
curl http://localhost:3001/metrics

# Check Prometheus logs
docker-compose -f docker-compose.monitoring.yml logs prometheus
```

### Grafana Dashboard Not Loading

```bash
# Verify Prometheus datasource
curl http://localhost:3000/api/datasources

# Check Grafana logs
docker-compose -f docker-compose.monitoring.yml logs grafana

# Restart Grafana
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Alerts Not Firing

```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Verify Alertmanager connection
curl http://localhost:9093/api/v1/status

# Test alert manually
curl -X POST http://localhost:9093/api/v1/alerts -d '[...]'
```

### Logs Not Appearing in Kibana

```bash
# Check Logstash pipeline
docker-compose -f docker-compose.monitoring.yml logs logstash

# Verify Elasticsearch indices
curl http://localhost:9200/_cat/indices

# Test log ingestion
echo '{"message":"test"}' | nc localhost 5000
```

## Maintenance

### Weekly Tasks

- [ ] Review alert thresholds
- [ ] Check backup integrity
- [ ] Review dashboard accuracy
- [ ] Clean up old logs

### Monthly Tasks

- [ ] Disaster recovery drill
- [ ] Update alert runbooks
- [ ] Review metric retention
- [ ] Optimize slow queries

### Quarterly Tasks

- [ ] Security audit of monitoring stack
- [ ] Update monitoring dependencies
- [ ] Review and update SLAs
- [ ] Capacity planning review

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [ELK Stack Guide](https://www.elastic.co/guide/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)

---

**Last Updated**: 2024-01-15  
**Maintained By**: DevOps Team  
**Review Schedule**: Monthly
