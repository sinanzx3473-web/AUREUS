# Database Security and Connectivity

## Overview

This document outlines Takumi's database security architecture, SSL/TLS enforcement, connection management, and secrets handling for PostgreSQL database connectivity.

## Security Principles

### Production Requirements

**CRITICAL**: The following are MANDATORY for production deployments:

1. **SSL/TLS Encryption**: All database connections MUST use SSL/TLS encryption
2. **Secrets Management**: Database credentials MUST be loaded from secure vault (AWS Secrets Manager or HashiCorp Vault)
3. **No Plaintext Credentials**: Raw `.env` files with plaintext passwords are PROHIBITED in production
4. **Certificate Validation**: SSL certificates MUST be validated (`rejectUnauthorized: true`)
5. **Connection Pooling**: Use connection pooling with appropriate limits to prevent resource exhaustion

### Development/Test Environments

Development and test environments MAY use:
- Environment variables from `.env` files (never committed to git)
- Unencrypted connections (for local development only)
- Self-signed certificates with `rejectUnauthorized: false`

## SSL/TLS Configuration

### Enforcement in Production

The database configuration enforces SSL/TLS in production:

```typescript
// CRITICAL: Production MUST use SSL/TLS - no fallback to unencrypted
if (isProduction && !sslEnabled) {
  throw new Error(
    'CRITICAL SECURITY ERROR: Database SSL/TLS is REQUIRED in production. Set DB_SSL=true'
  );
}
```

**Application will refuse to start** if SSL is not enabled in production.

### SSL Configuration Options

#### Basic SSL (Recommended for Most Cases)

```bash
# Enable SSL with default certificate validation
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

#### Custom CA Certificate

For self-hosted databases or custom certificate authorities:

```bash
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=/path/to/ca-certificate.crt
```

#### Mutual TLS (mTLS)

For maximum security with client certificate authentication:

```bash
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=/path/to/ca-certificate.crt
DB_SSL_CERT=/path/to/client-certificate.crt
DB_SSL_KEY=/path/to/client-key.key
```

#### Development Only - Disable Certificate Validation

**WARNING**: Only use in development with self-signed certificates:

```bash
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false  # DEVELOPMENT ONLY
```

### SSL Configuration in Code

```typescript
const poolConfig: PoolConfig = {
  // ... other config
  ssl: sslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY,
      }
    : false,
};
```

## Secrets Management Integration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Startup                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Secrets Manager Initialization                  │
│  (AWS Secrets Manager / HashiCorp Vault / Env Vars)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Load DB_PASSWORD from Secrets Backend              │
│              (Cached for 5 minutes)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Initialize PostgreSQL Connection Pool                │
│              with SSL/TLS Enabled                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          Encrypted Database Connections                      │
│         (TLS 1.2+ with Certificate Validation)               │
└─────────────────────────────────────────────────────────────┘
```

### Secrets Backend Selection

Configure via `SECRETS_BACKEND` environment variable:

```bash
# Production: AWS Secrets Manager
SECRETS_BACKEND=aws-secrets-manager
AWS_REGION=us-east-1

# Production: HashiCorp Vault
SECRETS_BACKEND=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=s.xxxxxxxxxxxxxxxx
VAULT_PATH=secret/takumi/production

# Development/Test: Environment Variables
SECRETS_BACKEND=env
DB_PASSWORD=dev_password
```

### AWS Secrets Manager Integration

#### Storing Database Password

```bash
# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name takumi/production/DB_PASSWORD \
  --description "Takumi production database password" \
  --secret-string "your_secure_database_password"

# Rotate secret
aws secretsmanager rotate-secret \
  --secret-id takumi/production/DB_PASSWORD \
  --rotation-lambda-arn arn:aws:lambda:region:account:function:rotation-function
```

#### Application Configuration

```bash
# Environment variables for AWS Secrets Manager
SECRETS_BACKEND=aws-secrets-manager
AWS_REGION=us-east-1
# AWS credentials via IAM role (recommended) or environment variables
```

#### IAM Policy for Application

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
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:takumi/production/*"
      ]
    }
  ]
}
```

### HashiCorp Vault Integration

#### Storing Database Password

```bash
# Enable KV secrets engine (if not already enabled)
vault secrets enable -path=secret kv-v2

# Store database password
vault kv put secret/takumi/production \
  DB_PASSWORD="your_secure_database_password" \
  DB_USER="takumi_prod" \
  DB_HOST="prod-db.example.com"

# Read secret
vault kv get -field=DB_PASSWORD secret/takumi/production
```

#### Application Configuration

```bash
# Environment variables for Vault
SECRETS_BACKEND=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=s.xxxxxxxxxxxxxxxx
VAULT_PATH=secret/takumi/production
```

#### Vault Policy for Application

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
vault policy write takumi-production-read takumi-policy.hcl
vault token create -policy=takumi-production-read
```

### Environment Variables (Development Only)

**WARNING**: Only use for local development and testing.

```bash
# .env file (NEVER commit to git)
SECRETS_BACKEND=env
DB_PASSWORD=dev_password_change_me
DB_USER=postgres
DB_HOST=localhost
```

## Connection Pool Configuration

### Pool Settings

```bash
# Minimum connections in pool
DB_POOL_MIN=2

# Maximum connections in pool
DB_POOL_MAX=10

# Connection timeout (milliseconds)
DB_CONNECTION_TIMEOUT=2000

# Idle timeout (milliseconds)
DB_IDLE_TIMEOUT=30000
```

### Recommended Pool Sizes

| Environment | Min | Max | Reasoning |
|-------------|-----|-----|-----------|
| Development | 2   | 5   | Low concurrency, fast iteration |
| Test        | 1   | 3   | Isolated tests, minimal overhead |
| Staging     | 5   | 20  | Production-like load testing |
| Production  | 10  | 50  | High concurrency, auto-scaling |

### Pool Size Calculation

**Formula**: `max_pool_size = (available_db_connections / number_of_app_instances) * 0.8`

Example:
- PostgreSQL max_connections: 200
- Application instances: 4
- Pool size per instance: `(200 / 4) * 0.8 = 40`

## Database Connection Flow

### Initialization Sequence

1. **Load Configuration**: Read environment variables and validate required settings
2. **SSL Validation**: Verify SSL is enabled in production
3. **Secrets Loading**: Fetch database password from secrets manager (production only)
4. **Pool Creation**: Initialize connection pool with SSL configuration
5. **Connection Test**: Establish initial connection to verify credentials and SSL
6. **Event Handlers**: Register error and connection event handlers
7. **Ready**: Application ready to serve requests

### Code Implementation

```typescript
// Initialize pool with async password loading
const initializePool = async (): Promise<Pool> => {
  // Load password from secrets manager in production
  if (process.env.NODE_ENV === 'production' && process.env.SECRETS_BACKEND !== 'env') {
    const dbPassword = await getRequiredSecret('DB_PASSWORD');
    poolConfig.password = dbPassword;
    logger.info('Loaded database password from secrets manager');
  }

  const pool = new Pool(poolConfig);
  
  pool.on('connect', (client) => {
    logger.info('Database connection established', {
      ssl: sslEnabled,
      host: poolConfig.host,
      database: poolConfig.database,
    });
  });

  pool.on('error', (err) => {
    logger.error('Unexpected database error', err);
    process.exit(-1);
  });

  return pool;
};
```

## Security Best Practices

### ✅ DO

- **Use SSL/TLS** for all production database connections
- **Validate certificates** with `rejectUnauthorized: true` in production
- **Load secrets** from secure vault (AWS Secrets Manager, HashiCorp Vault)
- **Rotate credentials** regularly (every 90 days minimum)
- **Use connection pooling** to prevent resource exhaustion
- **Monitor connections** with logging and metrics
- **Use least privilege** database user with minimal required permissions
- **Enable audit logging** on database server
- **Use prepared statements** to prevent SQL injection
- **Encrypt backups** with separate encryption keys

### ❌ NEVER

- **NEVER use unencrypted connections** in production
- **NEVER disable certificate validation** in production (`rejectUnauthorized: false`)
- **NEVER store plaintext passwords** in `.env` files in production
- **NEVER commit `.env` files** to version control
- **NEVER use default database passwords**
- **NEVER share database credentials** across environments
- **NEVER log database passwords** in application logs
- **NEVER use root/superuser** database accounts for application connections

## Monitoring and Auditing

### Connection Metrics

Monitor these metrics for database health:

- **Active connections**: Current number of active connections
- **Idle connections**: Connections in pool but not in use
- **Connection errors**: Failed connection attempts
- **Query duration**: Average and p95 query execution time
- **SSL handshake time**: Time to establish encrypted connection

### Audit Logging

Enable PostgreSQL audit logging for security events:

```sql
-- Enable connection logging
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';

-- Enable statement logging for DDL and DCL
ALTER SYSTEM SET log_statement = 'ddl';

-- Reload configuration
SELECT pg_reload_conf();
```

### Security Alerts

Configure alerts for:

- Failed authentication attempts (threshold: 5 in 5 minutes)
- Unencrypted connection attempts (threshold: 1)
- Connection pool exhaustion (threshold: 90% of max)
- Slow queries (threshold: >5 seconds)
- Certificate expiration (threshold: 30 days before expiry)

## Disaster Recovery

### Connection Failure Handling

Application behavior on database connection failure:

1. **Initial Connection Failure**: Application refuses to start, exits with error
2. **Runtime Connection Loss**: Automatic reconnection with exponential backoff
3. **Pool Exhaustion**: Requests queue until connection available or timeout
4. **SSL Certificate Expiry**: Connection failure, requires certificate renewal

### Failover Configuration

For high availability with database replicas:

```bash
# Primary database
DB_HOST=primary-db.example.com
DB_PORT=5432

# Read replica (optional)
DB_READ_REPLICA_HOST=replica-db.example.com
DB_READ_REPLICA_PORT=5432

# Failover timeout
DB_FAILOVER_TIMEOUT=5000
```

## Compliance and Regulations

### Data Protection Requirements

- **GDPR**: Encryption in transit (SSL/TLS) and at rest
- **HIPAA**: TLS 1.2+, certificate validation, audit logging
- **PCI DSS**: Strong encryption, key rotation, access controls
- **SOC 2**: Encrypted connections, secrets management, monitoring

### Encryption Standards

- **TLS Version**: TLS 1.2 or higher (TLS 1.3 recommended)
- **Cipher Suites**: Strong ciphers only (AES-256-GCM, ChaCha20-Poly1305)
- **Certificate**: Valid CA-signed certificate (not self-signed in production)
- **Key Length**: RSA 2048-bit minimum (4096-bit recommended)

## Troubleshooting

### Common Issues

#### SSL Connection Refused

```
Error: SSL connection refused
```

**Solution**: Verify database server has SSL enabled:
```sql
SHOW ssl;  -- Should return 'on'
```

#### Certificate Verification Failed

```
Error: self signed certificate in certificate chain
```

**Solution**: Provide CA certificate or disable verification (dev only):
```bash
DB_SSL_CA=/path/to/ca-cert.pem
# OR (development only)
DB_SSL_REJECT_UNAUTHORIZED=false
```

#### Connection Pool Exhausted

```
Error: timeout acquiring client from pool
```

**Solution**: Increase pool size or investigate slow queries:
```bash
DB_POOL_MAX=20  # Increase from default 10
```

#### Secrets Manager Access Denied

```
Error: Failed to retrieve secret: DB_PASSWORD
```

**Solution**: Verify IAM permissions or Vault token:
```bash
# AWS: Check IAM role has secretsmanager:GetSecretValue
# Vault: Verify token has read access to secret path
vault token lookup
```

## References

- [PostgreSQL SSL Support](https://www.postgresql.org/docs/current/ssl-tcp.html)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [OWASP Database Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html)
- [Node.js pg SSL Configuration](https://node-postgres.com/features/ssl)
