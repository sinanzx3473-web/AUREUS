# Sunset Procedures

**Guide for deprecating features, archiving data, and graceful service shutdown**

---

## Overview

This document outlines procedures for:
1. Deprecating features while maintaining backward compatibility
2. Archiving old data to reduce costs and improve performance
3. Gracefully shutting down services or the entire platform (if necessary)

---

## Table of Contents

1. [Feature Deprecation](#1-feature-deprecation)
2. [Data Archival](#2-data-archival)
3. [Network Sunset](#3-network-sunset)
4. [Service Shutdown](#4-service-shutdown)
5. [Complete Platform Sunset](#5-complete-platform-sunset)

---

## 1. Feature Deprecation

**Use Cases**:
- Removing underutilized features
- Replacing features with better alternatives
- Reducing maintenance burden
- Simplifying codebase

### Deprecation Timeline

**Recommended Timeline**: 90 days minimum

| Phase | Duration | Actions |
|-------|----------|---------|
| Announcement | Day 0 | Announce deprecation to users |
| Warning Period | Days 1-30 | Show warnings in UI, log usage |
| Migration Period | Days 31-60 | Provide migration tools/guides |
| Grace Period | Days 61-90 | Feature still works but deprecated |
| Removal | Day 90+ | Remove feature from codebase |

### Step-by-Step Deprecation Process

#### Phase 1: Announcement (Day 0)

```bash
# 1. Document deprecation decision
cat > docs/deprecations/FEATURE_NAME.md << EOF
# Deprecation Notice: [Feature Name]

**Deprecation Date**: $(date +%Y-%m-%d)
**Removal Date**: $(date -d "+90 days" +%Y-%m-%d)

## Reason
[Why is this feature being deprecated?]

## Impact
- Affected users: X
- Usage statistics: Y transactions/day
- Alternative: [New feature or workaround]

## Migration Guide
[Step-by-step guide for users to migrate]

## Timeline
- $(date +%Y-%m-%d): Deprecation announced
- $(date -d "+30 days" +%Y-%m-%d): Warnings added to UI
- $(date -d "+60 days" +%Y-%m-%d): Feature marked as deprecated in API
- $(date -d "+90 days" +%Y-%m-%d): Feature removed

## Support
For questions, contact: support@takumi.io
EOF

# 2. Announce to users
# - Blog post
# - Email to affected users
# - Discord/Twitter announcement
# - Update FAQ

# 3. Add deprecation notice to documentation
# Edit relevant docs to add deprecation warning
```

#### Phase 2: Add Warnings (Days 1-30)

```typescript
// 1. Add UI warning banner
// Edit src/components/DeprecatedFeature.tsx

import { Alert, AlertDescription } from '@/components/ui/alert'

export function DeprecatedFeatureWarning() {
  return (
    <Alert variant="warning">
      <AlertDescription>
        ⚠️ This feature will be deprecated on {REMOVAL_DATE}.
        Please migrate to {ALTERNATIVE_FEATURE}.
        <a href="/docs/migration">Learn more</a>
      </AlertDescription>
    </Alert>
  )
}

// 2. Add API deprecation header
// Edit backend/src/routes/deprecated.routes.ts

router.get('/old-endpoint', (req, res) => {
  res.set('Deprecation', 'true')
  res.set('Sunset', '2024-06-01T00:00:00Z')
  res.set('Link', '<https://docs.takumi.io/migration>; rel="deprecation"')
  
  // Log usage for analytics
  logger.warn('Deprecated endpoint accessed', {
    endpoint: req.path,
    user: req.user?.address,
    timestamp: new Date()
  })
  
  // Continue with normal response
  // ...
})

// 3. Track usage of deprecated feature
// Edit backend/src/middleware/metricsMiddleware.ts

export function trackDeprecatedFeature(featureName: string) {
  return (req, res, next) => {
    deprecatedFeatureUsage.labels(featureName).inc()
    next()
  }
}

// Apply to deprecated routes
router.get('/old-endpoint', 
  trackDeprecatedFeature('old-endpoint'),
  handler
)
```

#### Phase 3: Provide Migration Tools (Days 31-60)

```bash
# 1. Create migration script for users
cat > scripts/migrate-from-old-feature.sh << EOF
#!/bin/bash
# Migration script for users to move from old feature to new feature

echo "Starting migration from OldFeature to NewFeature..."

# Export data from old feature
curl -X GET "https://api.takumi.io/old-feature/export" \
  -H "Authorization: Bearer \$API_KEY" \
  -o old-feature-data.json

# Transform data to new format
node scripts/transform-data.js old-feature-data.json new-feature-data.json

# Import to new feature
curl -X POST "https://api.takumi.io/new-feature/import" \
  -H "Authorization: Bearer \$API_KEY" \
  -H "Content-Type: application/json" \
  -d @new-feature-data.json

echo "Migration complete!"
EOF

chmod +x scripts/migrate-from-old-feature.sh

# 2. Create migration guide
cat > docs/MIGRATION_GUIDE.md << EOF
# Migration Guide: OldFeature → NewFeature

## Overview
This guide helps you migrate from the deprecated OldFeature to NewFeature.

## Prerequisites
- API key with read/write access
- Node.js 18+ installed

## Step 1: Export Your Data
\`\`\`bash
curl -X GET "https://api.takumi.io/old-feature/export" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -o old-feature-data.json
\`\`\`

## Step 2: Review Exported Data
\`\`\`bash
cat old-feature-data.json | jq .
\`\`\`

## Step 3: Run Migration Script
\`\`\`bash
./scripts/migrate-from-old-feature.sh
\`\`\`

## Step 4: Verify Migration
\`\`\`bash
curl -X GET "https://api.takumi.io/new-feature" \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

## Troubleshooting
[Common issues and solutions]

## Support
Email: support@takumi.io
Discord: #migration-help
EOF

# 3. Email migration guide to affected users
# Use SendGrid or similar to send personalized emails
```

#### Phase 4: Grace Period (Days 61-90)

```typescript
// 1. Increase warning severity
// Edit src/components/DeprecatedFeature.tsx

<Alert variant="destructive">
  <AlertDescription>
    🚨 This feature will be removed in {DAYS_REMAINING} days.
    Action required: Migrate to {ALTERNATIVE_FEATURE} now.
    <a href="/docs/migration">Migration Guide</a>
  </AlertDescription>
</Alert>

// 2. Send final reminder emails
// 7 days before removal
// 1 day before removal

// 3. Prepare removal PR
# Create feature flag to disable feature
# Edit backend/.env
ENABLE_OLD_FEATURE=false

# Update code to check feature flag
if (process.env.ENABLE_OLD_FEATURE === 'true') {
  // Old feature code
} else {
  return res.status(410).json({
    error: 'This feature has been deprecated',
    message: 'Please use /new-feature instead',
    migration_guide: 'https://docs.takumi.io/migration'
  })
}
```

#### Phase 5: Removal (Day 90+)

```bash
# 1. Disable feature via feature flag
# Edit backend/.env
ENABLE_OLD_FEATURE=false

# Deploy and monitor for 24 hours

# 2. If no issues, remove code
git checkout -b remove-old-feature

# Remove deprecated routes
rm backend/src/routes/old-feature.routes.ts

# Remove deprecated components
rm src/components/OldFeature.tsx

# Remove deprecated contracts (if applicable)
# Note: Cannot remove deployed contracts, but can remove from codebase

# Update imports and references
# Search for all references to old feature
grep -r "OldFeature" .

# 3. Update tests
# Remove tests for deprecated feature
rm backend/test/old-feature.test.ts

# 4. Update documentation
# Remove old feature from docs
# Add to CHANGELOG.md under "Removed"

# 5. Create PR and deploy
git add .
git commit -m "Remove deprecated OldFeature"
git push origin remove-old-feature

# After PR approval and merge, deploy
vercel --prod
pm2 restart backend

# 6. Monitor for errors
# Check for any 404s or errors related to old feature
pm2 logs backend | grep -i "old-feature"
```

---

## 2. Data Archival

**Use Cases**:
- Reduce database size and improve performance
- Lower storage costs
- Comply with data retention policies
- Prepare for GDPR/data deletion requests

### Data Retention Policy

| Data Type | Retention Period | Archive Location |
|-----------|------------------|------------------|
| Active profiles | Indefinite | Production DB |
| Inactive profiles (>1 year) | 3 years | Archive DB |
| Transaction logs | 6 months | Production DB |
| Old transaction logs | 3 years | S3 Glacier |
| Error logs | 90 days | ELK Stack |
| Old error logs | 1 year | S3 Standard |
| Backups | 30 days | S3 Standard |
| Old backups | 1 year | S3 Glacier |

### Archival Process

#### Step 1: Identify Data for Archival

```sql
-- 1. Find inactive profiles (no activity in 1+ year)
SELECT 
  id,
  owner,
  name,
  created_at,
  updated_at,
  pg_size_pretty(pg_column_size(skill_profiles.*)) as row_size
FROM skill_profiles
WHERE updated_at < CURRENT_DATE - INTERVAL '1 year'
  AND id NOT IN (
    SELECT DISTINCT profile_id FROM skill_claims WHERE created_at > CURRENT_DATE - INTERVAL '1 year'
    UNION
    SELECT DISTINCT profile_id FROM endorsements WHERE created_at > CURRENT_DATE - INTERVAL '1 year'
  )
ORDER BY updated_at ASC
LIMIT 1000;

-- 2. Calculate space savings
SELECT 
  COUNT(*) as profiles_to_archive,
  pg_size_pretty(SUM(pg_column_size(skill_profiles.*))::bigint) as total_size
FROM skill_profiles
WHERE updated_at < CURRENT_DATE - INTERVAL '1 year';

-- 3. Find old transaction logs
SELECT 
  COUNT(*) as logs_to_archive,
  pg_size_pretty(SUM(pg_column_size(transaction_logs.*))::bigint) as total_size
FROM transaction_logs
WHERE created_at < CURRENT_DATE - INTERVAL '6 months';
```

#### Step 2: Export Data to Archive

```bash
# 1. Create archive directory
mkdir -p /archives/$(date +%Y%m)

# 2. Export inactive profiles
psql -U takumi -d takumi_prod -c "
  COPY (
    SELECT * FROM skill_profiles
    WHERE updated_at < CURRENT_DATE - INTERVAL '1 year'
  ) TO STDOUT WITH CSV HEADER
" | gzip > /archives/$(date +%Y%m)/inactive_profiles_$(date +%Y%m%d).csv.gz

# 3. Export old transaction logs
psql -U takumi -d takumi_prod -c "
  COPY (
    SELECT * FROM transaction_logs
    WHERE created_at < CURRENT_DATE - INTERVAL '6 months'
  ) TO STDOUT WITH CSV HEADER
" | gzip > /archives/$(date +%Y%m)/old_transaction_logs_$(date +%Y%m%d).csv.gz

# 4. Verify exports
gunzip -t /archives/$(date +%Y%m)/*.csv.gz
echo $?  # Should return 0

# 5. Upload to S3 Glacier
aws s3 cp /archives/$(date +%Y%m)/ \
  s3://takumi-archives/$(date +%Y%m)/ \
  --recursive \
  --storage-class GLACIER

# 6. Verify upload
aws s3 ls s3://takumi-archives/$(date +%Y%m)/
```

#### Step 3: Create Archive Metadata

```sql
-- Create archive tracking table
CREATE TABLE IF NOT EXISTS archived_data (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  archive_date DATE NOT NULL,
  record_count INTEGER NOT NULL,
  archive_location TEXT NOT NULL,
  file_size_bytes BIGINT,
  archived_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Record archival
INSERT INTO archived_data (
  table_name,
  archive_date,
  record_count,
  archive_location,
  file_size_bytes,
  archived_by,
  notes
) VALUES (
  'skill_profiles',
  CURRENT_DATE,
  (SELECT COUNT(*) FROM skill_profiles WHERE updated_at < CURRENT_DATE - INTERVAL '1 year'),
  's3://takumi-archives/202401/inactive_profiles_20240115.csv.gz',
  1234567890,
  'admin',
  'Archived inactive profiles older than 1 year'
);
```

#### Step 4: Delete Archived Data from Production

```sql
-- ⚠️ CRITICAL: Only delete after verifying archive integrity

-- 1. Create backup before deletion
pg_dump -U takumi -d takumi_prod -t skill_profiles | \
  gzip > /backups/pre_archive_deletion_$(date +%Y%m%d).sql.gz

-- 2. Delete in batches to avoid long locks
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  LOOP
    DELETE FROM skill_profiles
    WHERE id IN (
      SELECT id FROM skill_profiles
      WHERE updated_at < CURRENT_DATE - INTERVAL '1 year'
      LIMIT 1000
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    EXIT WHEN deleted_count = 0;
    
    -- Log progress
    RAISE NOTICE 'Deleted % rows', deleted_count;
    
    -- Pause between batches
    PERFORM pg_sleep(1);
  END LOOP;
END $$;

-- 3. Vacuum to reclaim space
VACUUM FULL skill_profiles;

-- 4. Verify space reclaimed
SELECT pg_size_pretty(pg_total_relation_size('skill_profiles'));
```

#### Step 5: Document Archival

```bash
# Update archival log
cat >> /archives/ARCHIVAL_LOG.md << EOF

## Archival - $(date +%Y-%m-%d)

**Tables Archived**:
- skill_profiles: X,XXX records
- transaction_logs: X,XXX records

**Total Size**: XXX MB

**Archive Location**: s3://takumi-archives/$(date +%Y%m)/

**Space Reclaimed**: XXX MB

**Archived By**: [Name]

**Notes**: [Any relevant notes]

---
EOF
```

### Data Restoration from Archive

```bash
# 1. Download from S3
aws s3 cp s3://takumi-archives/202401/inactive_profiles_20240115.csv.gz \
  /tmp/restore/

# 2. Decompress
gunzip /tmp/restore/inactive_profiles_20240115.csv.gz

# 3. Restore to database (to separate archive table)
psql -U takumi -d takumi_prod -c "
  CREATE TABLE IF NOT EXISTS skill_profiles_archive (LIKE skill_profiles);
  
  COPY skill_profiles_archive FROM '/tmp/restore/inactive_profiles_20240115.csv'
  WITH CSV HEADER;
"

# 4. Verify restoration
psql -U takumi -d takumi_prod -c "
  SELECT COUNT(*) FROM skill_profiles_archive;
"

# 5. If needed, restore specific records to production
psql -U takumi -d takumi_prod -c "
  INSERT INTO skill_profiles
  SELECT * FROM skill_profiles_archive
  WHERE id = 12345;
"
```

---

## 3. Network Sunset

**Use Cases**:
- Discontinuing support for underutilized blockchain networks
- Reducing infrastructure costs
- Focusing resources on popular networks

### Network Sunset Timeline

**Recommended Timeline**: 120 days

| Phase | Duration | Actions |
|-------|----------|---------|
| Announcement | Day 0 | Announce network sunset |
| Warning Period | Days 1-60 | Show warnings, provide migration tools |
| Read-Only Period | Days 61-90 | Disable writes, allow reads |
| Grace Period | Days 91-120 | Final chance to export data |
| Shutdown | Day 120+ | Stop indexing, remove from UI |

### Step-by-Step Network Sunset

#### Phase 1: Announcement

```bash
# 1. Analyze network usage
psql -U takumi -d takumi_prod -c "
  SELECT 
    network,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT owner) as unique_users,
    MAX(created_at) as last_activity
  FROM skill_profiles
  GROUP BY network
  ORDER BY total_profiles DESC;
"

# 2. Announce sunset
cat > docs/network-sunset/NETWORK_NAME.md << EOF
# Network Sunset Notice: [Network Name]

**Sunset Date**: $(date -d "+120 days" +%Y-%m-%d)

## Reason
[Why is this network being sunset?]
- Low usage: Only X users, Y transactions
- High costs: $Z/month for minimal usage
- Strategic focus: Concentrating on higher-usage networks

## Impact
- Affected users: X
- Total profiles: Y
- Alternative networks: [List of alternatives]

## Timeline
- $(date +%Y-%m-%d): Sunset announced
- $(date -d "+60 days" +%Y-%m-%d): Network becomes read-only
- $(date -d "+90 days" +%Y-%m-%d): Final data export window
- $(date -d "+120 days" +%Y-%m-%d): Network removed from platform

## Migration Guide
[How to migrate to alternative network]

## Data Export
[How to export your data before shutdown]
EOF

# 3. Email affected users
# 4. Post announcement on social media
# 5. Update documentation
```

#### Phase 2: Read-Only Mode (Day 60)

```typescript
// 1. Disable writes to network
// Edit backend/src/middleware/networkCheck.ts

const SUNSET_NETWORKS = ['avalanche', 'fantom']

export function checkNetworkStatus(req, res, next) {
  const network = req.body.network || req.query.network
  
  if (SUNSET_NETWORKS.includes(network)) {
    if (req.method !== 'GET') {
      return res.status(403).json({
        error: 'Network in sunset mode',
        message: `${network} is read-only. No new transactions allowed.`,
        sunset_date: '2024-06-01',
        migration_guide: 'https://docs.takumi.io/network-sunset'
      })
    }
  }
  
  next()
}

// 2. Update frontend to show warning
// Edit src/components/NetworkSelector.tsx

{network.sunset && (
  <Badge variant="destructive">
    Sunset {network.sunsetDate}
  </Badge>
)}

// 3. Disable network in wallet connector
// Edit src/utils/wagmiConfig.ts

export const chains = [
  mainnet,
  polygon,
  // avalanche,  // Commented out - sunset
] as const
```

#### Phase 3: Data Export Window (Days 61-90)

```bash
# 1. Provide data export tool
cat > scripts/export-network-data.sh << EOF
#!/bin/bash
NETWORK=\$1
OUTPUT_FILE="export_\${NETWORK}_\$(date +%Y%m%d).json"

echo "Exporting data from \$NETWORK..."

curl -X GET "https://api.takumi.io/export?network=\$NETWORK" \
  -H "Authorization: Bearer \$API_KEY" \
  -o \$OUTPUT_FILE

echo "Export complete: \$OUTPUT_FILE"
EOF

# 2. Email users with export instructions
# 3. Provide support for migration questions
```

#### Phase 4: Shutdown (Day 120)

```bash
# 1. Stop indexer for network
pm2 stop indexer-avalanche

# 2. Archive network data
./scripts/archive-network-data.sh --network avalanche

# 3. Remove network from codebase
git checkout -b remove-avalanche-network

# Remove from wagmi config
# Edit src/utils/wagmiConfig.ts
# Remove avalanche from chains array

# Remove from contract addresses
# Edit src/utils/evmConfig.ts
# Remove avalanche entries

# Remove from backend
# Edit backend/.env
# Remove AVALANCHE_* variables

# 4. Update documentation
# Remove network from README.md, docs, etc.

# 5. Deploy changes
git commit -am "Remove Avalanche network support"
git push origin remove-avalanche-network

# After PR approval
vercel --prod
pm2 restart backend

# 6. Archive blockchain data
# Keep in cold storage for potential future restoration
aws s3 cp /data/avalanche/ \
  s3://takumi-archives/networks/avalanche/ \
  --recursive \
  --storage-class GLACIER
```

---

## 4. Service Shutdown

**Use Cases**:
- Shutting down specific microservices
- Consolidating services
- Reducing operational complexity

### Service Shutdown Checklist

```bash
# 1. Identify service dependencies
# List all services that depend on this service

# 2. Notify stakeholders
# Internal team, users (if user-facing)

# 3. Redirect traffic
# Update load balancer to remove service

# 4. Stop service
pm2 stop service-name

# 5. Monitor for errors
# Check logs for any services trying to reach shutdown service

# 6. Archive service data
# Export any data to archive storage

# 7. Remove from infrastructure
# Remove from docker-compose, PM2 config, etc.

# 8. Update documentation
# Remove service from architecture docs
```

---

## 5. Complete Platform Sunset

**⚠️ CRITICAL: Only use in case of complete platform shutdown**

### Platform Sunset Timeline

**Recommended Timeline**: 180 days minimum

| Phase | Duration | Actions |
|-------|----------|---------|
| Announcement | Day 0 | Public announcement |
| Data Export Period | Days 1-90 | Provide export tools |
| Read-Only Period | Days 91-150 | Disable writes |
| Grace Period | Days 151-180 | Final warnings |
| Shutdown | Day 180 | Platform offline |

### Step-by-Step Platform Sunset

#### Phase 1: Announcement (Day 0)

```markdown
# Platform Sunset Announcement

**Effective Date**: [DATE]
**Shutdown Date**: [DATE + 180 days]

## Important Information

Takumi platform will be shutting down on [SHUTDOWN_DATE].

## Timeline

- **Now - [+90 days]**: Data export period
  - Export all your data using our export tools
  - Download your profiles, claims, endorsements
  
- **[+90 days] - [+150 days]**: Read-only period
  - No new transactions allowed
  - Data still accessible for viewing
  
- **[+150 days] - [+180 days]**: Final grace period
  - Last chance to export data
  - Platform will be shut down on [SHUTDOWN_DATE]

## How to Export Your Data

[Detailed export instructions]

## Alternatives

[List of alternative platforms]

## Support

For questions: sunset-support@takumi.io

## Thank You

Thank you for being part of the Takumi community.
```

#### Phase 2: Provide Export Tools (Days 1-90)

```bash
# 1. Create comprehensive export tool
cat > scripts/export-all-data.sh << EOF
#!/bin/bash

echo "Exporting all Takumi data..."

# Export profiles
curl -X GET "https://api.takumi.io/export/profiles" \
  -H "Authorization: Bearer \$API_KEY" \
  -o profiles.json

# Export claims
curl -X GET "https://api.takumi.io/export/claims" \
  -H "Authorization: Bearer \$API_KEY" \
  -o claims.json

# Export endorsements
curl -X GET "https://api.takumi.io/export/endorsements" \
  -H "Authorization: Bearer \$API_KEY" \
  -o endorsements.json

# Create archive
tar -czf takumi-export-\$(date +%Y%m%d).tar.gz *.json

echo "Export complete: takumi-export-\$(date +%Y%m%d).tar.gz"
EOF

# 2. Provide web-based export UI
# Create export page in frontend

# 3. Email all users with export instructions
```

#### Phase 3: Read-Only Mode (Day 90)

```typescript
// 1. Disable all write operations
// Edit backend/src/middleware/readOnlyMode.ts

export function readOnlyMode(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(503).json({
      error: 'Platform in read-only mode',
      message: 'Takumi is shutting down. No new transactions allowed.',
      shutdown_date: '2024-12-31',
      export_guide: 'https://docs.takumi.io/export'
    })
  }
  next()
}

// Apply to all routes
app.use(readOnlyMode)

// 2. Pause all smart contracts
# See Emergency Procedures for contract pause instructions

// 3. Update frontend with shutdown banner
<Alert variant="destructive">
  Platform shutting down on {SHUTDOWN_DATE}.
  Export your data now.
</Alert>
```

#### Phase 4: Final Shutdown (Day 180)

```bash
# 1. Final data backup
./scripts/backup-database.sh
./scripts/snapshot-contracts.sh

# 2. Archive all data
aws s3 sync /data/ s3://takumi-final-archive/ --storage-class GLACIER

# 3. Stop all services
pm2 stop all
docker-compose down

# 4. Update DNS
# Point domain to static shutdown page

# 5. Shutdown infrastructure
# Terminate EC2 instances, RDS, etc.

# 6. Preserve archives
# Keep final backups in cold storage for legal/compliance

# 7. Final communication
# Thank users, provide archive access info if needed
```

#### Post-Shutdown

```bash
# 1. Maintain static archive page
# Provide information about shutdown
# Offer data retrieval service (if applicable)

# 2. Keep domain registered
# Prevent domain squatting
# Redirect to archive page

# 3. Preserve data archives
# Keep for legal retention period (typically 7 years)

# 4. Document lessons learned
# Create post-mortem for future reference
```

---

## Data Retention After Sunset

| Data Type | Retention Period | Storage Location | Access |
|-----------|------------------|------------------|--------|
| User data | 7 years | S3 Glacier Deep Archive | On request only |
| Transaction logs | 7 years | S3 Glacier | On request only |
| Smart contracts | Permanent | Blockchain | Public |
| Code repository | Permanent | GitHub (archived) | Public |
| Documentation | Permanent | GitHub Pages | Public |

---

## Legal & Compliance Considerations

- [ ] Review data retention requirements (GDPR, CCPA, etc.)
- [ ] Notify users per legal requirements (30-90 days notice)
- [ ] Provide data export in machine-readable format
- [ ] Honor data deletion requests
- [ ] Preserve audit trails for compliance period
- [ ] Consult legal counsel before final shutdown

---

## Notes

- **Communicate early and often**: Users need time to prepare
- **Provide clear migration paths**: Help users move to alternatives
- **Preserve data**: Keep archives for legal/compliance requirements
- **Document everything**: Future reference and legal protection
- **Be respectful**: Thank users for their support
