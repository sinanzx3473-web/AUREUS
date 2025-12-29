#!/bin/bash
# Automated Backup Script for Takumi Platform
# Orchestrates database and contract backups with cloud upload

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/takumi}"
CLOUD_BACKUP="${CLOUD_BACKUP:-false}"
S3_BUCKET="${S3_BUCKET:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging
LOG_FILE="${BACKUP_ROOT}/logs/backup_${TIMESTAMP}.log"
mkdir -p "$(dirname "${LOG_FILE}")"

log() {
  echo "[$(date -Iseconds)] $1" | tee -a "${LOG_FILE}"
}

notify_slack() {
  if [ -n "${SLACK_WEBHOOK}" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$1\"}" \
      "${SLACK_WEBHOOK}" 2>/dev/null || true
  fi
}

log "Starting automated backup process"
notify_slack "🔄 Takumi backup started"

# Database backup
log "Running database backup..."
if bash "${SCRIPT_DIR}/backup-database.sh" >> "${LOG_FILE}" 2>&1; then
  log "✓ Database backup completed"
else
  log "✗ Database backup failed"
  notify_slack "❌ Takumi database backup failed"
  exit 1
fi

# Contract snapshot
log "Running contract snapshot..."
if bash "${SCRIPT_DIR}/snapshot-contracts.sh" >> "${LOG_FILE}" 2>&1; then
  log "✓ Contract snapshot completed"
else
  log "✗ Contract snapshot failed"
  notify_slack "❌ Takumi contract snapshot failed"
  exit 1
fi

# Replicate to offsite storage (if enabled)
if [ "${CLOUD_BACKUP}" = "true" ]; then
  log "Replicating backups to offsite storage..."
  
  if bash "${SCRIPT_DIR}/replicate-offsite.sh" >> "${LOG_FILE}" 2>&1; then
    log "✓ Offsite replication completed"
  else
    log "✗ Offsite replication failed"
    notify_slack "⚠️ Takumi offsite replication failed"
  fi
fi

# Generate backup report
REPORT_FILE="${BACKUP_ROOT}/reports/backup_report_${TIMESTAMP}.txt"
mkdir -p "$(dirname "${REPORT_FILE}")"

cat > "${REPORT_FILE}" <<EOF
Takumi Platform Backup Report
=============================
Date: $(date)
Timestamp: ${TIMESTAMP}

Database Backups:
$(ls -lh "${BACKUP_ROOT}/database"/takumi_db_*.sql.gz | tail -n 5)

Contract Snapshots:
$(ls -lh "${BACKUP_ROOT}/contracts"/contract_snapshot_*.tar.gz | tail -n 5)

Disk Usage:
$(du -sh "${BACKUP_ROOT}")

Cloud Backup: ${CLOUD_BACKUP}
$([ "${CLOUD_BACKUP}" = "true" ] && echo "S3 Bucket: ${S3_BUCKET}" || echo "")

Status: SUCCESS
EOF

log "Backup report generated: ${REPORT_FILE}"

# Cleanup old logs (keep 90 days)
find "${BACKUP_ROOT}/logs" -name "backup_*.log" -type f -mtime +90 -delete 2>/dev/null || true
find "${BACKUP_ROOT}/reports" -name "backup_report_*.txt" -type f -mtime +90 -delete 2>/dev/null || true

log "Automated backup process completed successfully"
notify_slack "✅ Takumi backup completed successfully"

# Display summary
echo ""
echo "Backup Summary:"
cat "${REPORT_FILE}"
