#!/bin/bash
#
# JWT Secret Rotation Script
# Rotates JWT signing secrets with zero-downtime and audit logging
#
# Usage: ./rotate-jwt-secrets.sh [--dry-run] [--force]
#
# Requirements:
# - AWS CLI configured (for Secrets Manager)
# - kubectl configured (for Kubernetes secrets)
# - jq installed for JSON processing
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
AUDIT_LOG_DIR="${PROJECT_ROOT}/logs/jwt-rotation"
AUDIT_LOG_FILE="${AUDIT_LOG_DIR}/rotation-audit.log"
ROTATION_HISTORY="${AUDIT_LOG_DIR}/rotation-history.json"

# Environment detection
ENVIRONMENT="${ENVIRONMENT:-production}"
SECRETS_BACKEND="${SECRETS_BACKEND:-aws-secrets-manager}"

# Flags
DRY_RUN=false
FORCE_ROTATION=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE_ROTATION=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--force]"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [INFO] $1" >> "${AUDIT_LOG_FILE}"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [SUCCESS] $1" >> "${AUDIT_LOG_FILE}"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [WARNING] $1" >> "${AUDIT_LOG_FILE}"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [ERROR] $1" >> "${AUDIT_LOG_FILE}"
}

# Initialize audit logging
init_audit_log() {
  mkdir -p "${AUDIT_LOG_DIR}"
  touch "${AUDIT_LOG_FILE}"
  
  if [[ ! -f "${ROTATION_HISTORY}" ]]; then
    echo '{"rotations": []}' > "${ROTATION_HISTORY}"
  fi
  
  log_info "=== JWT Secret Rotation Started ==="
  log_info "Environment: ${ENVIRONMENT}"
  log_info "Secrets Backend: ${SECRETS_BACKEND}"
  log_info "Dry Run: ${DRY_RUN}"
  log_info "Force Rotation: ${FORCE_ROTATION}"
}

# Generate cryptographically secure secret
generate_secret() {
  local length="${1:-64}"
  openssl rand -base64 "${length}" | tr -d '\n'
}

# Check if rotation is needed (90-day policy)
check_rotation_needed() {
  if [[ "${FORCE_ROTATION}" == "true" ]]; then
    log_info "Force rotation flag set - proceeding with rotation"
    return 0
  fi
  
  # Get last rotation timestamp from history
  local last_rotation=$(jq -r '.rotations[-1].timestamp // "1970-01-01T00:00:00Z"' "${ROTATION_HISTORY}")
  local last_rotation_epoch=$(date -d "${last_rotation}" +%s 2>/dev/null || echo 0)
  local current_epoch=$(date +%s)
  local days_since_rotation=$(( (current_epoch - last_rotation_epoch) / 86400 ))
  
  log_info "Days since last rotation: ${days_since_rotation}"
  
  if [[ ${days_since_rotation} -ge 90 ]]; then
    log_warning "Rotation needed: ${days_since_rotation} days since last rotation (policy: 90 days)"
    return 0
  else
    log_info "Rotation not needed: ${days_since_rotation} days since last rotation (policy: 90 days)"
    return 1
  fi
}

# Fetch current secrets from backend
fetch_current_secrets() {
  log_info "Fetching current JWT secrets from ${SECRETS_BACKEND}..."
  
  case "${SECRETS_BACKEND}" in
    aws-secrets-manager)
      fetch_from_aws_secrets_manager
      ;;
    vault)
      fetch_from_vault
      ;;
    kubernetes)
      fetch_from_kubernetes
      ;;
    env)
      log_warning "Using environment variables - not recommended for production"
      CURRENT_JWT_SECRET="${JWT_SECRET:-}"
      CURRENT_JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-}"
      ;;
    *)
      log_error "Unsupported secrets backend: ${SECRETS_BACKEND}"
      exit 1
      ;;
  esac
  
  if [[ -z "${CURRENT_JWT_SECRET}" ]] || [[ -z "${CURRENT_JWT_REFRESH_SECRET}" ]]; then
    log_error "Failed to fetch current secrets"
    exit 1
  fi
  
  log_success "Current secrets fetched successfully"
}

# AWS Secrets Manager integration
fetch_from_aws_secrets_manager() {
  local secret_name="takumi/${ENVIRONMENT}/jwt"
  
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found - install aws-cli"
    exit 1
  fi
  
  local secret_json=$(aws secretsmanager get-secret-value \
    --secret-id "${secret_name}" \
    --query SecretString \
    --output text 2>/dev/null || echo "")
  
  if [[ -z "${secret_json}" ]]; then
    log_error "Failed to fetch secret from AWS Secrets Manager: ${secret_name}"
    exit 1
  fi
  
  CURRENT_JWT_SECRET=$(echo "${secret_json}" | jq -r '.JWT_SECRET')
  CURRENT_JWT_REFRESH_SECRET=$(echo "${secret_json}" | jq -r '.JWT_REFRESH_SECRET')
}

update_aws_secrets_manager() {
  local secret_name="takumi/${ENVIRONMENT}/jwt"
  
  local new_secret_json=$(jq -n \
    --arg jwt_secret "${NEW_JWT_SECRET}" \
    --arg jwt_refresh_secret "${NEW_JWT_REFRESH_SECRET}" \
    --arg jwt_secret_previous "${CURRENT_JWT_SECRET}" \
    --arg jwt_refresh_secret_previous "${CURRENT_JWT_REFRESH_SECRET}" \
    '{
      JWT_SECRET: $jwt_secret,
      JWT_REFRESH_SECRET: $jwt_refresh_secret,
      JWT_SECRET_PREVIOUS: $jwt_secret_previous,
      JWT_REFRESH_SECRET_PREVIOUS: $jwt_refresh_secret_previous
    }')
  
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Would update AWS Secrets Manager: ${secret_name}"
    return 0
  fi
  
  aws secretsmanager update-secret \
    --secret-id "${secret_name}" \
    --secret-string "${new_secret_json}" \
    --description "JWT secrets rotated on $(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    > /dev/null
  
  log_success "AWS Secrets Manager updated: ${secret_name}"
}

# HashiCorp Vault integration
fetch_from_vault() {
  local vault_path="${VAULT_PATH:-secret/takumi/${ENVIRONMENT}}"
  
  if ! command -v vault &> /dev/null; then
    log_error "Vault CLI not found - install vault"
    exit 1
  fi
  
  CURRENT_JWT_SECRET=$(vault kv get -field=JWT_SECRET "${vault_path}" 2>/dev/null || echo "")
  CURRENT_JWT_REFRESH_SECRET=$(vault kv get -field=JWT_REFRESH_SECRET "${vault_path}" 2>/dev/null || echo "")
}

update_vault() {
  local vault_path="${VAULT_PATH:-secret/takumi/${ENVIRONMENT}}"
  
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Would update Vault: ${vault_path}"
    return 0
  fi
  
  vault kv put "${vault_path}" \
    JWT_SECRET="${NEW_JWT_SECRET}" \
    JWT_REFRESH_SECRET="${NEW_JWT_REFRESH_SECRET}" \
    JWT_SECRET_PREVIOUS="${CURRENT_JWT_SECRET}" \
    JWT_REFRESH_SECRET_PREVIOUS="${CURRENT_JWT_REFRESH_SECRET}" \
    > /dev/null
  
  log_success "Vault updated: ${vault_path}"
}

# Kubernetes Secrets integration
fetch_from_kubernetes() {
  local secret_name="takumi-jwt-secrets"
  local namespace="${KUBERNETES_NAMESPACE:-default}"
  
  if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found - install kubectl"
    exit 1
  fi
  
  CURRENT_JWT_SECRET=$(kubectl get secret "${secret_name}" \
    -n "${namespace}" \
    -o jsonpath='{.data.JWT_SECRET}' 2>/dev/null | base64 -d || echo "")
  
  CURRENT_JWT_REFRESH_SECRET=$(kubectl get secret "${secret_name}" \
    -n "${namespace}" \
    -o jsonpath='{.data.JWT_REFRESH_SECRET}' 2>/dev/null | base64 -d || echo "")
}

update_kubernetes() {
  local secret_name="takumi-jwt-secrets"
  local namespace="${KUBERNETES_NAMESPACE:-default}"
  
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Would update Kubernetes secret: ${secret_name}"
    return 0
  fi
  
  kubectl create secret generic "${secret_name}" \
    --from-literal=JWT_SECRET="${NEW_JWT_SECRET}" \
    --from-literal=JWT_REFRESH_SECRET="${NEW_JWT_REFRESH_SECRET}" \
    --from-literal=JWT_SECRET_PREVIOUS="${CURRENT_JWT_SECRET}" \
    --from-literal=JWT_REFRESH_SECRET_PREVIOUS="${CURRENT_JWT_REFRESH_SECRET}" \
    --namespace="${namespace}" \
    --dry-run=client -o yaml | kubectl apply -f -
  
  log_success "Kubernetes secret updated: ${secret_name}"
}

# Generate new secrets
generate_new_secrets() {
  log_info "Generating new JWT secrets..."
  
  NEW_JWT_SECRET=$(generate_secret 64)
  NEW_JWT_REFRESH_SECRET=$(generate_secret 64)
  
  log_success "New secrets generated (length: 64 bytes each)"
}

# Update secrets in backend
update_secrets() {
  log_info "Updating secrets in ${SECRETS_BACKEND}..."
  
  case "${SECRETS_BACKEND}" in
    aws-secrets-manager)
      update_aws_secrets_manager
      ;;
    vault)
      update_vault
      ;;
    kubernetes)
      update_kubernetes
      ;;
    env)
      log_warning "Environment variable mode - manual update required"
      log_info "New JWT_SECRET: ${NEW_JWT_SECRET}"
      log_info "New JWT_REFRESH_SECRET: ${NEW_JWT_REFRESH_SECRET}"
      ;;
    *)
      log_error "Unsupported secrets backend: ${SECRETS_BACKEND}"
      exit 1
      ;;
  esac
}

# Trigger rolling restart for zero-downtime
trigger_rolling_restart() {
  log_info "Triggering rolling restart for zero-downtime rotation..."
  
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Would trigger rolling restart"
    return 0
  fi
  
  case "${SECRETS_BACKEND}" in
    kubernetes)
      local deployment_name="${KUBERNETES_DEPLOYMENT:-takumi-backend}"
      local namespace="${KUBERNETES_NAMESPACE:-default}"
      
      kubectl rollout restart deployment/"${deployment_name}" -n "${namespace}"
      kubectl rollout status deployment/"${deployment_name}" -n "${namespace}" --timeout=5m
      
      log_success "Rolling restart completed successfully"
      ;;
    *)
      log_warning "Rolling restart not automated for ${SECRETS_BACKEND} - manual restart required"
      log_warning "Restart backend services to load new secrets"
      ;;
  esac
}

# Record rotation in audit history
record_rotation() {
  local rotation_id=$(uuidgen 2>/dev/null || echo "$(date +%s)-$$")
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  local rotation_entry=$(jq -n \
    --arg id "${rotation_id}" \
    --arg timestamp "${timestamp}" \
    --arg environment "${ENVIRONMENT}" \
    --arg backend "${SECRETS_BACKEND}" \
    --arg operator "${USER:-unknown}" \
    --arg dry_run "${DRY_RUN}" \
    '{
      id: $id,
      timestamp: $timestamp,
      environment: $environment,
      secrets_backend: $backend,
      operator: $operator,
      dry_run: ($dry_run == "true"),
      success: true
    }')
  
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Would record rotation in history"
    echo "${rotation_entry}" | jq .
    return 0
  fi
  
  # Append to rotation history
  local updated_history=$(jq --argjson entry "${rotation_entry}" \
    '.rotations += [$entry]' \
    "${ROTATION_HISTORY}")
  
  echo "${updated_history}" > "${ROTATION_HISTORY}"
  
  log_success "Rotation recorded in audit history: ${rotation_id}"
}

# Verify rotation success
verify_rotation() {
  log_info "Verifying rotation success..."
  
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "[DRY RUN] Skipping verification"
    return 0
  fi
  
  # Wait for services to reload
  sleep 5
  
  # Health check (customize based on your setup)
  local health_endpoint="${API_BASE_URL:-http://localhost:3001}/health"
  
  if command -v curl &> /dev/null; then
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "${health_endpoint}" || echo "000")
    
    if [[ "${http_code}" == "200" ]]; then
      log_success "Health check passed: ${health_endpoint}"
    else
      log_warning "Health check returned ${http_code}: ${health_endpoint}"
    fi
  else
    log_warning "curl not found - skipping health check"
  fi
}

# Main execution
main() {
  init_audit_log
  
  # Check if rotation is needed
  if ! check_rotation_needed; then
    log_info "Rotation not required at this time"
    exit 0
  fi
  
  # Fetch current secrets
  fetch_current_secrets
  
  # Generate new secrets
  generate_new_secrets
  
  # Update secrets in backend
  update_secrets
  
  # Trigger rolling restart
  trigger_rolling_restart
  
  # Verify rotation
  verify_rotation
  
  # Record in audit history
  record_rotation
  
  log_success "=== JWT Secret Rotation Completed Successfully ==="
  
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "This was a DRY RUN - no changes were made"
  fi
}

# Run main function
main
