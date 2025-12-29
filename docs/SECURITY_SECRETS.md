# Security: Secrets and Credentials Management

## Overview

Takumi follows strict security practices for managing secrets, credentials, and sensitive configuration. **All secrets must be loaded from environment variables at runtime** - no defaults are hardcoded in the application code.

## Security Principles

### ✅ DO

- **Use environment variables** for all secrets, passwords, API keys, and credentials
- **Fail fast** - Application will refuse to start if required secrets are missing
- **Use `.env` files** for local development (never commit to git)
- **Use secure vaults** for production (AWS Secrets Manager, HashiCorp Vault, etc.)
- **Rotate secrets regularly** - especially after team member changes
- **Use different secrets** for development, staging, and production
- **Generate strong secrets** using cryptographic tools (see below)
- **Hash sensitive tokens** before storing in database (use bcrypt/argon2 for API keys)
- **Audit regularly** - review who has access to which secrets
- **Use Docker secrets** or environment files with restricted permissions (0600)

### ❌ NEVER

- **NEVER commit `.env` files** to version control
- **NEVER use default/example values** in production
- **NEVER hardcode secrets** in application code
- **NEVER share secrets** via email, Slack, or other insecure channels
- **NEVER reuse secrets** across different environments
- **NEVER log secrets** in application logs or error messages
- **NEVER store plaintext API keys in database** - always hash before persisting
- **NEVER use "latest" Docker image tags** in production (security and reproducibility)

## Required Environment Variables

### Backend Application

All backend services require these environment variables. The application **will fail to start** if they are missing.

#### Database (REQUIRED)
```bash
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_secure_database_password  # REQUIRED - no default
```

#### Redis (REQUIRED)
```bash
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password  # REQUIRED for production
```

#### JWT Authentication (REQUIRED)
```bash
JWT_SECRET=your_jwt_secret_minimum_32_characters  # REQUIRED - no default
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_SECRET_PREVIOUS=previous_jwt_secret  # Used during rotation grace period
JWT_REFRESH_SECRET_PREVIOUS=previous_refresh_secret  # Used during rotation grace period
```

**JWT Secret Rotation Policy:**
- Secrets are automatically rotated every 90 days
- Zero-downtime rotation with 48-hour grace period
- Previous secrets remain valid during grace period
- Automated via GitHub Actions scheduled workflow
- Full audit trail maintained in `logs/jwt-rotation/`

#### Admin Access (REQUIRED)
```bash
ADMIN_API_KEY=your_admin_api_key  # REQUIRED for admin endpoints
```

#### Email Service (REQUIRED if EMAIL_ENABLED=true)
```bash
EMAIL_ENABLED=true
SMTP_HOST=smtp.example.com  # REQUIRED when enabled
SMTP_USER=your_smtp_user    # REQUIRED when enabled
SMTP_PASS=your_smtp_password  # REQUIRED when enabled
SMTP_FROM=noreply@yourdomain.com
```

#### Storage (REQUIRED based on STORAGE_TYPE)
```bash
STORAGE_TYPE=ipfs  # Options: ipfs, arweave, both

# IPFS (REQUIRED if STORAGE_TYPE=ipfs or both)
IPFS_HOST=ipfs.infura.io  # REQUIRED
IPFS_PROJECT_ID=your_project_id
IPFS_PROJECT_SECRET=your_project_secret

# Arweave (REQUIRED if STORAGE_TYPE=arweave or both)
ARWEAVE_HOST=arweave.net  # REQUIRED
ARWEAVE_WALLET_KEY={"kty":"RSA",...}  # JSON wallet key
```

### Smart Contracts

#### Deployment (REQUIRED)
```bash
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY  # REQUIRED
RPC_URL_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY  # REQUIRED for verification
```

## JWT Secret Rotation

### Overview

JWT signing secrets are automatically rotated every 90 days to maintain security best practices and limit the impact of potential secret compromise. The rotation process is fully automated with zero-downtime and comprehensive audit logging.

### Rotation Schedule

- **Frequency**: Every 90 days (configurable)
- **Execution**: Automated via GitHub Actions scheduled workflow
- **Time**: 2:00 AM UTC on Sundays (configurable)
- **Grace Period**: 48 hours for old tokens to remain valid

### Rotation Process

#### 1. Pre-Rotation Validation

```bash
# Health check before rotation
curl -f https://api.example.com/health || exit 1

# Verify rotation is needed (90-day policy)
./scripts/rotate-jwt-secrets.sh --dry-run
```

#### 2. Secret Generation

New secrets are generated using cryptographically secure random number generation:

```bash
# Generate 64-byte base64-encoded secrets
NEW_JWT_SECRET=$(openssl rand -base64 64)
NEW_JWT_REFRESH_SECRET=$(openssl rand -base64 64)
```

**Security Requirements:**
- Minimum 64 bytes (512 bits) of entropy
- Base64-encoded for safe storage
- Generated using OpenSSL CSPRNG
- Never reused across rotations

#### 3. Secret Storage Update

Secrets are updated in the configured secrets backend with previous values preserved:

**AWS Secrets Manager:**
```bash
aws secretsmanager update-secret \
  --secret-id takumi/production/jwt \
  --secret-string '{
    "JWT_SECRET": "<new_secret>",
    "JWT_REFRESH_SECRET": "<new_refresh_secret>",
    "JWT_SECRET_PREVIOUS": "<old_secret>",
    "JWT_REFRESH_SECRET_PREVIOUS": "<old_refresh_secret>"
  }'
```

**HashiCorp Vault:**
```bash
vault kv put secret/takumi/production \
  JWT_SECRET="<new_secret>" \
  JWT_REFRESH_SECRET="<new_refresh_secret>" \
  JWT_SECRET_PREVIOUS="<old_secret>" \
  JWT_REFRESH_SECRET_PREVIOUS="<old_refresh_secret>"
```

**Kubernetes Secrets:**
```bash
kubectl create secret generic takumi-jwt-secrets \
  --from-literal=JWT_SECRET="<new_secret>" \
  --from-literal=JWT_REFRESH_SECRET="<new_refresh_secret>" \
  --from-literal=JWT_SECRET_PREVIOUS="<old_secret>" \
  --from-literal=JWT_REFRESH_SECRET_PREVIOUS="<old_refresh_secret>" \
  --dry-run=client -o yaml | kubectl apply -f -
```

#### 4. Zero-Downtime Deployment

Services are restarted using rolling updates to prevent downtime:

**Kubernetes:**
```bash
# Trigger rolling restart
kubectl rollout restart deployment/takumi-backend

# Wait for rollout to complete
kubectl rollout status deployment/takumi-backend --timeout=5m
```

**Docker Compose:**
```bash
# Rolling restart with health checks
docker-compose up -d --no-deps --build backend
```

#### 5. Grace Period (48 Hours)

During the grace period:
- New tokens are signed with `JWT_SECRET`
- Old tokens are verified against both `JWT_SECRET` and `JWT_SECRET_PREVIOUS`
- Users experience no interruption
- Active sessions remain valid

**Implementation in JWT verification:**
```typescript
// Verify token with new secret first, fallback to previous
try {
  return jwt.verify(token, process.env.JWT_SECRET);
} catch (error) {
  if (process.env.JWT_SECRET_PREVIOUS) {
    return jwt.verify(token, process.env.JWT_SECRET_PREVIOUS);
  }
  throw error;
}
```

#### 6. Post-Rotation Validation

```bash
# Health check after rotation
curl -f https://api.example.com/health

# Test JWT token generation
curl -X POST https://api.example.com/api/v1/auth/test

# Verify old tokens still work (grace period)
curl -H "Authorization: Bearer <old_token>" \
  https://api.example.com/api/v1/profile
```

### Manual Rotation

#### Emergency Rotation (Secret Compromise)

If a secret is compromised, perform immediate rotation:

```bash
# Force rotation regardless of 90-day policy
./scripts/rotate-jwt-secrets.sh --force

# Or via GitHub Actions
gh workflow run jwt-rotation.yml \
  -f environment=production \
  -f force=true \
  -f dry_run=false
```

**Emergency Rotation Checklist:**
1. ✅ Confirm secret compromise
2. ✅ Execute forced rotation
3. ✅ Verify health checks pass
4. ✅ Monitor error rates and authentication failures
5. ✅ Document incident in audit log
6. ✅ Review access logs for unauthorized usage
7. ✅ Update incident response documentation

#### Dry Run Testing

Test rotation process without making changes:

```bash
# Local dry run
./scripts/rotate-jwt-secrets.sh --dry-run

# CI/CD dry run
gh workflow run jwt-rotation.yml \
  -f environment=staging \
  -f dry_run=true
```

### Audit Logging

#### Rotation Audit Log

All rotations are logged to `logs/jwt-rotation/rotation-audit.log`:

```
[2025-11-25T02:00:15Z] [INFO] === JWT Secret Rotation Started ===
[2025-11-25T02:00:15Z] [INFO] Environment: production
[2025-11-25T02:00:15Z] [INFO] Secrets Backend: aws-secrets-manager
[2025-11-25T02:00:16Z] [WARNING] Rotation needed: 91 days since last rotation
[2025-11-25T02:00:17Z] [SUCCESS] Current secrets fetched successfully
[2025-11-25T02:00:18Z] [SUCCESS] New secrets generated (length: 64 bytes each)
[2025-11-25T02:00:20Z] [SUCCESS] AWS Secrets Manager updated
[2025-11-25T02:00:35Z] [SUCCESS] Rolling restart completed successfully
[2025-11-25T02:00:40Z] [SUCCESS] Health check passed
[2025-11-25T02:00:41Z] [SUCCESS] Rotation recorded in audit history
[2025-11-25T02:00:41Z] [SUCCESS] === JWT Secret Rotation Completed Successfully ===
```

#### Rotation History

Rotation history is maintained in `logs/jwt-rotation/rotation-history.json`:

```json
{
  "rotations": [
    {
      "id": "a7f3c8e9-4b2d-4a1c-9f6e-8d5c7b3a2e1f",
      "timestamp": "2025-11-25T02:00:41Z",
      "environment": "production",
      "secrets_backend": "aws-secrets-manager",
      "operator": "github-actions",
      "dry_run": false,
      "success": true
    },
    {
      "id": "b8e4d9f0-5c3e-4b2d-0g7f-9e6d8c4b3f2g",
      "timestamp": "2025-08-26T02:00:35Z",
      "environment": "production",
      "secrets_backend": "aws-secrets-manager",
      "operator": "github-actions",
      "dry_run": false,
      "success": true
    }
  ]
}
```

**Audit Log Retention:**
- Rotation logs: 90 days minimum
- Rotation history: Indefinite (version controlled)
- GitHub Actions artifacts: 90 days

### Operational Procedures

#### Monitoring Rotation Status

```bash
# Check last rotation date
jq -r '.rotations[-1].timestamp' logs/jwt-rotation/rotation-history.json

# Check days since last rotation
LAST_ROTATION=$(jq -r '.rotations[-1].timestamp' logs/jwt-rotation/rotation-history.json)
DAYS_SINCE=$(( ($(date +%s) - $(date -d "$LAST_ROTATION" +%s)) / 86400 ))
echo "Days since last rotation: $DAYS_SINCE"

# Check next scheduled rotation
gh workflow view jwt-rotation.yml
```

#### Troubleshooting Failed Rotations

**Symptom: Rotation fails during secret update**

```bash
# Check secrets backend connectivity
aws secretsmanager describe-secret --secret-id takumi/production/jwt

# Verify IAM permissions
aws sts get-caller-identity

# Check audit logs
tail -n 50 logs/jwt-rotation/rotation-audit.log
```

**Symptom: Health checks fail after rotation**

```bash
# Check application logs
kubectl logs -l app=takumi-backend --tail=100

# Verify secrets loaded correctly
kubectl exec -it deployment/takumi-backend -- env | grep JWT_SECRET

# Rollback if necessary
kubectl rollout undo deployment/takumi-backend
```

**Symptom: Authentication failures spike**

```bash
# Check if grace period is active
jq -r '.rotations[-1].timestamp' logs/jwt-rotation/rotation-history.json

# Verify JWT_SECRET_PREVIOUS is set
aws secretsmanager get-secret-value \
  --secret-id takumi/production/jwt \
  --query SecretString --output text | jq -r '.JWT_SECRET_PREVIOUS'

# Monitor error rates
curl https://api.example.com/metrics | grep jwt_verification_errors
```

#### Compliance and Reporting

**Monthly Rotation Report:**

```bash
# Generate rotation report for last 90 days
jq '.rotations[] | select(.timestamp > "2025-08-25T00:00:00Z")' \
  logs/jwt-rotation/rotation-history.json

# Count successful rotations
jq '[.rotations[] | select(.success == true)] | length' \
  logs/jwt-rotation/rotation-history.json
```

**Compliance Checklist:**
- ✅ Rotations occur every 90 days maximum
- ✅ All rotations are logged and auditable
- ✅ Secrets are generated with sufficient entropy (≥512 bits)
- ✅ Previous secrets are preserved during grace period
- ✅ Zero-downtime deployment verified
- ✅ Post-rotation health checks pass
- ✅ Audit logs retained for minimum 90 days

### Security Best Practices

#### Secret Generation

✅ **DO:**
- Use cryptographically secure random number generators (OpenSSL, /dev/urandom)
- Generate minimum 64 bytes (512 bits) of entropy
- Base64-encode for safe storage and transmission
- Verify uniqueness (never reuse previous secrets)

❌ **NEVER:**
- Use predictable patterns or weak random sources
- Reuse secrets across environments or rotations
- Generate secrets shorter than 32 bytes
- Store secrets in plaintext logs or version control

#### Rotation Timing

✅ **DO:**
- Rotate every 90 days maximum
- Schedule during low-traffic periods (2-4 AM)
- Allow 48-hour grace period for old tokens
- Perform emergency rotation immediately upon compromise

❌ **NEVER:**
- Skip scheduled rotations
- Rotate during peak traffic without testing
- Remove old secrets before grace period expires
- Delay emergency rotation when compromise is confirmed

#### Access Control

✅ **DO:**
- Restrict rotation script execution to CI/CD and authorized operators
- Use IAM roles with least-privilege permissions
- Require MFA for manual rotation triggers
- Audit all rotation executions

❌ **NEVER:**
- Allow unrestricted access to rotation scripts
- Use long-lived credentials for secrets backend access
- Share rotation credentials across teams
- Skip audit logging for manual rotations

### Monitoring Stack

#### Grafana (REQUIRED)
```bash
GRAFANA_ADMIN_USER=your_admin_username
GRAFANA_ADMIN_PASSWORD=your_secure_password  # REQUIRED
```

#### Alertmanager (OPTIONAL)
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_EMAIL=alerts@yourdomain.com
ALERT_SMTP_USER=your_smtp_user
ALERT_SMTP_PASSWORD=your_smtp_password
```

## Generating Secure Secrets

### JWT Secrets (32+ bytes, base64)
```bash
openssl rand -base64 32
```

### API Keys (32+ bytes, hex)
```bash
openssl rand -hex 32
```

### Passwords (24+ bytes, base64)
```bash
openssl rand -base64 24
```

### Ethereum Wallet (for contract deployment)
```bash
cast wallet new
# Save the private key securely
```

### Webhook Secrets
```bash
openssl rand -hex 32
```

## Environment File Structure

### Development (.env files)

```
takumi/
├── .env                           # Monitoring stack variables (NEVER commit)
├── .env.example                   # Monitoring template (committed to git)
├── backend/
│   ├── .env                       # Backend variables (NEVER commit)
│   ├── .env.development.example   # Development template (committed to git)
│   ├── .env.test.example          # Test template (committed to git)
│   └── .env.production.example    # Production template (committed to git)
└── contracts/
    ├── .env                       # Contract deployment (NEVER commit)
    └── .env.example               # Template (committed to git)
```

**Environment-Specific Templates**:
- `.env.development.example` - Local development with relaxed security, verbose logging
- `.env.test.example` - CI/CD testing with mock services, minimal logging
- `.env.production.example` - Production with strict security, all secrets required

**Usage**:
```bash
# Development
cp backend/.env.development.example backend/.env
# Edit .env with development secrets

# Test
cp backend/.env.test.example backend/.env.test
# Edit .env.test with test secrets

# Production
cp backend/.env.production.example backend/.env
# Edit .env with production secrets (or use secrets manager)
```

### Production (Secure Vaults)

**CRITICAL**: Production deployments MUST use secure secret management. Raw `.env` files are PROHIBITED.

#### Secrets Backend Configuration

Takumi supports multiple secrets backends via the `SECRETS_BACKEND` environment variable:

```bash
# AWS Secrets Manager (recommended for AWS deployments)
SECRETS_BACKEND=aws-secrets-manager
AWS_REGION=us-east-1

# HashiCorp Vault (recommended for on-premise/multi-cloud)
SECRETS_BACKEND=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=s.xxxxxxxxxxxxxxxx
VAULT_PATH=secret/takumi/production

# Environment Variables (DEVELOPMENT/TEST ONLY)
SECRETS_BACKEND=env
```

**Production Enforcement**: Application will refuse to start if `NODE_ENV=production` and `SECRETS_BACKEND=env`.

#### AWS Secrets Manager

**Storing Secrets**:
```bash
# Store database password
aws secretsmanager create-secret \
  --name takumi/production/DB_PASSWORD \
  --secret-string "your_secure_password"

# Store JWT secret
aws secretsmanager create-secret \
  --name takumi/production/JWT_SECRET \
  --secret-string "$(openssl rand -base64 32)"

# Store admin API key
aws secretsmanager create-secret \
  --name takumi/production/ADMIN_API_KEY \
  --secret-string "$(openssl rand -hex 32)"
```

**Application Integration**:
```typescript
import { getRequiredSecret } from './config/secrets';

// Automatically loads from AWS Secrets Manager when SECRETS_BACKEND=aws-secrets-manager
const dbPassword = await getRequiredSecret('DB_PASSWORD');
const jwtSecret = await getRequiredSecret('JWT_SECRET');
```

**IAM Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:takumi/production/*"
    }
  ]
}
```

#### HashiCorp Vault

**Storing Secrets**:
```bash
# Enable KV secrets engine
vault secrets enable -path=secret kv-v2

# Store all production secrets
vault kv put secret/takumi/production \
  DB_PASSWORD="your_secure_password" \
  JWT_SECRET="$(openssl rand -base64 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -base64 32)" \
  ADMIN_API_KEY="$(openssl rand -hex 32)" \
  REDIS_PASSWORD="your_redis_password"

# Read individual secret
vault kv get -field=DB_PASSWORD secret/takumi/production
```

**Application Integration**:
```typescript
import { getRequiredSecret } from './config/secrets';

// Automatically loads from Vault when SECRETS_BACKEND=vault
const dbPassword = await getRequiredSecret('DB_PASSWORD');
const jwtSecret = await getRequiredSecret('JWT_SECRET');
```

**Vault Policy**:
```hcl
# Policy: takumi-production-read
path "secret/data/takumi/production" {
  capabilities = ["read"]
}

path "secret/metadata/takumi/production" {
  capabilities = ["read", "list"]
}
```

Apply policy:
```bash
vault policy write takumi-production-read policy.hcl
vault token create -policy=takumi-production-read
```

#### Docker Secrets (Swarm Mode)
```bash
# Create secret
echo "your_secure_password" | docker secret create db_password -

# Use in docker-compose.yml
services:
  backend:
    secrets:
      - db_password
secrets:
  db_password:
    external: true
```

#### Docker Compose with .env Files (Recommended for Non-Swarm)
```bash
# Set restrictive permissions on .env files
chmod 600 backend/.env
chmod 600 .env

# Verify permissions
ls -la backend/.env  # Should show: -rw------- (600)

# Docker Compose automatically loads .env from project directory
docker-compose up -d
```

## Code Implementation

### Secrets Manager Integration

Takumi uses a centralized secrets manager (`backend/src/config/secrets.ts`) that supports multiple backends:

```typescript
import { getRequiredSecret, getOptionalSecret } from './config/secrets';

// Load required secret (throws if missing)
const dbPassword = await getRequiredSecret('DB_PASSWORD');
const jwtSecret = await getRequiredSecret('JWT_SECRET');

// Load optional secret (returns undefined if missing)
const slackWebhook = await getOptionalSecret('SLACK_WEBHOOK_URL');
```

**Features**:
- **Multi-backend support**: AWS Secrets Manager, HashiCorp Vault, environment variables
- **Automatic caching**: Secrets cached for 5 minutes to reduce API calls
- **Production enforcement**: Refuses to use environment variables in production
- **Fail-fast validation**: Application won't start if required secrets are missing

### Validation Pattern

All configuration modules validate required secrets at startup:

```typescript
// ✅ CORRECT: Load from secrets manager with validation
const dbPassword = await getRequiredSecret('DB_PASSWORD');
if (!dbPassword) {
  throw new Error('DB_PASSWORD is required');
}
```

```typescript
// ❌ WRONG: Using default values for secrets
const dbPassword = process.env.DB_PASSWORD || 'password';  // NEVER DO THIS
```

```typescript
// ❌ WRONG: Direct environment variable access in production
const dbPassword = process.env.DB_PASSWORD;  // Use getRequiredSecret() instead
```

### Hashing Sensitive Tokens Before Database Storage

**CRITICAL**: Never store plaintext API keys, tokens, or credentials in the database.

```typescript
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// ✅ CORRECT: Hash API keys before storing
async function createApiKey(userId: string): Promise<{ key: string; hash: string }> {
  // Generate cryptographically secure API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  // Hash before storing in database
  const hash = await bcrypt.hash(apiKey, 12);
  
  // Store hash in database, return plaintext key to user ONCE
  await db.query(
    'INSERT INTO api_keys (user_id, key_hash, created_at) VALUES ($1, $2, NOW())',
    [userId, hash]
  );
  
  return { key: apiKey, hash }; // Show key to user once, store hash only
}

// ✅ CORRECT: Verify API key against hash
async function verifyApiKey(providedKey: string): Promise<boolean> {
  const result = await db.query(
    'SELECT key_hash FROM api_keys WHERE revoked = false'
  );
  
  for (const row of result.rows) {
    if (await bcrypt.compare(providedKey, row.key_hash)) {
      return true;
    }
  }
  
  return false;
}

// ❌ WRONG: Storing plaintext API keys
await db.query(
  'INSERT INTO api_keys (user_id, api_key) VALUES ($1, $2)',
  [userId, apiKey]  // NEVER store plaintext!
);
```

### Examples in Codebase

- `backend/src/config/secrets.ts` - **Centralized secrets manager** with multi-backend support
- `backend/src/config/database.ts` - Database configuration with SSL enforcement and secrets integration
- `backend/src/config/redis.ts` - Redis configuration with validation
- `backend/src/middleware/auth.ts` - JWT secret validation
- `backend/src/services/email.service.ts` - SMTP credentials validation
- `backend/src/services/storage.service.ts` - Storage credentials validation

### Database Configuration Example

```typescript
import { getRequiredSecret } from './secrets';

// Load password from secrets manager in production
if (process.env.NODE_ENV === 'production' && process.env.SECRETS_BACKEND !== 'env') {
  const dbPassword = await getRequiredSecret('DB_PASSWORD');
  poolConfig.password = dbPassword;
  logger.info('Loaded database password from secrets manager');
}

// SSL/TLS enforcement
if (isProduction && !sslEnabled) {
  throw new Error(
    'CRITICAL SECURITY ERROR: Database SSL/TLS is REQUIRED in production'
  );
}
```

## Secret Rotation

### Regular Rotation Schedule

- **Database passwords**: Every 90 days
- **API keys**: Every 90 days
- **JWT secrets**: Every 180 days
- **Admin keys**: After any team member departure
- **Deployment keys**: After any security incident

### Rotation Process

1. **Generate new secret** using secure method
2. **Update in vault/secret manager**
3. **Deploy updated configuration** (rolling update)
4. **Verify application health**
5. **Revoke old secret** after grace period
6. **Document rotation** in security log

## Audit Checklist

Use this checklist to verify secrets are properly managed:

### Code and Configuration
- [ ] All `.env` files are in `.gitignore`
- [ ] No secrets in git history (`git log -p | grep -i password`)
- [ ] All required environment variables documented in `.env.example`
- [ ] Application fails to start if required secrets missing
- [ ] No default values for secrets in code
- [ ] All secrets loaded via `getRequiredSecret()` or `getOptionalSecret()`
- [ ] No direct `process.env` access for sensitive values in production code

### Production Environment
- [ ] `SECRETS_BACKEND` set to `aws-secrets-manager` or `vault` (NOT `env`)
- [ ] Production uses secure vault (AWS Secrets Manager or HashiCorp Vault)
- [ ] Database SSL/TLS enabled (`DB_SSL=true`)
- [ ] SSL certificate validation enabled (`DB_SSL_REJECT_UNAUTHORIZED=true`)
- [ ] Application refuses to start without SSL in production

### Access Control
- [ ] IAM roles/Vault policies follow least privilege principle
- [ ] Secrets rotated according to schedule (every 90 days)
- [ ] Team members have minimum required access to secrets
- [ ] Audit logging enabled for secrets access

### Monitoring
- [ ] Secrets not logged in application logs
- [ ] Monitoring alerts configured for failed authentication
- [ ] Alerts for secrets manager API failures
- [ ] Alerts for SSL/TLS connection failures

## Backup Encryption Key Management

### Overview

**CRITICAL**: All backups (database, contracts, uploads) are encrypted at-rest using AES-256-GCM before off-site or cloud upload. Encryption keys MUST be managed securely and NEVER stored alongside backups.

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes, randomly generated per backup)
- **Authentication**: Built-in AEAD (Authenticated Encryption with Associated Data)

### Generating Backup Encryption Keys

```bash
# Generate 256-bit encryption key (64 hex characters)
openssl rand -hex 32 > /secure/path/backup-encryption.key

# Set restrictive permissions (REQUIRED)
chmod 600 /secure/path/backup-encryption.key

# Verify permissions
ls -la /secure/path/backup-encryption.key
# Should show: -rw------- (600)
```

### Key Storage Requirements

**✅ SECURE Storage Locations**:

1. **AWS Secrets Manager** (Recommended for AWS deployments)
   ```bash
   # Store encryption key in AWS Secrets Manager
   aws secretsmanager create-secret \
     --name takumi/production/BACKUP_ENCRYPTION_KEY \
     --secret-string "$(cat backup-encryption.key)"
   
   # Retrieve key for backup operations
   aws secretsmanager get-secret-value \
     --secret-id takumi/production/BACKUP_ENCRYPTION_KEY \
     --query SecretString --output text > /tmp/backup.key
   ```

2. **HashiCorp Vault** (Recommended for on-premise/multi-cloud)
   ```bash
   # Store encryption key in Vault
   vault kv put secret/takumi/production/backup-encryption \
     key="$(cat backup-encryption.key)"
   
   # Retrieve key for backup operations
   vault kv get -field=key secret/takumi/production/backup-encryption > /tmp/backup.key
   ```

3. **Hardware Security Module (HSM)** (Enterprise deployments)
   - Store master key in HSM
   - Use HSM for key derivation
   - Requires HSM integration setup

4. **Encrypted USB Drive** (Air-gapped cold storage)
   - Store key on encrypted USB drive
   - Keep in physical safe
   - Use only for disaster recovery

**❌ NEVER Store Keys In**:

- Same directory as backups
- Version control (git)
- Unencrypted cloud storage
- Email or messaging systems
- Application logs
- Database
- Container images
- CI/CD pipeline logs

### Environment Configuration

```bash
# Enable backup encryption (default: true)
export BACKUP_ENCRYPTION_ENABLED=true

# Path to encryption key file (REQUIRED when encryption enabled)
export BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup-encryption.key

# For AWS Secrets Manager integration
export BACKUP_ENCRYPTION_KEY_FILE=/tmp/backup.key
# Retrieve key before backup:
aws secretsmanager get-secret-value \
  --secret-id takumi/production/BACKUP_ENCRYPTION_KEY \
  --query SecretString --output text > /tmp/backup.key
chmod 600 /tmp/backup.key
```

### Backup Scripts Integration

All backup scripts now support encryption:

```bash
# Database backup with encryption
BACKUP_ENCRYPTION_ENABLED=true \
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/backup-database.sh

# Contract snapshot with encryption
BACKUP_ENCRYPTION_ENABLED=true \
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/snapshot-contracts.sh

# Automated backup (uses same env vars)
BACKUP_ENCRYPTION_ENABLED=true \
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/automated-backup.sh
```

### Restore Operations

Use dedicated restore scripts for encrypted backups:

```bash
# Restore encrypted database backup
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/restore-database-encrypted.sh /path/to/backup.sql.gz.enc

# Restore encrypted contract snapshot
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/restore-contracts-encrypted.sh /path/to/snapshot.tar.gz.enc
```

### Key Rotation Procedures

**Rotation Schedule**: Every 180 days (6 months) or immediately after:
- Security incident
- Team member departure with key access
- Suspected key compromise
- Compliance requirement

**Rotation Process**:

```bash
# 1. Generate new encryption key
openssl rand -hex 32 > /secure/path/backup-encryption-new.key
chmod 600 /secure/path/backup-encryption-new.key

# 2. Re-encrypt existing backups with new key (optional but recommended)
for backup in /var/backups/takumi/database/*.sql.gz.enc; do
  # Decrypt with old key
  OLD_KEY=$(cat /secure/path/backup-encryption.key)
  IV=$(cat "${backup}.iv")
  TEMP_DECRYPTED="/tmp/reencrypt_$$.sql.gz"
  
  openssl enc -aes-256-gcm -d \
    -in "${backup}" \
    -out "${TEMP_DECRYPTED}" \
    -K "${OLD_KEY}" \
    -iv "${IV}" \
    -pbkdf2
  
  # Encrypt with new key
  NEW_KEY=$(cat /secure/path/backup-encryption-new.key)
  NEW_IV=$(openssl rand -hex 12)
  NEW_BACKUP="${backup}.new"
  
  openssl enc -aes-256-gcm \
    -in "${TEMP_DECRYPTED}" \
    -out "${NEW_BACKUP}" \
    -K "${NEW_KEY}" \
    -iv "${NEW_IV}" \
    -pbkdf2
  
  echo "${NEW_IV}" > "${NEW_BACKUP}.iv"
  sha256sum "${NEW_BACKUP}" > "${NEW_BACKUP}.sha256"
  
  # Replace old backup
  mv "${NEW_BACKUP}" "${backup}"
  mv "${NEW_BACKUP}.iv" "${backup}.iv"
  mv "${NEW_BACKUP}.sha256" "${backup}.sha256"
  
  # Cleanup
  rm -f "${TEMP_DECRYPTED}"
done

# 3. Update key in secrets manager
aws secretsmanager update-secret \
  --secret-id takumi/production/BACKUP_ENCRYPTION_KEY \
  --secret-string "$(cat /secure/path/backup-encryption-new.key)"

# 4. Replace old key file
mv /secure/path/backup-encryption.key /secure/path/backup-encryption-old.key
mv /secure/path/backup-encryption-new.key /secure/path/backup-encryption.key

# 5. Test restore with new key
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/test-encrypted-backup-restore.sh

# 6. Securely delete old key after grace period (30 days)
# Keep old key for 30 days in case old backups need recovery
shred -vfz -n 10 /secure/path/backup-encryption-old.key
```

### Key Backup and Recovery

**Primary Key Storage**: AWS Secrets Manager or HashiCorp Vault

**Backup Key Storage** (for disaster recovery):

1. **Encrypted USB Drive** (offline, physical safe)
   ```bash
   # Encrypt key file before storing on USB
   gpg --symmetric --cipher-algo AES256 backup-encryption.key
   # Store backup-encryption.key.gpg on encrypted USB
   # Keep USB in physical safe with restricted access
   ```

2. **Paper Backup** (extreme disaster recovery)
   ```bash
   # Print key as QR code for paper backup
   qrencode -o backup-key-qr.png < backup-encryption.key
   # Print and store in safe deposit box
   # Destroy digital copy of QR code after printing
   ```

3. **Multi-Party Secret Sharing** (Shamir's Secret Sharing)
   ```bash
   # Split key into 5 shares, require 3 to reconstruct
   ssss-split -t 3 -n 5 < backup-encryption.key
   # Distribute shares to 5 trusted parties
   # Any 3 can reconstruct the key in emergency
   ```

### Verification and Testing

**Automated Integrity Tests** (run weekly via cron):

```bash
# Test encryption and restore workflow
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/test-encrypted-backup-restore.sh

# Verify all encrypted backups
BACKUP_ENCRYPTION_KEY_FILE=/secure/path/backup.key \
./scripts/verify-encrypted-backups.sh
```

**Manual Verification** (quarterly):

1. Select random encrypted backup
2. Decrypt and restore to test environment
3. Verify data integrity
4. Document test results in `docs/DISASTER_RECOVERY.md`

### Compliance and Audit

**Audit Trail Requirements**:

- Log all key access (via Secrets Manager/Vault audit logs)
- Document key rotation dates
- Maintain key version history
- Record backup encryption/decryption operations

**Compliance Standards**:

- **SOC 2**: Encryption at-rest for sensitive data
- **GDPR**: Data protection by design and default
- **HIPAA**: Encryption of ePHI at rest
- **PCI DSS**: Strong cryptography for cardholder data

### Emergency Key Recovery

If encryption key is lost:

1. **Check all backup locations**:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Encrypted USB drive
   - Paper backup / QR code
   - Secret sharing participants

2. **If key cannot be recovered**:
   - Encrypted backups are **permanently unrecoverable**
   - Create new backups immediately with new key
   - Document incident in security log
   - Review key management procedures

**Prevention**: Always maintain multiple secure copies of encryption keys in geographically distributed locations.

## Incident Response

If secrets are compromised:

1. **Immediately rotate** all affected secrets
2. **Review access logs** for unauthorized access
3. **Notify security team** and stakeholders
4. **Update incident log** with details
5. **Review and improve** security practices
6. **Consider** rotating all secrets as precaution

If backup encryption key is compromised:

1. **Generate new encryption key immediately**
2. **Re-encrypt all existing backups** with new key
3. **Rotate key in all storage locations** (Secrets Manager, Vault, USB, etc.)
4. **Audit backup access logs** for unauthorized decryption attempts
5. **Document incident** and update key rotation schedule

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App: Config](https://12factor.net/config)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
