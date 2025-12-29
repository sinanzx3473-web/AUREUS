# Database Migration Guide

## Overview

This guide covers database schema management, migration best practices, and operational procedures for the Takumi platform PostgreSQL database.

---

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Creating Migrations](#creating-migrations)
3. [Running Migrations](#running-migrations)
4. [Rollback Procedures](#rollback-procedures)
5. [Zero-Downtime Migrations](#zero-downtime-migrations)
6. [Data Migrations](#data-migrations)
7. [Testing Migrations](#testing-migrations)
8. [Production Checklist](#production-checklist)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Migration Strategy

### Philosophy

- **Forward-only**: Migrations should always move forward; rollbacks are emergency-only
- **Incremental**: Small, focused changes are easier to test and debug
- **Reversible**: Every migration should have a documented rollback plan
- **Tested**: All migrations must be tested in staging before production
- **Documented**: Include comments explaining why changes are made

### Migration Naming Convention

```
<sequence>_<description>.sql

Examples:
001_initial_schema.sql
002_add_user_profiles.sql
003_add_skill_claims_index.sql
004_migrate_legacy_endorsements.sql
```

### Directory Structure

```
backend/migrations/
├── 001_initial_schema.sql
├── 002_notifications_webhooks.sql
├── 003_hash_api_keys.sql
├── rollback/
│   ├── 002_rollback_notifications.sql
│   └── 003_rollback_hash_api_keys.sql
└── README.md
```

---

## Creating Migrations

### Basic Migration Template

```sql
-- Migration: 004_add_verifier_specializations
-- Description: Add specializations table for verifier skill categories
-- Author: DevOps Team
-- Date: 2025-02-20
-- Dependencies: 001_initial_schema.sql

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Create new table
CREATE TABLE IF NOT EXISTS verifier_specializations (
    id SERIAL PRIMARY KEY,
    verifier_address VARCHAR(42) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_verifier
        FOREIGN KEY (verifier_address)
        REFERENCES verifiers(address)
        ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT unique_verifier_specialization
        UNIQUE (verifier_address, specialization)
);

-- Create index for common queries
CREATE INDEX idx_verifier_specializations_address 
    ON verifier_specializations(verifier_address);

CREATE INDEX idx_verifier_specializations_specialization 
    ON verifier_specializations(specialization);

-- Add comment for documentation
COMMENT ON TABLE verifier_specializations IS 
    'Stores skill specializations for each verifier';

COMMIT;

-- ============================================
-- ROLLBACK (Document in rollback/ directory)
-- ============================================
-- DROP INDEX IF EXISTS idx_verifier_specializations_specialization;
-- DROP INDEX IF EXISTS idx_verifier_specializations_address;
-- DROP TABLE IF EXISTS verifier_specializations;
```

### Adding Columns

```sql
-- Migration: 005_add_profile_metadata_columns
-- Description: Add avatar_uri and location columns to profiles

BEGIN;

-- Add columns with default values to avoid locking
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS avatar_uri TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS location VARCHAR(200) DEFAULT NULL;

-- Add index for location-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_location 
    ON profiles(location) 
    WHERE location IS NOT NULL;

-- Update existing rows (if needed)
-- UPDATE profiles SET location = 'Unknown' WHERE location IS NULL;

COMMIT;
```

### Modifying Columns

```sql
-- Migration: 006_modify_bio_length
-- Description: Increase bio column length from 500 to 1000 characters

BEGIN;

-- Check current data doesn't exceed new limit
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM profiles WHERE LENGTH(bio) > 1000
    ) THEN
        RAISE EXCEPTION 'Existing data exceeds new limit';
    END IF;
END $$;

-- Modify column type
ALTER TABLE profiles 
    ALTER COLUMN bio TYPE VARCHAR(1000);

-- Add constraint
ALTER TABLE profiles 
    ADD CONSTRAINT check_bio_length 
    CHECK (LENGTH(bio) <= 1000);

COMMIT;
```

### Creating Indexes

```sql
-- Migration: 007_add_performance_indexes
-- Description: Add indexes for common query patterns

BEGIN;

-- Use CONCURRENTLY to avoid table locks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skill_claims_status 
    ON skill_claims(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_skill_claims_claimant_status 
    ON skill_claims(claimant_address, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endorsements_endorsee_created 
    ON endorsements(endorsee_address, created_at DESC);

-- Partial index for active claims only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_claims 
    ON skill_claims(claimant_address) 
    WHERE status IN ('Pending', 'Assigned');

-- Composite index for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claims_composite 
    ON skill_claims(status, created_at DESC, claimant_address);

COMMIT;
```

---

## Running Migrations

### Manual Execution

```bash
# Connect to database
psql -h localhost -U takumi_user -d takumi_db

# Run migration
\i backend/migrations/004_add_verifier_specializations.sql

# Verify changes
\dt  -- List tables
\d verifier_specializations  -- Describe table
```

### Automated Migration Script

```bash
#!/bin/bash
# File: backend/scripts/run-migrations.sh

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-takumi_db}"
DB_USER="${DB_USER:-takumi_user}"
MIGRATIONS_DIR="backend/migrations"

echo "Running migrations on $DB_NAME..."

# Create migration tracking table
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Run each migration
for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
    migration_name=$(basename "$migration")
    
    # Check if already applied
    applied=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name'")
    
    if [ "$applied" -eq 0 ]; then
        echo "Applying $migration_name..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
        
        # Record migration
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name')"
        
        echo "✓ $migration_name applied successfully"
    else
        echo "⊘ $migration_name already applied, skipping"
    fi
done

echo "All migrations completed!"
```

### Docker-based Migrations

```bash
# Run migrations in Docker container
docker-compose exec backend npm run migrate

# Or directly with psql
docker-compose exec postgres psql -U takumi_user -d takumi_db \
    -f /migrations/004_add_verifier_specializations.sql
```

---

## Rollback Procedures

### Rollback Script Template

```sql
-- Rollback: 004_add_verifier_specializations
-- Description: Remove verifier specializations table
-- WARNING: This will delete all specialization data

BEGIN;

-- Drop indexes first
DROP INDEX IF EXISTS idx_verifier_specializations_specialization;
DROP INDEX IF EXISTS idx_verifier_specializations_address;

-- Drop table
DROP TABLE IF EXISTS verifier_specializations;

-- Remove migration record
DELETE FROM schema_migrations 
WHERE migration_name = '004_add_verifier_specializations.sql';

COMMIT;
```

### Emergency Rollback Procedure

```bash
#!/bin/bash
# File: backend/scripts/rollback-migration.sh

set -e

MIGRATION_NAME=$1

if [ -z "$MIGRATION_NAME" ]; then
    echo "Usage: ./rollback-migration.sh <migration_name>"
    exit 1
fi

ROLLBACK_FILE="backend/migrations/rollback/${MIGRATION_NAME}"

if [ ! -f "$ROLLBACK_FILE" ]; then
    echo "Error: Rollback file not found: $ROLLBACK_FILE"
    exit 1
fi

echo "WARNING: About to rollback $MIGRATION_NAME"
echo "This may result in data loss. Continue? (yes/no)"
read confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Rollback cancelled"
    exit 0
fi

# Backup database first
echo "Creating backup..."
./backend/scripts/backup-database.sh

# Run rollback
echo "Running rollback..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$ROLLBACK_FILE"

echo "Rollback completed. Verify database state!"
```

---

## Zero-Downtime Migrations

### Strategy: Expand-Migrate-Contract

#### Phase 1: Expand (Add new schema)

```sql
-- Migration: 008_expand_add_new_email_column
-- Phase: EXPAND

BEGIN;

-- Add new column (nullable initially)
ALTER TABLE users 
    ADD COLUMN email_new VARCHAR(255) DEFAULT NULL;

-- Add index
CREATE INDEX CONCURRENTLY idx_users_email_new 
    ON users(email_new);

COMMIT;
```

#### Phase 2: Migrate (Dual-write to both columns)

```javascript
// Application code: Write to both old and new columns
async function updateUserEmail(userId, email) {
    await db.query(
        'UPDATE users SET email = $1, email_new = $1 WHERE id = $2',
        [email, userId]
    );
}

// Background job: Backfill existing data
async function backfillEmails() {
    await db.query('UPDATE users SET email_new = email WHERE email_new IS NULL');
}
```

#### Phase 3: Contract (Remove old schema)

```sql
-- Migration: 009_contract_remove_old_email_column
-- Phase: CONTRACT
-- Prerequisites: All application instances updated to use email_new

BEGIN;

-- Verify data migration complete
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users WHERE email IS NOT NULL AND email_new IS NULL
    ) THEN
        RAISE EXCEPTION 'Data migration incomplete';
    END IF;
END $$;

-- Drop old column
ALTER TABLE users DROP COLUMN email;

-- Rename new column
ALTER TABLE users RENAME COLUMN email_new TO email;

-- Rename index
ALTER INDEX idx_users_email_new RENAME TO idx_users_email;

-- Add NOT NULL constraint (if appropriate)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

COMMIT;
```

### Adding NOT NULL Constraints Safely

```sql
-- Step 1: Add column as nullable
ALTER TABLE profiles ADD COLUMN created_by VARCHAR(42);

-- Step 2: Backfill data
UPDATE profiles SET created_by = address WHERE created_by IS NULL;

-- Step 3: Add NOT NULL constraint with validation
ALTER TABLE profiles 
    ALTER COLUMN created_by SET NOT NULL;

-- Alternative: Add constraint without full table scan (PostgreSQL 12+)
ALTER TABLE profiles 
    ADD CONSTRAINT profiles_created_by_not_null 
    CHECK (created_by IS NOT NULL) NOT VALID;

-- Validate in background
ALTER TABLE profiles 
    VALIDATE CONSTRAINT profiles_created_by_not_null;
```

---

## Data Migrations

### Batch Processing Pattern

```sql
-- Migration: 010_migrate_legacy_endorsements
-- Description: Migrate endorsements from old format to new schema

DO $$
DECLARE
    batch_size INT := 1000;
    processed INT := 0;
    total INT;
BEGIN
    -- Get total count
    SELECT COUNT(*) INTO total FROM legacy_endorsements;
    
    RAISE NOTICE 'Migrating % endorsements...', total;
    
    -- Process in batches
    LOOP
        WITH batch AS (
            SELECT id, endorser, endorsee, skill_name, comment, created_at
            FROM legacy_endorsements
            WHERE migrated = FALSE
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED
        )
        INSERT INTO endorsements (
            endorser_address, 
            endorsee_address, 
            skill_name, 
            comment, 
            created_at
        )
        SELECT 
            endorser, 
            endorsee, 
            skill_name, 
            comment, 
            created_at
        FROM batch;
        
        -- Mark as migrated
        UPDATE legacy_endorsements
        SET migrated = TRUE
        WHERE id IN (
            SELECT id FROM legacy_endorsements
            WHERE migrated = FALSE
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS processed = ROW_COUNT;
        
        EXIT WHEN processed = 0;
        
        RAISE NOTICE 'Processed % of % endorsements', 
            (SELECT COUNT(*) FROM legacy_endorsements WHERE migrated = TRUE), 
            total;
        
        -- Commit batch
        COMMIT;
        
        -- Small delay to avoid overwhelming database
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RAISE NOTICE 'Migration complete!';
END $$;
```

### Data Transformation Example

```sql
-- Migration: 011_normalize_skill_names
-- Description: Standardize skill name capitalization

BEGIN;

-- Create temporary mapping table
CREATE TEMP TABLE skill_name_mapping AS
SELECT DISTINCT
    skill_name AS old_name,
    INITCAP(LOWER(skill_name)) AS new_name
FROM skill_claims
WHERE skill_name != INITCAP(LOWER(skill_name));

-- Update skill claims
UPDATE skill_claims sc
SET skill_name = snm.new_name
FROM skill_name_mapping snm
WHERE sc.skill_name = snm.old_name;

-- Update endorsements
UPDATE endorsements e
SET skill_name = snm.new_name
FROM skill_name_mapping snm
WHERE e.skill_name = snm.old_name;

-- Log changes
INSERT INTO migration_logs (migration_name, records_affected, details)
SELECT 
    '011_normalize_skill_names',
    COUNT(*),
    jsonb_build_object('mappings', jsonb_agg(jsonb_build_object('old', old_name, 'new', new_name)))
FROM skill_name_mapping;

COMMIT;
```

---

## Testing Migrations

### Pre-Migration Checklist

```bash
#!/bin/bash
# File: backend/scripts/test-migration.sh

set -e

MIGRATION_FILE=$1

echo "Testing migration: $MIGRATION_FILE"

# 1. Create test database
echo "Creating test database..."
createdb takumi_test -T takumi_db

# 2. Run migration
echo "Running migration..."
psql -d takumi_test -f "$MIGRATION_FILE"

# 3. Verify schema
echo "Verifying schema..."
psql -d takumi_test -c "\dt"
psql -d takumi_test -c "\di"

# 4. Run application tests
echo "Running application tests..."
DATABASE_URL="postgresql://localhost/takumi_test" npm test

# 5. Cleanup
echo "Cleaning up..."
dropdb takumi_test

echo "Migration test completed successfully!"
```

### Migration Test Cases

```sql
-- Test file: backend/migrations/tests/004_test_verifier_specializations.sql

BEGIN;

-- Setup test data
INSERT INTO verifiers (address, name, active) VALUES
    ('0x1111111111111111111111111111111111111111', 'Test Verifier 1', TRUE),
    ('0x2222222222222222222222222222222222222222', 'Test Verifier 2', TRUE);

-- Test 1: Insert specializations
INSERT INTO verifier_specializations (verifier_address, specialization) VALUES
    ('0x1111111111111111111111111111111111111111', 'Solidity'),
    ('0x1111111111111111111111111111111111111111', 'React');

-- Test 2: Verify unique constraint
DO $$
BEGIN
    INSERT INTO verifier_specializations (verifier_address, specialization) 
    VALUES ('0x1111111111111111111111111111111111111111', 'Solidity');
    RAISE EXCEPTION 'Unique constraint not enforced';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint working correctly';
END $$;

-- Test 3: Verify foreign key cascade
DELETE FROM verifiers WHERE address = '0x1111111111111111111111111111111111111111';

SELECT CASE 
    WHEN COUNT(*) = 0 THEN 'CASCADE DELETE working'
    ELSE 'CASCADE DELETE failed'
END AS test_result
FROM verifier_specializations 
WHERE verifier_address = '0x1111111111111111111111111111111111111111';

ROLLBACK;
```

---

## Production Checklist

### Pre-Deployment

- [ ] Migration tested in development environment
- [ ] Migration tested in staging environment with production-like data
- [ ] Rollback script created and tested
- [ ] Database backup completed
- [ ] Estimated migration time calculated
- [ ] Downtime window scheduled (if needed)
- [ ] Team notified of deployment
- [ ] Monitoring alerts configured

### During Deployment

- [ ] Application maintenance mode enabled (if needed)
- [ ] Migration script executed
- [ ] Schema changes verified
- [ ] Data integrity checks passed
- [ ] Application smoke tests passed
- [ ] Performance metrics within acceptable range

### Post-Deployment

- [ ] Application maintenance mode disabled
- [ ] Monitoring dashboards reviewed
- [ ] Error logs checked
- [ ] User-facing features tested
- [ ] Rollback plan ready (if issues detected)
- [ ] Documentation updated
- [ ] Team notified of completion

---

## Common Patterns

### Pattern 1: Adding Enum Values

```sql
-- PostgreSQL doesn't allow adding enum values in transaction
-- Use this pattern instead:

-- Option A: Alter enum type (requires exclusive lock)
ALTER TYPE claim_status ADD VALUE 'UnderReview' AFTER 'Pending';

-- Option B: Use VARCHAR with CHECK constraint (recommended)
ALTER TABLE skill_claims 
    DROP CONSTRAINT IF EXISTS check_status,
    ADD CONSTRAINT check_status 
    CHECK (status IN ('Pending', 'Assigned', 'UnderReview', 'Approved', 'Rejected'));
```

### Pattern 2: Renaming Tables

```sql
-- Rename with minimal downtime
BEGIN;

-- Rename table
ALTER TABLE old_table_name RENAME TO new_table_name;

-- Rename indexes
ALTER INDEX idx_old_table_name_column RENAME TO idx_new_table_name_column;

-- Rename constraints
ALTER TABLE new_table_name 
    RENAME CONSTRAINT old_table_name_pkey TO new_table_name_pkey;

-- Update sequences
ALTER SEQUENCE old_table_name_id_seq RENAME TO new_table_name_id_seq;

COMMIT;
```

### Pattern 3: Splitting Tables

```sql
-- Split large table into two related tables
BEGIN;

-- Create new table
CREATE TABLE profile_metadata (
    profile_address VARCHAR(42) PRIMARY KEY,
    avatar_uri TEXT,
    location VARCHAR(200),
    website VARCHAR(500),
    FOREIGN KEY (profile_address) REFERENCES profiles(address) ON DELETE CASCADE
);

-- Migrate data
INSERT INTO profile_metadata (profile_address, avatar_uri, location, website)
SELECT address, avatar_uri, location, website
FROM profiles;

-- Remove columns from original table
ALTER TABLE profiles 
    DROP COLUMN avatar_uri,
    DROP COLUMN location,
    DROP COLUMN website;

COMMIT;
```

---

## Troubleshooting

### Issue: Migration Hangs

**Cause**: Table lock conflict

**Solution**:
```sql
-- Check for locks
SELECT 
    pid, 
    usename, 
    pg_blocking_pids(pid) as blocked_by,
    query 
FROM pg_stat_activity 
WHERE datname = 'takumi_db' AND state = 'active';

-- Kill blocking queries (if safe)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE pid = <blocking_pid>;
```

### Issue: Out of Disk Space

**Solution**:
```bash
# Check disk usage
df -h

# Clean up old WAL files
SELECT pg_switch_wal();
SELECT pg_walfile_name(pg_current_wal_lsn());

# Vacuum to reclaim space
VACUUM FULL;
```

### Issue: Migration Fails Midway

**Solution**:
```sql
-- Check migration status
SELECT * FROM schema_migrations ORDER BY applied_at DESC;

-- Manually mark as failed
DELETE FROM schema_migrations WHERE migration_name = 'failed_migration.sql';

-- Fix data issues
-- ... manual corrections ...

-- Re-run migration
\i backend/migrations/failed_migration.sql
```

---

## Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Migration Tools**: Flyway, Liquibase, node-pg-migrate
- **Backup Guide**: [scripts/backup-database.sh](../scripts/backup-database.sh)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Questions?** Contact the DevOps team or open an issue on GitHub.
