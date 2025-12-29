#!/bin/bash

# Backup Verification Script
# Verifies integrity of all database backups

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/takumi/database}"
ERRORS=0
WARNINGS=0

echo "=================================================="
echo "Takumi Backup Verification"
echo "=================================================="
echo "Backup Directory: $BACKUP_DIR"
echo "Started: $(date)"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ ERROR: Backup directory does not exist: $BACKUP_DIR"
  exit 1
fi

# Count backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
echo "Found $BACKUP_COUNT backup file(s)"
echo ""

if [ $BACKUP_COUNT -eq 0 ]; then
  echo "⚠️  WARNING: No backup files found!"
  exit 1
fi

# Verify each backup
for backup in "$BACKUP_DIR"/*.sql.gz; do
  if [ ! -f "$backup" ]; then
    continue
  fi
  
  FILENAME=$(basename "$backup")
  echo "Checking: $FILENAME"
  
  # Check file size
  SIZE=$(stat -f%z "$backup" 2>/dev/null || stat -c%s "$backup" 2>/dev/null)
  SIZE_MB=$((SIZE / 1024 / 1024))
  
  if [ $SIZE -lt 1024 ]; then
    echo "  ⚠️  WARNING: File is very small (${SIZE} bytes)"
    ((WARNINGS++))
  else
    echo "  Size: ${SIZE_MB} MB"
  fi
  
  # Test gzip integrity
  if ! gunzip -t "$backup" 2>/dev/null; then
    echo "  ❌ CORRUPTED: gzip integrity check failed"
    ((ERRORS++))
  else
    echo "  ✅ gzip integrity: OK"
  fi
  
  # Check file age
  if [ "$(uname)" = "Darwin" ]; then
    # macOS
    FILE_AGE=$(($(date +%s) - $(stat -f %m "$backup")))
  else
    # Linux
    FILE_AGE=$(($(date +%s) - $(stat -c %Y "$backup")))
  fi
  
  DAYS_OLD=$((FILE_AGE / 86400))
  
  if [ $DAYS_OLD -gt 30 ]; then
    echo "  ⚠️  WARNING: Backup is $DAYS_OLD days old (retention policy: 30 days)"
    ((WARNINGS++))
  else
    echo "  Age: $DAYS_OLD days"
  fi
  
  # Verify SQL content (basic check)
  if gunzip -c "$backup" 2>/dev/null | head -n 1 | grep -q "PostgreSQL database dump"; then
    echo "  ✅ SQL format: Valid PostgreSQL dump"
  else
    echo "  ⚠️  WARNING: May not be a valid PostgreSQL dump"
    ((WARNINGS++))
  fi
  
  echo ""
done

# Summary
echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo "Total backups checked: $BACKUP_COUNT"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo "Completed: $(date)"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All backups verified successfully"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Verification completed with $WARNINGS warning(s)"
  exit 0
else
  echo "❌ Verification failed with $ERRORS error(s)"
  exit 1
fi
