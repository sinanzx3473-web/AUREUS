# Docker Security Best Practices

## Overview

This document outlines the Docker security hardening measures implemented in the Takumi platform. All Docker configurations follow production-grade security standards.

## Security Principles

### 1. Fixed Image Versions (No "latest")

**CRITICAL**: Never use `latest` tag in production for security and reproducibility.

#### ✅ Implemented Fixed Versions

**Backend Services** (`backend/docker-compose.yml`):
- `postgres:15.5-alpine` - PostgreSQL database
- `redis:7.2.3-alpine` - Redis cache
- `node:18.19.0-alpine` - Node.js runtime

**Monitoring Stack** (`docker-compose.monitoring.yml`):
- `prom/prometheus:v2.48.1` - Metrics collection
- `grafana/grafana:10.2.3` - Visualization
- `docker.elastic.co/elasticsearch/elasticsearch:8.11.3` - Log storage
- `docker.elastic.co/logstash/logstash:8.11.3` - Log processing
- `docker.elastic.co/kibana/kibana:8.11.3` - Log visualization
- `prom/node-exporter:v1.7.0` - System metrics
- `prom/alertmanager:v0.26.0` - Alert management

**Why Fixed Versions?**
- ✅ Reproducible builds across environments
- ✅ Prevents unexpected breaking changes
- ✅ Security: audit specific versions for vulnerabilities
- ✅ Rollback capability to known-good versions
- ✅ Compliance: version tracking for audit trails

### 2. Resource Limits

All containers have CPU and memory limits to prevent resource exhaustion attacks.

#### Backend Services

**PostgreSQL**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Redis**:
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

**Backend API**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

#### Monitoring Services

**Prometheus**:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 2G
    reservations:
      cpus: '0.5'
      memory: 1G
```

**Elasticsearch**:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
```

**Benefits**:
- ✅ Prevents single container from consuming all host resources
- ✅ Protects against memory leaks and runaway processes
- ✅ Ensures fair resource allocation across services
- ✅ Enables predictable performance under load

### 3. Health Checks

All critical services have health checks for automatic failure detection and recovery.

#### PostgreSQL Health Check
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

#### Redis Health Check
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 3s
  retries: 5
  start_period: 20s
```

#### Backend API Health Check
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 40s
```

#### Prometheus Health Check
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

**Benefits**:
- ✅ Automatic detection of unhealthy containers
- ✅ Enables orchestration tools to restart failed services
- ✅ Dependency management (wait for healthy dependencies)
- ✅ Monitoring integration for alerting

### 4. Restart Policies

All production services use `restart: always` for high availability.

```yaml
services:
  postgres:
    restart: always
  redis:
    restart: always
  backend:
    restart: always
```

**Policy Comparison**:
- `no` - Never restart (default, not recommended for production)
- `on-failure` - Restart only on error exit codes
- `unless-stopped` - Always restart unless manually stopped
- `always` - **Always restart** (recommended for production)

**Benefits**:
- ✅ Automatic recovery from crashes
- ✅ Survives host reboots
- ✅ Reduces manual intervention
- ✅ Improves uptime and reliability

### 5. Secrets Management

**CRITICAL**: All secrets loaded from environment variables only.

#### Environment Variable Loading
```yaml
services:
  backend:
    env_file:
      - .env  # Never commit this file
```

#### File Permissions
```bash
# Set restrictive permissions on .env files
chmod 600 backend/.env
chmod 600 .env

# Verify
ls -la backend/.env  # Should show: -rw------- (600)
```

#### Environment-Specific Files
- `.env.development.example` - Development template
- `.env.test.example` - Test template
- `.env.production.example` - Production template with security checklist

**Security Rules**:
- ✅ Never commit `.env` files to version control
- ✅ Use different secrets for dev/test/prod
- ✅ Hash sensitive tokens before database storage
- ✅ Rotate secrets regularly (90-180 days)
- ✅ Use secrets managers in production (AWS Secrets Manager, Vault)

### 6. Non-Root User (Dockerfile)

Backend container runs as non-root user for security.

```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs
```

**Benefits**:
- ✅ Limits damage from container escape vulnerabilities
- ✅ Prevents privilege escalation attacks
- ✅ Follows principle of least privilege
- ✅ Industry best practice for production containers

### 7. Multi-Stage Builds

Dockerfile uses multi-stage builds to minimize attack surface.

```dockerfile
# Build stage
FROM node:18.19.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
RUN npm run build

# Production stage
FROM node:18.19.0-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
```

**Benefits**:
- ✅ Smaller final image size
- ✅ No build tools in production image
- ✅ Reduced attack surface
- ✅ Faster deployment and startup

### 8. Signal Handling (dumb-init)

Backend container uses `dumb-init` for proper signal handling.

```dockerfile
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

**Benefits**:
- ✅ Proper handling of SIGTERM/SIGINT signals
- ✅ Graceful shutdown of application
- ✅ Prevents zombie processes
- ✅ Ensures clean container stops

## Security Checklist

### Pre-Deployment Checklist

- [ ] All Docker images use fixed versions (no `latest`)
- [ ] Resource limits configured for all services
- [ ] Health checks implemented for all critical services
- [ ] Restart policy set to `always` for production
- [ ] All secrets in environment variables (not hardcoded)
- [ ] `.env` files have restrictive permissions (600)
- [ ] Non-root user configured in Dockerfile
- [ ] Multi-stage builds minimize image size
- [ ] Signal handling configured (dumb-init)
- [ ] Health check endpoints implemented in application
- [ ] Dependency health checks configured in docker-compose
- [ ] Monitoring stack secured with authentication
- [ ] Network isolation configured (if using custom networks)
- [ ] Volume permissions verified
- [ ] Container logs configured for centralized logging

### Production Deployment Checklist

- [ ] All `.env.example` files copied to `.env` with production secrets
- [ ] Secrets generated with cryptographically secure methods
- [ ] Database passwords are 64+ characters
- [ ] JWT secrets are 64-byte hex strings
- [ ] Admin API keys hashed before database storage
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured for production traffic
- [ ] SSL/TLS enabled for all external connections
- [ ] Firewall rules configured
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery tested
- [ ] Security audit completed
- [ ] Incident response plan documented

## Monitoring Container Security

### Check Container Health
```bash
# View health status of all containers
docker-compose ps

# Inspect specific container health
docker inspect --format='{{.State.Health.Status}}' takumi-backend

# View health check logs
docker inspect --format='{{json .State.Health}}' takumi-backend | jq
```

### Monitor Resource Usage
```bash
# Real-time resource usage
docker stats

# Check if containers are hitting resource limits
docker stats --no-stream | grep -E "(takumi|CONTAINER)"
```

### Verify Restart Policies
```bash
# Check restart policy for all containers
docker inspect --format='{{.Name}}: {{.HostConfig.RestartPolicy.Name}}' $(docker ps -q)
```

### Audit Image Versions
```bash
# List all running containers with image versions
docker ps --format "table {{.Names}}\t{{.Image}}"

# Verify no "latest" tags in use
docker ps --format "{{.Image}}" | grep -i latest && echo "WARNING: Found 'latest' tags!" || echo "OK: No 'latest' tags"
```

### Check File Permissions
```bash
# Verify .env file permissions
ls -la backend/.env .env

# Should show: -rw------- (600)
# If not, fix with: chmod 600 backend/.env .env
```

## Incident Response

### Container Compromise Response

1. **Isolate**: Stop the compromised container
   ```bash
   docker-compose stop <service-name>
   ```

2. **Investigate**: Inspect logs and container state
   ```bash
   docker logs <container-name> > incident-logs.txt
   docker inspect <container-name> > incident-inspect.json
   ```

3. **Preserve Evidence**: Export container filesystem
   ```bash
   docker export <container-name> > incident-container.tar
   ```

4. **Remediate**: Remove compromised container and rebuild
   ```bash
   docker-compose down <service-name>
   docker-compose build --no-cache <service-name>
   docker-compose up -d <service-name>
   ```

5. **Rotate Secrets**: Change all credentials that may have been exposed

6. **Review**: Conduct post-incident review and update security measures

## Updates and Maintenance

### Updating Docker Images

```bash
# Check for security updates
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}"

# Update to new fixed version
# 1. Update version in docker-compose.yml
# 2. Pull new image
docker-compose pull <service-name>

# 3. Recreate container with new image
docker-compose up -d <service-name>

# 4. Verify health
docker-compose ps <service-name>
```

### Security Scanning

```bash
# Scan images for vulnerabilities (requires Docker Scout or Trivy)
docker scout cve <image-name>:<version>

# Or using Trivy
trivy image <image-name>:<version>
```

## References

- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Compose Security](https://docs.docker.com/compose/security/)

## Related Documentation

- `docs/SECURITY_SECRETS.md` - Secrets management policies
- `docs/DEPLOYMENT.md` - Deployment procedures
- `docs/SECURITY.md` - Overall security architecture
- `docs/INCIDENT_RESPONSE.md` - Incident response procedures
