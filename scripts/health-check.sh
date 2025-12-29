#!/bin/bash
# Health Check Script for Takumi Platform
# Monitors critical services and sends alerts on failures

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_CHECKS=0

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

notify_slack() {
  if [ -n "${SLACK_WEBHOOK}" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$1\"}" \
      "${SLACK_WEBHOOK}" 2>/dev/null || true
  fi
}

send_email() {
  if [ -n "${ALERT_EMAIL}" ] && command -v mail &> /dev/null; then
    echo "$1" | mail -s "Takumi Health Check Alert" "${ALERT_EMAIL}"
  fi
}

echo "========================================="
echo "Takumi Platform Health Check"
echo "Time: $(date)"
echo "========================================="

# Check API health
echo ""
echo "Checking API health..."
if curl -f -s "${API_URL}/health" > /dev/null 2>&1; then
  log_success "API is responding"
else
  log_error "API is not responding"
fi

# Check database connection
echo ""
echo "Checking database connection..."
DB_CHECK=$(curl -s "${API_URL}/health" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
if [ "$DB_CHECK" = "connected" ]; then
  log_success "Database is connected"
else
  log_error "Database connection failed"
fi

# Check Redis connection
echo ""
echo "Checking Redis connection..."
REDIS_CHECK=$(curl -s "${API_URL}/health" | grep -o '"redis":"[^"]*"' | cut -d'"' -f4)
if [ "$REDIS_CHECK" = "connected" ]; then
  log_success "Redis is connected"
else
  log_warning "Redis connection failed (non-critical)"
fi

# Check disk space
echo ""
echo "Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  log_success "Disk usage: ${DISK_USAGE}%"
elif [ "$DISK_USAGE" -lt 90 ]; then
  log_warning "Disk usage: ${DISK_USAGE}% (approaching limit)"
else
  log_error "Disk usage: ${DISK_USAGE}% (critical)"
fi

# Check memory usage
echo ""
echo "Checking memory usage..."
if command -v free &> /dev/null; then
  MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
  if [ "$MEM_USAGE" -lt 80 ]; then
    log_success "Memory usage: ${MEM_USAGE}%"
  elif [ "$MEM_USAGE" -lt 90 ]; then
    log_warning "Memory usage: ${MEM_USAGE}% (high)"
  else
    log_error "Memory usage: ${MEM_USAGE}% (critical)"
  fi
fi

# Check if monitoring stack is running
echo ""
echo "Checking monitoring services..."
if command -v docker &> /dev/null; then
  if docker ps | grep -q "takumi-prometheus"; then
    log_success "Prometheus is running"
  else
    log_warning "Prometheus is not running"
  fi
  
  if docker ps | grep -q "takumi-grafana"; then
    log_success "Grafana is running"
  else
    log_warning "Grafana is not running"
  fi
fi

# Summary
echo ""
echo "========================================="
if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}All critical checks passed${NC}"
  exit 0
else
  echo -e "${RED}${FAILED_CHECKS} check(s) failed${NC}"
  
  # Send alerts
  ALERT_MSG="🚨 Takumi Health Check Failed: ${FAILED_CHECKS} critical issue(s) detected at $(date)"
  notify_slack "$ALERT_MSG"
  send_email "$ALERT_MSG"
  
  exit 1
fi
