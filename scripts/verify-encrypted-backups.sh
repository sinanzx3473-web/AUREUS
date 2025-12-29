#!/bin/bash
# Encrypted Backup Verification Script
# Verifies integrity of all encrypted database and contract backups
# Runs periodic integrity tests on encrypted backups

set -e

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/takumi}"
DB_BACKUP_DIR="${BACKUP_ROOT}/database"
CONTRACT_BACKUP_DIR="${BACKUP_ROOT}/contracts"
ENCRYPTION_KEY_FILE="${BACKUP_ENCRYPTION_KEY_FILE:-}"
ERRORS=0
WARNINGS=0
TOTAL_CHECKED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "Takumi Encrypted Backup Verification"
echo "=================================================="
echo "Started: $(date)"
echo ""

# Verify encryption key is available
if [ -n "${ENCRYPTION_KEY_FILE}" ] && [ -f "${ENCRYPTION_KEY_FILE}" ]; then
  echo "✅ Encryption key file found: ${ENCRYPTION_KEY_FILE}"
  ENCRYPTION_KEY=$(cat "${ENCRYPTION_KEY_FILE}")
else
  echo "⚠️  WARNING: Encryption key not available - will skip decryption tests"
  echo "   Set BACKUP_ENCRYPTION_KEY_FILE to enable full verification"
  ENCRYPTION_KEY=""
fi

echo ""
echo "=================================================="
echo "Database Backup Verification"
echo "=================================================="

if [ ! -d "$DB_BACKUP_DIR" ]; then
  echo "❌ ERROR: Database backup directory does not exist: $DB_BACKUP_DIR"
  ((ERRORS++))
else
  # Count encrypted backups
  ENCRYPTED_COUNT=$(find "$DB_BACKUP_DIR" -name "*.sql.gz.enc" 2>/dev/null | wc -l)
  UNENCRYPTED_COUNT=$(find "$DB_BACKUP_DIR" -name "*.sql.gz" ! -name "*.enc" 2>/dev/null | wc -l)
  
  echo "Found ${ENCRYPTED_COUNT} encrypted backup(s)"
  echo "Found ${UNENCRYPTED_COUNT} unencrypted backup(s)"
  
  if [ $UNENCRYPTED_COUNT -gt 0 ]; then
    echo "⚠️  WARNING: Unencrypted backups found! These should be encrypted."
    ((WARNINGS++))
  fi
  
  echo ""
  
  # Verify each encrypted backup
  for backup in "$DB_BACKUP_DIR"/*.sql.gz.enc; do
    if [ ! -f "$backup" ]; then
      continue
    fi
    
    FILENAME=$(basename "$backup")
    echo "Checking: $FILENAME"
    ((TOTAL_CHECKED++))
    
    # Check file size
    SIZE=$(stat -c%s "$backup" 2>/dev/null || stat -f%z "$backup" 2>/dev/null)
    SIZE_MB=$((SIZE / 1024 / 1024))
    
    if [ $SIZE -lt 1024 ]; then
      echo "  ⚠️  WARNING: File is very small (${SIZE} bytes)"
      ((WARNINGS++))
    else
      echo "  Size: ${SIZE_MB} MB"
    fi
    
    # Verify checksum
    if [ -f "${backup}.sha256" ]; then
      if sha256sum -c "${backup}.sha256" 2>/dev/null >/dev/null; then
        echo "  ✅ Checksum: VALID"
      else
        echo "  ❌ Checksum: FAILED"
        ((ERRORS++))
      fi
    else
      echo "  ⚠️  WARNING: No checksum file"
      ((WARNINGS++))
    fi
    
    # Verify IV file exists
    if [ -f "${backup}.iv" ]; then
      IV_SIZE=$(stat -c%s "${backup}.iv" 2>/dev/null || stat -f%z "${backup}.iv" 2>/dev/null)
      if [ $IV_SIZE -eq 25 ]; then  # 12 bytes hex = 24 chars + newline
        echo "  ✅ IV file: VALID"
      else
        echo "  ⚠️  WARNING: IV file has unexpected size: ${IV_SIZE} bytes"
        ((WARNINGS++))
      fi
    else
      echo "  ❌ IV file: MISSING"
      ((ERRORS++))
    fi
    
    # Test decryption if key available
    if [ -n "${ENCRYPTION_KEY}" ]; then
      echo "  Testing decryption..."
      TEMP_DECRYPT="/tmp/verify_decrypt_$$.sql.gz"
      IV=$(cat "${backup}.iv")
      
      if openssl enc -aes-256-gcm -d \
        -in "${backup}" \
        -out "${TEMP_DECRYPT}" \
        -K "${ENCRYPTION_KEY}" \
        -iv "${IV}" \
        -pbkdf2 2>/dev/null; then
        
        # Verify decrypted file is valid gzip
        if gunzip -t "${TEMP_DECRYPT}" 2>/dev/null; then
          echo "  ✅ Decryption: SUCCESS"
          
          # Verify it's a PostgreSQL dump
          if gunzip -c "${TEMP_DECRYPT}" 2>/dev/null | head -n 1 | grep -q "PostgreSQL database dump"; then
            echo "  ✅ Content: Valid PostgreSQL dump"
          else
            echo "  ⚠️  WARNING: May not be a valid PostgreSQL dump"
            ((WARNINGS++))
          fi
        else
          echo "  ❌ Decryption produced invalid gzip"
          ((ERRORS++))
        fi
        
        rm -f "${TEMP_DECRYPT}"
      else
        echo "  ❌ Decryption: FAILED"
        ((ERRORS++))
      fi
    fi
    
    # Check file age
    if [ "$(uname)" = "Darwin" ]; then
      FILE_AGE=$(($(date +%s) - $(stat -f %m "$backup")))
    else
      FILE_AGE=$(($(date +%s) - $(stat -c %Y "$backup")))
    fi
    
    DAYS_OLD=$((FILE_AGE / 86400))
    
    if [ $DAYS_OLD -gt 30 ]; then
      echo "  ⚠️  Age: $DAYS_OLD days (retention: 30 days)"
      ((WARNINGS++))
    else
      echo "  Age: $DAYS_OLD days"
    fi
    
    echo ""
  done
fi

echo "=================================================="
echo "Contract Snapshot Verification"
echo "=================================================="

if [ ! -d "$CONTRACT_BACKUP_DIR" ]; then
  echo "❌ ERROR: Contract backup directory does not exist: $CONTRACT_BACKUP_DIR"
  ((ERRORS++))
else
  # Count encrypted snapshots
  ENCRYPTED_COUNT=$(find "$CONTRACT_BACKUP_DIR" -name "*.tar.gz.enc" 2>/dev/null | wc -l)
  UNENCRYPTED_COUNT=$(find "$CONTRACT_BACKUP_DIR" -name "*.tar.gz" ! -name "*.enc" 2>/dev/null | wc -l)
  
  echo "Found ${ENCRYPTED_COUNT} encrypted snapshot(s)"
  echo "Found ${UNENCRYPTED_COUNT} unencrypted snapshot(s)"
  
  if [ $UNENCRYPTED_COUNT -gt 0 ]; then
    echo "⚠️  WARNING: Unencrypted snapshots found! These should be encrypted."
    ((WARNINGS++))
  fi
  
  echo ""
  
  # Verify each encrypted snapshot
  for snapshot in "$CONTRACT_BACKUP_DIR"/*.tar.gz.enc; do
    if [ ! -f "$snapshot" ]; then
      continue
    fi
    
    FILENAME=$(basename "$snapshot")
    echo "Checking: $FILENAME"
    ((TOTAL_CHECKED++))
    
    # Check file size
    SIZE=$(stat -c%s "$snapshot" 2>/dev/null || stat -f%z "$snapshot" 2>/dev/null)
    SIZE_MB=$((SIZE / 1024 / 1024))
    
    if [ $SIZE -lt 1024 ]; then
      echo "  ⚠️  WARNING: File is very small (${SIZE} bytes)"
      ((WARNINGS++))
    else
      echo "  Size: ${SIZE_MB} MB"
    fi
    
    # Verify checksum
    if [ -f "${snapshot}.sha256" ]; then
      if sha256sum -c "${snapshot}.sha256" 2>/dev/null >/dev/null; then
        echo "  ✅ Checksum: VALID"
      else
        echo "  ❌ Checksum: FAILED"
        ((ERRORS++))
      fi
    else
      echo "  ⚠️  WARNING: No checksum file"
      ((WARNINGS++))
    fi
    
    # Verify IV file exists
    if [ -f "${snapshot}.iv" ]; then
      echo "  ✅ IV file: EXISTS"
    else
      echo "  ❌ IV file: MISSING"
      ((ERRORS++))
    fi
    
    # Test decryption if key available
    if [ -n "${ENCRYPTION_KEY}" ]; then
      echo "  Testing decryption..."
      TEMP_DECRYPT="/tmp/verify_snapshot_$$.tar.gz"
      IV=$(cat "${snapshot}.iv")
      
      if openssl enc -aes-256-gcm -d \
        -in "${snapshot}" \
        -out "${TEMP_DECRYPT}" \
        -K "${ENCRYPTION_KEY}" \
        -iv "${IV}" \
        -pbkdf2 2>/dev/null; then
        
        # Verify decrypted file is valid tar
        if tar -tzf "${TEMP_DECRYPT}" >/dev/null 2>&1; then
          echo "  ✅ Decryption: SUCCESS"
          echo "  ✅ Content: Valid tar archive"
        else
          echo "  ❌ Decryption produced invalid tar"
          ((ERRORS++))
        fi
        
        rm -f "${TEMP_DECRYPT}"
      else
        echo "  ❌ Decryption: FAILED"
        ((ERRORS++))
      fi
    fi
    
    # Check file age
    if [ "$(uname)" = "Darwin" ]; then
      FILE_AGE=$(($(date +%s) - $(stat -f %m "$snapshot")))
    else
      FILE_AGE=$(($(date +%s) - $(stat -c %Y "$snapshot")))
    fi
    
    DAYS_OLD=$((FILE_AGE / 86400))
    
    if [ $DAYS_OLD -gt 30 ]; then
      echo "  ⚠️  Age: $DAYS_OLD days (retention: 30 days)"
      ((WARNINGS++))
    else
      echo "  Age: $DAYS_OLD days"
    fi
    
    echo ""
  done
fi

# Summary
echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo "Total backups checked: $TOTAL_CHECKED"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo "Completed: $(date)"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All encrypted backups verified successfully"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Verification completed with $WARNINGS warning(s)"
  exit 0
else
  echo "❌ Verification failed with $ERRORS error(s)"
  exit 1
fi
