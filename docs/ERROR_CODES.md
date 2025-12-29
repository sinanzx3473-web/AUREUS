# Error Code Reference

## Overview

This document provides a comprehensive reference of all error codes used in the Takumi platform, including API errors, smart contract reverts, and system errors.

---

## Table of Contents

1. [Error Code Format](#error-code-format)
2. [API Error Codes](#api-error-codes)
3. [Smart Contract Error Codes](#smart-contract-error-codes)
4. [Blockchain Error Codes](#blockchain-error-codes)
5. [System Error Codes](#system-error-codes)
6. [HTTP Status Codes](#http-status-codes)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## Error Code Format

### API Errors

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "value": "invalid_value",
      "constraint": "validation_rule"
    },
    "timestamp": "2025-02-20T15:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Smart Contract Errors

```solidity
revert("ERROR_CODE: Description");
// Example: revert("INVALID_ADDRESS: Address cannot be zero");
```

---

## API Error Codes

### Authentication Errors (AUTH_*)

#### AUTH_001: Missing Authorization Header
**HTTP Status**: 401 Unauthorized

**Cause**: Request missing `Authorization` header

**Solution**:
```javascript
// Add Bearer token to request
axios.get('/api/v1/profiles/0x...', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

#### AUTH_002: Invalid Token Format
**HTTP Status**: 401 Unauthorized

**Cause**: Token format is incorrect (not JWT)

**Solution**:
```javascript
// Ensure token format is correct
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
headers: { 'Authorization': `Bearer ${token}` }
```

#### AUTH_003: Token Expired
**HTTP Status**: 401 Unauthorized

**Cause**: Access token has expired

**Solution**:
```javascript
// Refresh token
const response = await axios.post('/api/v1/auth/refresh', {
  refreshToken: localStorage.getItem('refreshToken')
});
const newAccessToken = response.data.data.accessToken;
```

#### AUTH_004: Invalid Signature
**HTTP Status**: 401 Unauthorized

**Cause**: Wallet signature verification failed

**Solution**:
```javascript
// Ensure message matches exactly
const message = `Sign this message to authenticate with Takumi:\n\nNonce: ${nonce}`;
const signature = await signer.signMessage(message);
```

#### AUTH_005: Nonce Already Used
**HTTP Status**: 400 Bad Request

**Cause**: Nonce has already been consumed

**Solution**:
```javascript
// Request new nonce
const { data: { nonce } } = await axios.get(`/api/v1/auth/nonce/${address}`);
```

#### AUTH_006: Nonce Expired
**HTTP Status**: 400 Bad Request

**Cause**: Nonce is older than 5 minutes

**Solution**: Request a new nonce and sign immediately

#### AUTH_007: Invalid Refresh Token
**HTTP Status**: 401 Unauthorized

**Cause**: Refresh token is invalid or revoked

**Solution**: Re-authenticate with wallet signature

#### AUTH_008: Insufficient Permissions
**HTTP Status**: 403 Forbidden

**Cause**: User lacks required role/permission

**Solution**: Contact admin to grant necessary permissions

---

### Validation Errors (VAL_*)

#### VAL_001: Invalid Ethereum Address
**HTTP Status**: 400 Bad Request

**Cause**: Address format is invalid

**Example Error**:
```json
{
  "code": "VAL_001",
  "message": "Invalid Ethereum address format",
  "details": {
    "field": "address",
    "value": "0xinvalid",
    "expected": "42-character hex string starting with 0x"
  }
}
```

**Solution**:
```javascript
// Validate address format
const { ethers } = require('ethers');
if (!ethers.utils.isAddress(address)) {
  throw new Error('Invalid address');
}
```

#### VAL_002: Missing Required Field
**HTTP Status**: 400 Bad Request

**Cause**: Required field is missing from request

**Solution**: Include all required fields in request body

#### VAL_003: Field Too Long
**HTTP Status**: 400 Bad Request

**Cause**: String field exceeds maximum length

**Example**:
```json
{
  "code": "VAL_003",
  "message": "Field exceeds maximum length",
  "details": {
    "field": "bio",
    "maxLength": 1000,
    "actualLength": 1250
  }
}
```

#### VAL_004: Invalid Field Type
**HTTP Status**: 400 Bad Request

**Cause**: Field type doesn't match expected type

**Solution**: Ensure field types match API specification

#### VAL_005: Invalid Enum Value
**HTTP Status**: 400 Bad Request

**Cause**: Enum value not in allowed list

**Example**:
```json
{
  "code": "VAL_005",
  "message": "Invalid status value",
  "details": {
    "field": "status",
    "value": "InvalidStatus",
    "allowed": ["Pending", "Assigned", "Approved", "Rejected"]
  }
}
```

#### VAL_006: Invalid URL Format
**HTTP Status**: 400 Bad Request

**Cause**: URL format is invalid

**Solution**: Ensure URLs start with http://, https://, ipfs://, or ar://

#### VAL_007: Invalid Date Format
**HTTP Status**: 400 Bad Request

**Cause**: Date string is not ISO 8601 format

**Solution**: Use ISO 8601 format (e.g., "2025-02-20T15:30:00Z")

#### VAL_008: Value Out of Range
**HTTP Status**: 400 Bad Request

**Cause**: Numeric value outside acceptable range

**Example**:
```json
{
  "code": "VAL_008",
  "message": "Value out of range",
  "details": {
    "field": "limit",
    "value": 1000,
    "min": 1,
    "max": 100
  }
}
```

---

### Resource Errors (RES_*)

#### RES_001: Profile Not Found
**HTTP Status**: 404 Not Found

**Cause**: Profile doesn't exist for given address

**Solution**: Verify address or create profile first

#### RES_002: Claim Not Found
**HTTP Status**: 404 Not Found

**Cause**: Claim ID doesn't exist

**Solution**: Verify claim ID is correct

#### RES_003: Endorsement Not Found
**HTTP Status**: 404 Not Found

**Cause**: Endorsement ID doesn't exist

**Solution**: Verify endorsement ID is correct

#### RES_004: Verifier Not Found
**HTTP Status**: 404 Not Found

**Cause**: Verifier address not registered

**Solution**: Register as verifier first

#### RES_005: Webhook Not Found
**HTTP Status**: 404 Not Found

**Cause**: Webhook ID doesn't exist

**Solution**: Verify webhook ID or create new webhook

---

### Rate Limiting Errors (RATE_*)

#### RATE_001: Rate Limit Exceeded
**HTTP Status**: 429 Too Many Requests

**Cause**: Too many requests in time window

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1708444800
Retry-After: 60
```

**Solution**:
```javascript
// Wait for rate limit reset
const retryAfter = parseInt(response.headers['retry-after']);
await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
```

#### RATE_002: Concurrent Request Limit
**HTTP Status**: 429 Too Many Requests

**Cause**: Too many concurrent requests from same client

**Solution**: Implement request queuing or reduce concurrency

---

### Database Errors (DB_*)

#### DB_001: Database Connection Failed
**HTTP Status**: 503 Service Unavailable

**Cause**: Cannot connect to database

**Solution**: Check database status and connection settings

#### DB_002: Query Timeout
**HTTP Status**: 504 Gateway Timeout

**Cause**: Database query took too long

**Solution**: Optimize query or increase timeout

#### DB_003: Constraint Violation
**HTTP Status**: 409 Conflict

**Cause**: Database constraint violated (unique, foreign key, etc.)

**Example**:
```json
{
  "code": "DB_003",
  "message": "Unique constraint violation",
  "details": {
    "constraint": "unique_verifier_specialization",
    "table": "verifier_specializations"
  }
}
```

#### DB_004: Transaction Deadlock
**HTTP Status**: 500 Internal Server Error

**Cause**: Database transaction deadlock detected

**Solution**: Retry request after brief delay

---

### Blockchain Errors (BC_*)

#### BC_001: RPC Connection Failed
**HTTP Status**: 503 Service Unavailable

**Cause**: Cannot connect to blockchain RPC

**Solution**: Check RPC endpoint configuration

#### BC_002: Transaction Reverted
**HTTP Status**: 400 Bad Request

**Cause**: Smart contract transaction reverted

**Example**:
```json
{
  "code": "BC_002",
  "message": "Transaction reverted",
  "details": {
    "reason": "Pausable: paused",
    "transactionHash": "0xabc...",
    "blockNumber": 12345
  }
}
```

#### BC_003: Insufficient Gas
**HTTP Status**: 400 Bad Request

**Cause**: Gas limit too low for transaction

**Solution**: Increase gas limit

#### BC_004: Nonce Too Low
**HTTP Status**: 400 Bad Request

**Cause**: Transaction nonce already used

**Solution**: Reset account nonce in wallet

#### BC_005: Network Mismatch
**HTTP Status**: 400 Bad Request

**Cause**: Wallet connected to wrong network

**Solution**: Switch to correct network (e.g., Sepolia)

---

### Storage Errors (STOR_*)

#### STOR_001: IPFS Upload Failed
**HTTP Status**: 503 Service Unavailable

**Cause**: Failed to upload to IPFS

**Solution**: Retry upload or use different gateway

#### STOR_002: IPFS Fetch Failed
**HTTP Status**: 503 Service Unavailable

**Cause**: Failed to fetch from IPFS

**Solution**: Try different gateway or wait for propagation

#### STOR_003: File Too Large
**HTTP Status**: 413 Payload Too Large

**Cause**: File exceeds maximum size

**Solution**: Reduce file size or split into multiple files

#### STOR_004: Invalid File Type
**HTTP Status**: 400 Bad Request

**Cause**: File type not allowed

**Solution**: Use allowed file types (JSON, images, etc.)

---

### Webhook Errors (HOOK_*)

#### HOOK_001: Webhook Delivery Failed
**HTTP Status**: N/A (logged internally)

**Cause**: Webhook endpoint returned error or timeout

**Solution**: Check webhook endpoint logs and fix issues

#### HOOK_002: Invalid Webhook URL
**HTTP Status**: 400 Bad Request

**Cause**: Webhook URL format invalid

**Solution**: Provide valid HTTPS URL

#### HOOK_003: Webhook Signature Mismatch
**HTTP Status**: 401 Unauthorized

**Cause**: Webhook signature verification failed

**Solution**: Verify signature using correct secret

---

## Smart Contract Error Codes

### Access Control Errors

#### SC_ACCESS_001: Missing Role
**Revert Message**: `AccessControl: account 0x... is missing role 0x...`

**Cause**: Caller lacks required role

**Solution**:
```bash
# Grant role
cast send $CONTRACT_ADDRESS \
  "grantRole(bytes32,address)" \
  $(cast keccak "VERIFIER_ROLE") \
  $USER_ADDRESS \
  --private-key $ADMIN_KEY
```

#### SC_ACCESS_002: Not Admin
**Revert Message**: `Only admin can perform this action`

**Cause**: Function requires admin role

**Solution**: Use admin account or request admin to perform action

---

### Pausable Errors

#### SC_PAUSE_001: Contract Paused
**Revert Message**: `Pausable: paused`

**Cause**: Contract is in paused state

**Solution**: Wait for admin to unpause contract

#### SC_PAUSE_002: Contract Not Paused
**Revert Message**: `Pausable: not paused`

**Cause**: Trying to unpause already active contract

**Solution**: No action needed, contract is active

---

### Validation Errors

#### SC_VAL_001: Invalid Address
**Revert Message**: `INVALID_ADDRESS: Address cannot be zero`

**Cause**: Zero address provided

**Solution**: Provide valid non-zero address

#### SC_VAL_002: String Too Long
**Revert Message**: `STRING_TOO_LONG: Exceeds maximum length`

**Cause**: String exceeds MAX_STRING_LENGTH (500 chars)

**Solution**: Reduce string length

#### SC_VAL_003: Array Too Large
**Revert Message**: `ARRAY_TOO_LARGE: Exceeds maximum size`

**Cause**: Array exceeds maximum allowed size

**Solution**: Reduce array size or batch operations

#### SC_VAL_004: Invalid Timestamp
**Revert Message**: `INVALID_TIMESTAMP: Timestamp in future`

**Cause**: Timestamp is in the future

**Solution**: Use current or past timestamp

---

### Profile Errors

#### SC_PROF_001: Profile Already Exists
**Revert Message**: `PROFILE_EXISTS: Profile already created`

**Cause**: Attempting to create duplicate profile

**Solution**: Update existing profile instead

#### SC_PROF_002: Profile Not Found
**Revert Message**: `PROFILE_NOT_FOUND: No profile for address`

**Cause**: Profile doesn't exist

**Solution**: Create profile first

#### SC_PROF_003: Max Skills Reached
**Revert Message**: `MAX_SKILLS_REACHED: Cannot add more skills`

**Cause**: User has reached MAX_SKILLS_PER_USER (100)

**Solution**: Remove unused skills before adding new ones

---

### Claim Errors

#### SC_CLAIM_001: Claim Not Found
**Revert Message**: `CLAIM_NOT_FOUND: Invalid claim ID`

**Cause**: Claim ID doesn't exist

**Solution**: Verify claim ID

#### SC_CLAIM_002: Not Claim Owner
**Revert Message**: `NOT_CLAIM_OWNER: Only claimant can perform this`

**Cause**: Caller is not the claim owner

**Solution**: Use claim owner's account

#### SC_CLAIM_003: Invalid Status Transition
**Revert Message**: `INVALID_STATUS: Cannot transition from X to Y`

**Cause**: Invalid claim status change

**Solution**: Follow valid status transitions (Pending → Assigned → Approved/Rejected)

#### SC_CLAIM_004: Already Assigned
**Revert Message**: `ALREADY_ASSIGNED: Claim already has verifier`

**Cause**: Claim already assigned to verifier

**Solution**: Unassign first or use different claim

---

### Endorsement Errors

#### SC_END_001: Self Endorsement
**Revert Message**: `SELF_ENDORSEMENT: Cannot endorse yourself`

**Cause**: Attempting to endorse own address

**Solution**: Get endorsement from another user

#### SC_END_002: Duplicate Endorsement
**Revert Message**: `DUPLICATE_ENDORSEMENT: Already endorsed`

**Cause**: Already endorsed this skill for this user

**Solution**: Revoke previous endorsement first

#### SC_END_003: Max Endorsements Reached
**Revert Message**: `MAX_ENDORSEMENTS: Limit reached`

**Cause**: User has reached MAX_ENDORSEMENTS_PER_USER (500)

**Solution**: Revoke old endorsements

---

### Verifier Errors

#### SC_VER_001: Not Registered
**Revert Message**: `NOT_REGISTERED: Not a registered verifier`

**Cause**: Address not in verifier registry

**Solution**: Register as verifier first

#### SC_VER_002: Already Registered
**Revert Message**: `ALREADY_REGISTERED: Verifier exists`

**Cause**: Verifier already registered

**Solution**: Update existing verifier instead

#### SC_VER_003: Verifier Inactive
**Revert Message**: `VERIFIER_INACTIVE: Verifier is not active`

**Cause**: Verifier status is inactive

**Solution**: Activate verifier or use different verifier

---

## Blockchain Error Codes

### MetaMask Errors

#### MM_001: User Rejected Request
**Code**: 4001

**Message**: "User rejected the request"

**Cause**: User clicked "Reject" in MetaMask

**Solution**: User should approve transaction

#### MM_002: Unauthorized
**Code**: 4100

**Message**: "The requested account and/or method has not been authorized"

**Cause**: Wallet not connected

**Solution**: Connect wallet first

#### MM_003: Unsupported Method
**Code**: 4200

**Message**: "The requested method is not supported"

**Cause**: Wallet doesn't support method

**Solution**: Use supported method or different wallet

#### MM_004: Disconnected
**Code**: 4900

**Message**: "The provider is disconnected"

**Cause**: Wallet disconnected from network

**Solution**: Reconnect wallet

#### MM_005: Chain Disconnected
**Code**: 4901

**Message**: "The provider is not connected to the requested chain"

**Cause**: Wrong network selected

**Solution**: Switch to correct network

---

### JSON-RPC Errors

#### RPC_001: Invalid JSON
**Code**: -32700

**Message**: "Parse error"

**Cause**: Invalid JSON in request

**Solution**: Fix JSON syntax

#### RPC_002: Invalid Request
**Code**: -32600

**Message**: "Invalid Request"

**Cause**: Request format invalid

**Solution**: Follow JSON-RPC 2.0 specification

#### RPC_003: Method Not Found
**Code**: -32601

**Message**: "Method not found"

**Cause**: RPC method doesn't exist

**Solution**: Use valid RPC method

#### RPC_004: Invalid Params
**Code**: -32602

**Message**: "Invalid params"

**Cause**: Method parameters invalid

**Solution**: Provide correct parameters

#### RPC_005: Internal Error
**Code**: -32603

**Message**: "Internal error"

**Cause**: RPC server error

**Solution**: Retry or contact RPC provider

---

## System Error Codes

### Server Errors (SYS_*)

#### SYS_001: Internal Server Error
**HTTP Status**: 500 Internal Server Error

**Cause**: Unexpected server error

**Solution**: Retry request; contact support if persists

#### SYS_002: Service Unavailable
**HTTP Status**: 503 Service Unavailable

**Cause**: Service temporarily unavailable

**Solution**: Retry after delay

#### SYS_003: Maintenance Mode
**HTTP Status**: 503 Service Unavailable

**Cause**: System in maintenance mode

**Solution**: Wait for maintenance to complete

---

## HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content to return |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate, etc.) |
| 413 | Payload Too Large | Request body too large |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily unavailable |
| 504 | Gateway Timeout | Upstream service timeout |

---

## Troubleshooting Guide

### Quick Diagnosis

```javascript
// Error handling helper
function diagnoseError(error) {
  if (error.response) {
    // API error
    const { code, message, details } = error.response.data.error;
    console.error(`API Error ${code}: ${message}`);
    console.error('Details:', details);
    
    // Specific handling
    switch (code) {
      case 'AUTH_003':
        return 'Token expired - refresh token';
      case 'RATE_001':
        return `Rate limited - retry after ${error.response.headers['retry-after']}s`;
      case 'VAL_001':
        return `Invalid ${details.field}: ${details.value}`;
      default:
        return 'See error code reference';
    }
  } else if (error.code) {
    // MetaMask/RPC error
    switch (error.code) {
      case 4001:
        return 'User rejected transaction';
      case 4900:
        return 'Wallet disconnected';
      case -32603:
        return 'RPC error - check network';
      default:
        return `Blockchain error: ${error.message}`;
    }
  } else {
    // Network or unknown error
    return `Network error: ${error.message}`;
  }
}
```

### Common Error Patterns

#### Pattern 1: Authentication Flow Errors

```
AUTH_001 → Add Authorization header
AUTH_003 → Refresh token
AUTH_007 → Re-authenticate with wallet
```

#### Pattern 2: Transaction Errors

```
BC_005 → Switch network
BC_003 → Increase gas limit
BC_002 → Check contract state (paused?)
SC_PAUSE_001 → Wait for unpause
```

#### Pattern 3: Validation Errors

```
VAL_001 → Validate address format
VAL_003 → Reduce string length
VAL_005 → Use valid enum value
```

---

## Additional Resources

- **API Documentation**: [docs/API.md](./API.md)
- **Troubleshooting Guide**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Smart Contract Docs**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)

---

**Need Help?**
- GitHub Issues: https://github.com/takumi-platform/issues
- Discord: https://discord.gg/takumi
- Email: support@takumi.example.com
