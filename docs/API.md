# API Documentation

## Overview

Takumi backend API provides RESTful endpoints for profile management, skill tracking, and blockchain event indexing. All endpoints return JSON responses.

**Base URL**: `http://localhost:3001/api` (development)  
**Production**: `https://api.takumi.example` (replace with actual)

## Pagination

All smart contract functions that return arrays now support pagination to prevent gas exhaustion and improve performance with large datasets.

### Why Pagination?

**DoS Attack Prevention**: Without pagination, functions that iterate through large arrays could exceed the block gas limit (30M gas), making data inaccessible. Pagination ensures all view functions remain callable regardless of data size.

**Gas Safety**: All paginated functions tested up to maximum contract limits (500 endorsements, 200 claims, 100 skills) with gas usage well under safe limits.

### Pagination Parameters

- `offset`: Starting index (0-based)
- `limit`: Maximum number of items to return per page

### Pagination Response

All paginated functions return a tuple:
```solidity
(ItemType[] memory items, uint256 total)
```

- `items`: Array of requested items (length ≤ limit)
- `total`: Total count of all items (for calculating total pages)

### Example Usage

**Basic Pagination**:
```solidity
// Get first 10 skills for a user
(Skill[] memory skills, uint256 total) = skillProfile.getSkills(userAddress, 0, 10);

// Get next 10 skills (page 2)
(Skill[] memory moreSkills, uint256 total) = skillProfile.getSkills(userAddress, 10, 10);

// Calculate total pages
uint256 pageSize = 10;
uint256 totalPages = (total + pageSize - 1) / pageSize;
```

**Fetching All Items** (for small datasets):
```solidity
// Get all skills at once (if total is known to be small)
(Skill[] memory allSkills, uint256 total) = skillProfile.getSkills(userAddress, 0, 100);
```

**Infinite Scroll Pattern**:
```javascript
let offset = 0;
const limit = 20;
let allItems = [];
let hasMore = true;

while (hasMore) {
  const [items, total] = await contract.getSkills(userAddress, offset, limit);
  allItems = [...allItems, ...items];
  offset += items.length;
  hasMore = offset < total;
}
```

### Recommended Page Sizes

| Data Type | Recommended | Maximum Safe | Contract Limit |
|-----------|-------------|--------------|----------------|
| Skills | 10-50 | 100 | 100 per user |
| Experience | 10-30 | 50 | 50 per user |
| Education | 10-20 | 20 | 20 per user |
| Claims | 20-100 | 200 | 200 per user |
| Endorsements | 20-100 | 500 | 500 per user |
| References | 20-50 | 100 | 100 per user |

**Note**: "Maximum Safe" represents tested limits that stay well under gas constraints. Larger page sizes are possible but not recommended for production.

### Paginated Contract Functions

#### SkillProfile Contract

**`getSkills(address user, uint256 offset, uint256 limit)`**
- Returns user's skills with pagination
- Max items per user: 100
- Gas tested: 542,724 gas for 100 items (page size 100)

**`getExperience(address user, uint256 offset, uint256 limit)`**
- Returns user's work experience with pagination
- Max items per user: 50
- Gas tested: 271,362 gas for 50 items (page size 50)

**`getEducation(address user, uint256 offset, uint256 limit)`**
- Returns user's education history with pagination
- Max items per user: 20
- Gas tested: 108,545 gas for 20 items (page size 20)

#### SkillClaim Contract

**`getUserClaims(address user, uint256 offset, uint256 limit)`**
- Returns all claims submitted by a user
- Max items per user: 200
- Gas tested: 137,615 gas for 200 items (page size 200)

**`getVerifierClaims(address verifier, uint256 offset, uint256 limit)`**
- Returns all claims assigned to a verifier
- No maximum limit (verifiers can have many assignments)
- Pagination required for verifiers with high claim volume

**`getClaimsByStatus(ClaimStatus status, uint256 offset, uint256 limit)`**
- Returns all claims with a specific status (Pending, Approved, Rejected, Withdrawn)
- Iterates through all claims to filter by status
- Gas tested: 96,335 gas for 200 total claims, 100 matching status
- **Note**: This function performs filtering, so gas usage depends on total claims in system

#### Endorsement Contract

**`getReceivedEndorsements(address user, uint256 offset, uint256 limit)`**
- Returns endorsements received by a user
- Max items per user: 500
- Gas tested: 353,326 gas for 500 items (page size 500)

**`getGivenEndorsements(address user, uint256 offset, uint256 limit)`**
- Returns endorsements given by a user
- Max items per user: 500
- Gas tested: 353,326 gas for 500 items (page size 500)

**`getReceivedReferences(address user, uint256 offset, uint256 limit)`**
- Returns references received by a user
- Max items per user: 100
- Gas tested: 70,724 gas for 100 items (page size 100)

**`getGivenReferences(address user, uint256 offset, uint256 limit)`**
- Returns references given by a user
- Max items per user: 100
- Gas tested: 70,724 gas for 100 items (page size 100)

**`getActiveEndorsements(address user, uint256 offset, uint256 limit)`**
- Returns non-revoked endorsements received by a user
- Filters out revoked endorsements from total
- Gas tested: 331,147 gas for 500 total, 333 active (page size 100)
- **Note**: This function performs filtering, so gas usage depends on total endorsements

**`getActiveReferences(address user, uint256 offset, uint256 limit)`**
- Returns non-revoked references received by a user
- Filters out revoked references from total
- Gas tested: 91,121 gas for 100 total, 75 active (page size 50)
- **Note**: This function performs filtering, so gas usage depends on total references

### Gas Safety Guarantees

**All paginated functions are DoS-resistant and tested under adversarial conditions:**

- ✅ Maximum data per user tested (100-500 items depending on contract)
- ✅ All functions stay under 10M gas safe limit (block limit is 30M)
- ✅ Filtering functions tested with maximum matching items
- ✅ Gas usage consistent across different offset positions
- ✅ No gas spikes or unbounded iterations

**Safety Margin**: All functions use <6% of safe gas limit even at maximum capacity.

### Frontend Implementation Guide

**Infinite Scroll Example** (React):
```typescript
import { useState, useEffect } from 'react';
import { useContract } from './hooks/useContract';

function SkillsList({ userAddress }) {
  const [skills, setSkills] = useState([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const contract = useContract('SkillProfile');
  
  const PAGE_SIZE = 20;
  
  const loadMore = async () => {
    if (loading || offset >= total) return;
    
    setLoading(true);
    try {
      const [items, totalCount] = await contract.getSkills(
        userAddress,
        offset,
        PAGE_SIZE
      );
      
      setSkills(prev => [...prev, ...items]);
      setTotal(totalCount);
      setOffset(prev => prev + items.length);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadMore();
  }, []);
  
  return (
    <div>
      {skills.map(skill => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
      
      {offset < total && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
      
      <p>Showing {skills.length} of {total} skills</p>
    </div>
  );
}
```

**Page-Based Navigation Example**:
```typescript
function ClaimsList({ userAddress }) {
  const [claims, setClaims] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const contract = useContract('SkillClaim');
  
  const PAGE_SIZE = 50;
  
  useEffect(() => {
    const loadPage = async () => {
      const offset = (currentPage - 1) * PAGE_SIZE;
      const [items, totalCount] = await contract.getUserClaims(
        userAddress,
        offset,
        PAGE_SIZE
      );
      
      setClaims(items);
      setTotal(totalCount);
    };
    
    loadPage();
  }, [currentPage, userAddress]);
  
  const totalPages = Math.ceil(total / PAGE_SIZE);
  
  return (
    <div>
      {claims.map(claim => (
        <ClaimCard key={claim.id} claim={claim} />
      ))}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

## Authentication

### JWT Authentication

Most endpoints require JWT authentication via Bearer token in the Authorization header.

**Request Header**:
```
Authorization: Bearer <access_token>
```

**Token Acquisition Flow**:

1. **Get Nonce**:
```http
GET /api/v1/auth/nonce/:address
```

**Response**:
```json
{
  "success": true,
  "data": {
    "nonce": "0x1234567890abcdef..."
  }
}
```

2. **Sign Message** (client-side):
```javascript
const message = `Sign this message to authenticate with Takumi:\n\nNonce: ${nonce}`;
const signature = await signer.signMessage(message);
```

3. **Verify Signature and Get Tokens**:
```http
POST /api/v1/auth/verify
Content-Type: application/json

{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "isAdmin": false
  }
}
```

**JWT Token Security** (✅ Verified):

**Implementation Status**: All JWT security controls verified as of 2025-11-24 (see `docs/TEST_RESULTS_2025-11-24.md`)

**Security Controls**:
- ✅ **Signature Verification**: All tokens validated with HS256 algorithm
- ✅ **Issuer Validation**: `iss` claim checked against `JWT_ISSUER` environment variable
- ✅ **Audience Validation**: `aud` claim checked against `JWT_AUDIENCE` environment variable
- ✅ **Expiration Validation**: `exp` claim enforced (15min access, 7d refresh)
- ✅ **Token Type Validation**: `type` claim distinguishes access vs refresh tokens
- ✅ **Address Binding**: `address` claim binds token to specific wallet

**Implementation Reference**:
```typescript
// backend/src/middleware/auth.ts
const decoded = jwt.verify(token, JWT_SECRET, {
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
  algorithms: ['HS256']
}) as JWTPayload;

if (decoded.type !== 'access') {
  throw new Error('Invalid token type');
}
```

**Token Lifecycle**:
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Issuer**: `takumi-api` (configurable via `JWT_ISSUER`)
- **Audience**: `takumi-client` (configurable via `JWT_AUDIENCE`)
- **Access Token Expiry**: 7 days (configurable via `JWT_EXPIRES_IN`)
- **Refresh Token Expiry**: 30 days (configurable via `JWT_REFRESH_EXPIRES_IN`)
- **Claims Validation**: Issuer, audience, expiration, and signature verified on every request
- **Clock Skew Tolerance**: 30 seconds

**Token Storage**:
- Access tokens: Store in memory or secure storage (never localStorage)
- Refresh tokens: Store in Redis with TTL matching token expiry
- Nonces: Store in Redis with 5-minute expiry, deleted after use

### Admin API Key Authentication

Admin endpoints require API key authentication using secure, hashed API keys.

**Request Header**:
```
X-API-Key: tak_live_<64_hex_characters>
```

**API Key Format**:
- Live keys: `tak_live_` followed by 64 hexadecimal characters
- Test keys: `tak_test_` followed by 64 hexadecimal characters
- Example: `tak_live_a1b2c3d4e5f6...` (total length: 73 characters)

**Security Features**:
- All API keys are hashed using bcrypt (12 rounds) before storage
- Constant-time comparison prevents timing attacks
- Keys are never stored in plaintext
- Each key is shown only once during generation
- Automatic last_used_at timestamp tracking

**Legacy Support**:
- Environment variable `ADMIN_API_KEY` supported for backward compatibility
- Will be deprecated in future versions
- Migrate to hashed API keys for enhanced security

## CSRF Protection

**All state-changing endpoints (POST, PUT, DELETE, PATCH) require valid CSRF tokens.**

Takumi implements CSRF protection using secure, cookie-based tokens to prevent cross-site request forgery attacks.

### Getting a CSRF Token

**Request**:
```http
GET /api/v1/csrf-token
```

**Response**:
```json
{
  "success": true,
  "csrfToken": "8f7d6e5c-4b3a-2918-7654-3210fedcba98"
}
```

**Cookie Set**: `_csrf` cookie is automatically set with:
- `httpOnly: true` (prevents JavaScript access)
- `secure: true` (HTTPS only in production)
- `sameSite: 'strict'` (prevents cross-site requests)
- `maxAge: 3600000` (1 hour expiry)

### Using CSRF Tokens

**Include token in request headers**:
```http
POST /api/v1/profiles
Authorization: Bearer <jwt_token>
CSRF-Token: 8f7d6e5c-4b3a-2918-7654-3210fedcba98
Content-Type: application/json

{
  "name": "John Doe",
  "bio": "Software Engineer"
}
```

**Or include in request body** (form data):
```http
POST /api/v1/profiles
Authorization: Bearer <jwt_token>
Content-Type: application/x-www-form-urlencoded

_csrf=8f7d6e5c-4b3a-2918-7654-3210fedcba98&name=John+Doe&bio=Software+Engineer
```

### CSRF Error Responses

**Missing or Invalid Token**:
```json
{
  "success": false,
  "error": "Invalid CSRF token",
  "message": "Request rejected due to invalid CSRF token. Please refresh and try again."
}
```

**HTTP Status**: `403 Forbidden`

### Client Implementation Example

```javascript
// Fetch CSRF token on app initialization
const getCsrfToken = async () => {
  const response = await fetch('/api/v1/csrf-token', {
    credentials: 'include' // Include cookies
  });
  const { csrfToken } = await response.json();
  return csrfToken;
};

// Store token in app state
const csrfToken = await getCsrfToken();

// Include in all state-changing requests
const createProfile = async (profileData) => {
  const response = await fetch('/api/v1/profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(profileData)
  });
  
  if (response.status === 403) {
    // Token expired or invalid - refresh and retry
    csrfToken = await getCsrfToken();
    return createProfile(profileData);
  }
  
  return response.json();
};
```

### Protected Endpoints

All endpoints with these HTTP methods require CSRF tokens:
- `POST` - Create operations
- `PUT` - Full update operations
- `PATCH` - Partial update operations
- `DELETE` - Delete operations

**Exempt Endpoints** (no CSRF required):
- `GET` requests (read-only)
- `/health` endpoint
- `/metrics` endpoint
- Webhook callbacks (use signature verification instead)

## Rate Limiting

All API endpoints are protected by Redis-backed rate limiting to prevent abuse and ensure fair resource allocation.

**Rate Limit Tiers**:

| Endpoint Category | Window | Max Requests | Applies To |
|------------------|--------|--------------|------------|
| General API | 15 min | 100 | All routes (default) |
| Authentication | 15 min | 5 | `/api/v1/auth/*` |
| Search | 15 min | 30 | `/api/v1/*/search` |
| Upload | 1 hour | 20 | `/api/v1/storage/*` (POST) |
| Webhooks | 15 min | 50 | `/api/v1/webhooks/*`, `/api/v1/alerts/*` |
| Metrics (Strict) | 15 min | 10 | `/api/v1/metrics/*` |

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

**Rate Limit Response** (HTTP 429):
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

**Implementation Details**:
- **Storage**: Redis with automatic key expiration
- **Key Format**: `rl:<category>:<ip_address>`
- **Bypass**: Not available (applies to all clients including admins)
- **Distributed**: Supports multi-instance deployments via shared Redis

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

**HTTP Status Codes**:
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Endpoints

### Health Check

#### GET /health

Check API health status.

**Authentication**: None

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

---

### Authentication

#### POST /api/auth/signin

Authenticate user with wallet signature.

**Authentication**: None

**Request Body**:
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x1234567890abcdef...",
  "message": "Sign this message to authenticate: nonce123"
}
```

**Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "username": "takumi_user",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors**:
- `400`: Invalid signature or address
- `500`: Server error

---

#### POST /api/auth/refresh

Refresh access token using refresh token cookie.

**Authentication**: Refresh token (cookie)

**Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401`: Invalid or expired refresh token

---

#### POST /api/auth/signout

Sign out user and invalidate refresh token.

**Authentication**: JWT

**Response** (200):
```json
{
  "message": "Signed out successfully"
}
```

---

### Profiles

#### GET /api/profiles/:address

Get user profile by wallet address.

**Authentication**: Optional (public profiles visible without auth)

**Parameters**:
- `address` (path): Ethereum address (0x...)

**Response** (200):
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "username": "takumi_user",
  "bio": "Web3 developer and blockchain enthusiast",
  "avatar": "ipfs://QmX...",
  "website": "https://example.com",
  "twitter": "takumi_user",
  "github": "takumiuser",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors**:
- `404`: Profile not found

---

#### PUT /api/profiles/:address

Update user profile.

**Authentication**: JWT (must own the address)

**Parameters**:
- `address` (path): Ethereum address (0x...)

**Request Body**:
```json
{
  "username": "new_username",
  "bio": "Updated bio",
  "avatar": "ipfs://QmY...",
  "website": "https://newsite.com",
  "twitter": "new_twitter",
  "github": "newgithub"
}
```

**Response** (200):
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "username": "new_username",
  "bio": "Updated bio",
  "avatar": "ipfs://QmY...",
  "website": "https://newsite.com",
  "twitter": "new_twitter",
  "github": "newgithub",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

**Errors**:
- `400`: Invalid input
- `401`: Unauthorized
- `403`: Cannot update other user's profile
- `404`: Profile not found

---

### Skills

#### GET /api/skills/:address

Get all skills for a user.

**Authentication**: Optional

**Parameters**:
- `address` (path): Ethereum address (0x...)

**Query Parameters**:
- `status` (optional): Filter by status (`pending`, `verified`, `rejected`)
- `limit` (optional): Results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
{
  "skills": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "claimId": "1",
      "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "skillName": "Solidity Development",
      "metadata": "ipfs://QmZ...",
      "status": "verified",
      "verifier": "0x123...",
      "endorsementCount": 5,
      "createdAt": "2024-01-10T00:00:00.000Z",
      "verifiedAt": "2024-01-12T00:00:00.000Z"
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

**Errors**:
- `400`: Invalid query parameters

---

#### GET /api/skills/claim/:claimId

Get skill details by claim ID.

**Authentication**: Optional

**Parameters**:
- `claimId` (path): On-chain claim ID

**Response** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "claimId": "1",
  "userAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "skillName": "Solidity Development",
  "metadata": "ipfs://QmZ...",
  "status": "verified",
  "verifier": "0x123...",
  "endorsementCount": 5,
  "endorsements": [
    {
      "endorser": "0x456...",
      "comment": "Great Solidity skills!",
      "timestamp": "2024-01-13T00:00:00.000Z"
    }
  ],
  "createdAt": "2024-01-10T00:00:00.000Z",
  "verifiedAt": "2024-01-12T00:00:00.000Z"
}
```

**Errors**:
- `404`: Skill claim not found

---

### Storage (IPFS/Arweave)

#### POST /api/storage/upload

Upload metadata to IPFS or Arweave.

**Authentication**: JWT

**Request Body**:
```json
{
  "data": {
    "name": "Solidity Development",
    "description": "Expert in smart contract development",
    "evidence": ["https://github.com/user/project"],
    "tags": ["solidity", "ethereum", "web3"]
  },
  "provider": "ipfs"
}
```

**Parameters**:
- `data` (object): Metadata to upload
- `provider` (string): Storage provider (`ipfs` or `arweave`)

**Response** (200):
```json
{
  "cid": "QmX1234567890abcdef...",
  "url": "ipfs://QmX1234567890abcdef...",
  "provider": "ipfs"
}
```

**Errors**:
- `400`: Invalid data or provider
- `401`: Unauthorized
- `500`: Upload failed

---

#### GET /api/storage/metadata/:cid

Retrieve metadata from IPFS/Arweave.

**Authentication**: Optional

**Parameters**:
- `cid` (path): IPFS CID or Arweave transaction ID

**Response** (200):
```json
{
  "name": "Solidity Development",
  "description": "Expert in smart contract development",
  "evidence": ["https://github.com/user/project"],
  "tags": ["solidity", "ethereum", "web3"]
}
```

**Errors**:
- `404`: Metadata not found
- `500`: Retrieval failed

---

### Admin Endpoints

#### POST /api/admin/verifiers

Add a new verifier.

**Authentication**: Admin API Key

**Request Body**:
```json
{
  "address": "0x123...",
  "name": "Expert Verifier",
  "specialization": "Blockchain Development"
}
```

**Response** (201):
```json
{
  "address": "0x123...",
  "name": "Expert Verifier",
  "specialization": "Blockchain Development",
  "addedAt": "2024-01-15T12:00:00.000Z"
}
```

**Errors**:
- `400`: Invalid address or data
- `401`: Invalid API key
- `409`: Verifier already exists

---

#### DELETE /api/admin/verifiers/:address

Remove a verifier.

**Authentication**: Admin API Key

**Parameters**:
- `address` (path): Verifier address

**Response** (200):
```json
{
  "message": "Verifier removed successfully"
}
```

**Errors**:
- `401`: Invalid API key
- `404`: Verifier not found

---

#### GET /api/admin/stats

Get platform statistics.

**Authentication**: Admin API Key

**Response** (200):
```json
{
  "totalUsers": 1250,
  "totalClaims": 3420,
  "verifiedClaims": 2890,
  "pendingClaims": 530,
  "totalEndorsements": 8750,
  "activeVerifiers": 15,
  "last24h": {
    "newUsers": 45,
    "newClaims": 120,
    "verifications": 98
  }
}
```

**Errors**:
- `401`: Invalid API key

---

## Webhooks

### Skill Claim Created

Triggered when a new skill claim is created on-chain.

**Payload**:
```json
{
  "event": "SkillClaimCreated",
  "claimId": "1",
  "user": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "metadata": "ipfs://QmZ...",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "transactionHash": "0xabc..."
}
```

### Skill Verified

Triggered when a skill claim is verified.

**Payload**:
```json
{
  "event": "SkillVerified",
  "claimId": "1",
  "verifier": "0x123...",
  "timestamp": "2024-01-15T13:00:00.000Z",
  "transactionHash": "0xdef..."
}
```

### Endorsement Added

Triggered when an endorsement is added.

**Payload**:
```json
{
  "event": "EndorsementAdded",
  "claimId": "1",
  "endorser": "0x456...",
  "timestamp": "2024-01-15T14:00:00.000Z",
  "transactionHash": "0xghi..."
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Get profile
const profile = await api.get(`/profiles/${address}`);

// Update profile
const updated = await api.put(`/profiles/${address}`, {
  username: 'new_name',
  bio: 'New bio'
});

// Upload metadata
const upload = await api.post('/storage/upload', {
  data: { name: 'Skill', description: 'Description' },
  provider: 'ipfs'
});
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3001/api'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {access_token}'
}

# Get profile
response = requests.get(f'{BASE_URL}/profiles/{address}', headers=headers)
profile = response.json()

# Update profile
data = {'username': 'new_name', 'bio': 'New bio'}
response = requests.put(f'{BASE_URL}/profiles/{address}', json=data, headers=headers)
updated = response.json()
```

## Pagination

Endpoints returning lists support pagination:

**Query Parameters**:
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Number of results to skip (default: 0)

**Response**:
```json
{
  "items": [...],
  "total": 150,
  "limit": 20,
  "offset": 40
}
```

## API Key Management

### Create API Key

Generate a new API key for admin access.

**Endpoint**: `POST /api/v1/keys`

**Authentication**: Admin JWT or existing API key required

**Request**:
```json
{
  "name": "Production API Key",
  "description": "Main production key for automated services",
  "permissions": ["read", "write", "admin"],
  "expiresInDays": 365
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "apiKey": "tak_live_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production API Key",
    "description": "Main production key for automated services",
    "permissions": ["read", "write", "admin"],
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2025-01-15T10:30:00Z"
  },
  "warning": "Store this API key securely. It will not be shown again."
}
```

**Important**: The plaintext API key is returned only once. Store it securely immediately.

### List API Keys

Retrieve all API keys (without plaintext keys).

**Endpoint**: `GET /api/v1/keys`

**Authentication**: Admin JWT or API key required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Production API Key",
      "description": "Main production key",
      "permissions": ["read", "write", "admin"],
      "createdBy": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUsedAt": "2024-01-20T14:22:00Z",
      "expiresAt": "2025-01-15T10:30:00Z",
      "isActive": true
    }
  ]
}
```

### Revoke API Key

Deactivate an API key without deleting it.

**Endpoint**: `POST /api/v1/keys/:id/revoke`

**Authentication**: Admin JWT or API key required

**Response**:
```json
{
  "success": true,
  "message": "API key revoked successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production API Key"
  }
}
```

### Rotate API Key

Generate a new key with the same properties and revoke the old one.

**Endpoint**: `POST /api/v1/keys/:id/rotate`

**Authentication**: Admin JWT or API key required

**Response**:
```json
{
  "success": true,
  "data": {
    "apiKey": "tak_live_new9876543210fedcba0987654321fedcba0987654321fedcba0987654321",
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Production API Key",
    "description": "Main production key",
    "permissions": ["read", "write", "admin"],
    "createdAt": "2024-01-20T15:00:00Z",
    "expiresAt": "2025-01-15T10:30:00Z"
  },
  "warning": "Store this API key securely. It will not be shown again."
}
```

### Delete API Key

Permanently delete an API key.

**Endpoint**: `DELETE /api/v1/keys/:id`

**Authentication**: Admin JWT or API key required

**Response**:
```json
{
  "success": true,
  "message": "API key deleted successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Production API Key"
  }
}
```

### Generate API Key via CLI

For initial setup or onboarding, use the CLI script:

```bash
# Generate a new API key
cd backend
tsx scripts/generate-api-key.ts "Production Key" "Main production key" 365

# Output:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API KEY GENERATED SUCCESSFULLY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 
# ID:          550e8400-e29b-41d4-a716-446655440000
# Name:        Production Key
# Created:     2024-01-15T10:30:00Z
# Expires:     2025-01-15T10:30:00Z
# 
# ⚠️  IMPORTANT: Store this API key securely. It will NOT be shown again!
# 
# API Key:     tak_live_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
# 
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Script Usage**:
```bash
tsx scripts/generate-api-key.ts <name> [description] [expiresInDays]
```

**Parameters**:
- `name` (required): Human-readable name for the API key
- `description` (optional): Detailed description of key purpose
- `expiresInDays` (optional): Number of days until expiration (omit for no expiration)

### API Key Best Practices

1. **Secure Storage**:
   - Store API keys in environment variables or secure vaults
   - Never commit keys to version control
   - Use different keys for different environments (dev, staging, prod)

2. **Key Rotation**:
   - Rotate keys regularly (recommended: every 90-365 days)
   - Use the rotate endpoint to generate new keys seamlessly
   - Revoke old keys after rotation is complete

3. **Monitoring**:
   - Check `lastUsedAt` timestamps regularly
   - Revoke unused keys
   - Monitor for unexpected usage patterns

4. **Permissions**:
   - Grant minimal required permissions
   - Use separate keys for different services
   - Document key purposes in the description field

5. **Expiration**:
   - Set expiration dates for all keys
   - Automate key rotation before expiration
   - Monitor for expiring keys

## Filtering & Sorting

**Filter by status**:
```
GET /api/skills/0x123...?status=verified
```

**Sort results**:
```
GET /api/skills/0x123...?sort=createdAt&order=desc
```

## Versioning

API version is included in the base URL path:
- Current: `/api` (v1 implicit)
- Future: `/api/v2`

Breaking changes will increment the version number.

## Support

For API support:
- Documentation: https://docs.takumi.example
- Issues: https://github.com/takumi/issues
- Email: api-support@takumi.example
