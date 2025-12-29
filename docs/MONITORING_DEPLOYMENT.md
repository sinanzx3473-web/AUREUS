# Monitoring Stack Deployment Guide

## Quick Start

### 1. Configure Environment Variables

```bash
# Copy example environment file
cp .env.monitoring.example .env.monitoring

# Edit with your credentials
nano .env.monitoring
```

**Required Configuration**:
- Grafana admin credentials
- Slack webhook URL and channels
- Email SMTP settings
- PagerDuty integration key

### 2. Start Monitoring Stack

```bash
# Load environment variables
source .env.monitoring

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify all services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 3. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/[your-password])
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601
- **Alertmanager**: http://localhost:9093

### 4. Configure Backend Metrics

Add metrics middleware to your backend:

```typescript
// backend/src/index.ts
import { metricsMiddleware, metricsEndpoint } from './middleware/metricsMiddleware';

// Add metrics middleware
app.use(metricsMiddleware);

// Expose metrics endpoint
app.get('/metrics', metricsEndpoint);
```

### 5. Verify Metrics Collection

```bash
# Check if backend is exposing metrics
curl http://localhost:3001/metrics

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Verify alerts are loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[].rules[] | {alert: .name, state: .state}'
```

## Alert Channel Setup

### Slack Integration

1. Create Slack webhook:
   - Go to https://api.slack.com/apps
   - Create new app → Incoming Webhooks
   - Activate and create webhook for your channel
   - Copy webhook URL

2. Configure channels:
   ```bash
   # .env.monitoring
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   SLACK_CRITICAL_CHANNEL=#takumi-critical-alerts
   SLACK_WARNING_CHANNEL=#takumi-warnings
   ```

3. Test Slack alerts:
   ```bash
   curl -X POST http://localhost:9093/api/v1/alerts \
     -H 'Content-Type: application/json' \
     -d '[{
       "labels": {"alertname": "TestAlert", "severity": "warning"},
       "annotations": {"summary": "Test alert", "description": "Testing Slack integration"}
     }]'
   ```

### Email Alerts

1. Configure SMTP settings:
   ```bash
   # For Gmail, enable "App Passwords" in Google Account settings
   ALERT_EMAIL=alerts@takumi.example
   ALERT_FROM_EMAIL=monitoring@takumi.example
   ALERT_SMTP_HOST=smtp.gmail.com
   ALERT_SMTP_PORT=587
   ALERT_SMTP_USER=your-email@gmail.com
   ALERT_SMTP_PASSWORD=your-app-password
   ```

2. Test email alerts:
   ```bash
   curl -X POST http://localhost:9093/api/v1/alerts \
     -H 'Content-Type: application/json' \
     -d '[{
       "labels": {"alertname": "TestAlert", "severity": "critical"},
       "annotations": {"summary": "Test critical alert", "description": "Testing email integration"}
     }]'
   ```

### PagerDuty Integration

1. Create PagerDuty integration:
   - Go to PagerDuty → Services → Add Integration
   - Select "Prometheus" integration type
   - Copy integration key

2. Configure PagerDuty:
   ```bash
   # .env.monitoring
   PAGERDUTY_INTEGRATION_KEY=your-pagerduty-integration-key
   ```

3. Test PagerDuty alerts:
   ```bash
   curl -X POST http://localhost:9093/api/v1/alerts \
     -H 'Content-Type: application/json' \
     -d '[{
       "labels": {"alertname": "TestCritical", "severity": "critical"},
       "annotations": {"summary": "Test PagerDuty", "description": "Testing PagerDuty integration"}
     }]'
   ```

## Grafana Dashboard Setup

### Import Pre-configured Dashboard

1. Open Grafana (http://localhost:3000)
2. Login with admin credentials
3. Dashboard is auto-provisioned at startup
4. Navigate to Dashboards → Takumi Platform Overview

### Create Custom Dashboard

1. Click "+" → Dashboard
2. Add Panel
3. Select Prometheus data source
4. Enter PromQL query (examples below)
5. Configure visualization
6. Save dashboard

**Useful PromQL Queries**:

```promql
# Request rate by endpoint
rate(takumi_http_requests_total[5m])

# Error rate percentage
(rate(takumi_http_requests_total{status=~"5.."}[5m]) / rate(takumi_http_requests_total[5m])) * 100

# P95 response time
histogram_quantile(0.95, rate(takumi_http_request_duration_seconds_bucket[5m]))

# Contract transaction success rate
(rate(indexer_contract_tx_total{status="success"}[5m]) / rate(indexer_contract_tx_total[5m])) * 100

# Block reorg frequency
increase(block_reorgs_total[1h])

# Memory usage percentage
(process_memory_usage_bytes{type="heapUsed"} / process_memory_usage_bytes{type="heapTotal"}) * 100
```

## Incident Response Drill Schedule

### Quarterly Schedule

- **Q1 (March)**: Tabletop Exercise - SQL Injection & Data Breach
- **Q2 (June)**: Simulated Incident - Smart Contract Exploit
- **Q3 (September)**: Tabletop Exercise - DDoS & Rate Limit Bypass
- **Q4 (December)**: Full Disaster Recovery Test

### Running a Drill

1. **Pre-Drill** (1 week before):
   ```bash
   # Schedule drill in team calendar
   # Assign roles: Incident Commander, Security Lead, Communications Lead, Technical Lead
   # Prepare scenario documentation
   # Set up staging environment
   ```

2. **During Drill**:
   ```bash
   # Follow INCIDENT_RESPONSE.md procedures
   # Track metrics: TTD, TTA, TTC, TTR
   # Document all actions in incident log
   ```

3. **Post-Drill** (within 48 hours):
   ```bash
   # Conduct review meeting
   # Update INCIDENT_RESPONSE.md with findings
   # Create action items for improvements
   ```

See `docs/INCIDENT_RESPONSE.md` for detailed drill procedures.

## Disaster Recovery Testing

### Full DR Test Procedure

See `docs/DISASTER_RECOVERY_TEST.md` for complete test plan.

**Quick Test**:

```bash
# 1. Verify backups exist
ls -lh /var/backups/takumi/database/

# 2. Verify backup integrity
./scripts/verify-backups.sh

# 3. Test database restore (in staging)
./scripts/restore-database.sh /var/backups/takumi/database/latest.sql.gz

# 4. Test contract rollback (in staging)
./scripts/restore-contracts.sh

# 5. Verify system health
./scripts/health-check.sh
```

## Maintenance Tasks

### Daily
- Monitor alert channels for critical issues
- Review Grafana dashboards for anomalies

### Weekly
- Review alert thresholds and tune as needed
- Check backup integrity with `./scripts/verify-backups.sh`
- Clean up old logs and backups

### Monthly
- Conduct incident response drill
- Review and update runbooks
- Optimize slow queries identified in monitoring

### Quarterly
- Full disaster recovery test
- Security audit of monitoring stack
- Update monitoring dependencies
- Capacity planning review

## Troubleshooting

### Prometheus Not Scraping Metrics

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify backend is exposing metrics
curl http://localhost:3001/metrics

# Check Prometheus logs
docker-compose -f docker-compose.monitoring.yml logs prometheus

# Restart Prometheus
docker-compose -f docker-compose.monitoring.yml restart prometheus
```

### Alerts Not Firing

```bash
# Check alert rules are loaded
curl http://localhost:9090/api/v1/rules

# Verify Alertmanager is connected
curl http://localhost:9093/api/v1/status

# Check Alertmanager logs
docker-compose -f docker-compose.monitoring.yml logs alertmanager

# Manually trigger test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '[{"labels": {"alertname": "Test", "severity": "warning"}, "annotations": {"summary": "Test"}}]'
```

### Grafana Dashboard Not Loading

```bash
# Check Prometheus datasource
curl http://localhost:3000/api/datasources

# Verify Grafana can reach Prometheus
docker exec takumi-grafana curl http://prometheus:9090/api/v1/query?query=up

# Check Grafana logs
docker-compose -f docker-compose.monitoring.yml logs grafana

# Restart Grafana
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Slack/Email Alerts Not Sending

```bash
# Check Alertmanager configuration
docker exec takumi-alertmanager cat /etc/alertmanager/alertmanager.yml

# Verify environment variables are loaded
docker exec takumi-alertmanager env | grep SLACK
docker exec takumi-alertmanager env | grep ALERT

# Check Alertmanager logs for delivery errors
docker-compose -f docker-compose.monitoring.yml logs alertmanager | grep -i error

# Test webhook manually
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "Test message from Takumi monitoring"}'
```

## Security Considerations

1. **Secure Credentials**:
   - Never commit `.env.monitoring` to version control
   - Use strong passwords for Grafana admin
   - Rotate PagerDuty integration keys regularly

2. **Network Security**:
   - Restrict Prometheus/Grafana access to internal network
   - Use HTTPS for production deployments
   - Enable authentication on all monitoring endpoints

3. **Data Retention**:
   - Configure appropriate retention policies
   - Regularly clean up old metrics and logs
   - Encrypt backups at rest

4. **Access Control**:
   - Limit Grafana admin access
   - Use read-only datasources where possible
   - Audit access logs regularly

## Production Deployment

### Additional Steps for Production

1. **Enable HTTPS**:
   ```yaml
   # docker-compose.monitoring.yml
   grafana:
     environment:
       - GF_SERVER_PROTOCOL=https
       - GF_SERVER_CERT_FILE=/etc/grafana/ssl/cert.pem
       - GF_SERVER_CERT_KEY=/etc/grafana/ssl/key.pem
   ```

2. **Configure Persistent Storage**:
   ```yaml
   volumes:
     prometheus-data:
       driver: local
       driver_opts:
         type: none
         o: bind
         device: /mnt/monitoring/prometheus
   ```

3. **Set Resource Limits**:
   - Already configured in docker-compose.monitoring.yml
   - Adjust based on your infrastructure capacity

4. **Enable Backup**:
   ```bash
   # Add to crontab
   0 2 * * * /opt/takumi/scripts/automated-backup.sh
   ```

5. **Configure Firewall**:
   ```bash
   # Allow only internal network access
   ufw allow from 10.0.0.0/8 to any port 9090  # Prometheus
   ufw allow from 10.0.0.0/8 to any port 3000  # Grafana
   ```

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-24  
**Next Review**: 2025-02-24  
**Owner**: DevOps Team
