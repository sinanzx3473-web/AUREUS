#!/bin/bash
# Setup Automated Backup Cron Jobs for Takumi Platform
# Configures daily database backups and weekly contract snapshots

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up automated backup cron jobs..."

# Create cron job for daily database backups (2 AM)
CRON_DAILY="0 2 * * * ${SCRIPT_DIR}/automated-backup.sh >> /var/log/takumi-backup.log 2>&1"

# Create cron job for hourly health checks
CRON_HEALTH="0 * * * * ${SCRIPT_DIR}/health-check.sh >> /var/log/takumi-health.log 2>&1"

# Add to crontab
(crontab -l 2>/dev/null | grep -v "automated-backup.sh" | grep -v "health-check.sh"; echo "$CRON_DAILY"; echo "$CRON_HEALTH") | crontab -

echo "✓ Cron jobs configured:"
echo "  - Daily backups at 2 AM"
echo "  - Hourly health checks"
echo ""
echo "Current crontab:"
crontab -l

echo ""
echo "To manually trigger backup: ${SCRIPT_DIR}/automated-backup.sh"
echo "Logs: /var/log/takumi-backup.log"
