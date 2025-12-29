# API Tutorial - Takumi Platform

## Introduction

This comprehensive tutorial guides you through integrating with the Takumi API, from basic authentication to advanced features like webhooks and real-time notifications.

**Prerequisites:**
- Basic understanding of REST APIs
- Node.js/JavaScript knowledge (examples provided)
- Ethereum wallet and basic blockchain concepts
- API testing tool (Postman, curl, or similar)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication Flow](#authentication-flow)
3. [Profile Management](#profile-management)
4. [Skill Claims](#skill-claims)
5. [Endorsements](#endorsements)
6. [Pagination & Filtering](#pagination--filtering)
7. [Webhooks](#webhooks)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Best Practices](#best-practices)

---

## Getting Started

### Base URLs

```javascript
// Development
const BASE_URL = 'http://localhost:3001/api';

// Production
const BASE_URL = 'https://api.takumi.example/api';
```

### Quick Start Example

```javascript
// Install dependencies
// npm install axios ethers

const axios = require('axios');
const { ethers } = require('ethers');

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Test connection
async function testConnection() {
  try {
    const response = await api.get('/v1/health');
    console.log('API Status:', response.data);
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();
```

---

## Authentication Flow

### Step 1: Get Nonce

Request a unique nonce for your wallet address.

```javascript
async function getNonce(address) {
  try {
    const response = await api.get(`/v1/auth/nonce/${address}`);
    return response.data.data.nonce;
  } catch (error) {
    console.error('Failed to get nonce:', error.response?.data);
    throw error;
  }
}

// Example usage
const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const nonce = await getNonce(address);
console.log('Nonce:', nonce);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }
}
```

### Step 2: Sign Message

Sign the authentication message with your wallet.

```javascript
async function signAuthMessage(nonce, signer) {
  const message = `Sign this message to authenticate with Takumi:\n\nNonce: ${nonce}`;
  
  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error) {
    console.error('Signature rejected:', error.message);
    throw error;
  }
}

// Example with ethers.js
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const signature = await signAuthMessage(nonce, signer);
```

### Step 3: Verify and Get Tokens

Exchange signature for JWT tokens.

```javascript
async function authenticate(address, signature) {
  try {
    const response = await api.post('/v1/auth/verify', {
      address,
      signature
    });
    
    const { accessToken, refreshToken } = response.data.data;
    
    // Store tokens securely
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Set default authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    return response.data.data;
  } catch (error) {
    console.error('Authentication failed:', error.response?.data);
    throw error;
  }
}

// Complete authentication flow
async function login(address) {
  const nonce = await getNonce(address);
  const signature = await signAuthMessage(nonce, signer);
  const authData = await authenticate(address, signature);
  console.log('Logged in:', authData);
}
```

**Response:**
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

### Step 4: Refresh Tokens

Refresh expired access tokens without re-authentication.

```javascript
async function refreshAccessToken() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const response = await api.post('/v1/auth/refresh', {
      refreshToken
    });
    
    const { accessToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    return accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data);
    // Redirect to login
    throw error;
  }
}

// Auto-refresh on 401 errors
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        await refreshAccessToken();
        // Retry original request
        return api.request(error.config);
      } catch (refreshError) {
        // Redirect to login page
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Profile Management

### Get Profile by Address

```javascript
async function getProfile(address) {
  try {
    const response = await api.get(`/v1/profiles/${address}`);
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('Profile not found');
      return null;
    }
    throw error;
  }
}

// Example usage
const profile = await getProfile('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log('Profile:', profile);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "name": "Alice Developer",
    "bio": "Full-stack blockchain developer",
    "metadataURI": "ipfs://QmX...",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-02-20T14:22:00Z",
    "skillCount": 12,
    "endorsementCount": 45,
    "claimCount": 8
  }
}
```

### Get Profile Skills

```javascript
async function getProfileSkills(address, offset = 0, limit = 10) {
  try {
    const response = await api.get(`/v1/profiles/${address}/skills`, {
      params: { offset, limit }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch skills:', error.response?.data);
    throw error;
  }
}

// Example: Fetch all skills with pagination
async function getAllSkills(address) {
  const allSkills = [];
  let offset = 0;
  const limit = 50;
  
  while (true) {
    const { skills, total } = await getProfileSkills(address, offset, limit);
    allSkills.push(...skills);
    
    if (offset + limit >= total) break;
    offset += limit;
  }
  
  return allSkills;
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "id": 1,
        "name": "Solidity",
        "category": "Smart Contracts",
        "level": "Expert",
        "verified": true,
        "endorsementCount": 12,
        "createdAt": "2025-01-15T10:35:00Z"
      }
    ],
    "total": 12,
    "offset": 0,
    "limit": 10
  }
}
```

### Search Profiles

```javascript
async function searchProfiles(query, filters = {}) {
  try {
    const response = await api.get('/v1/profiles/search', {
      params: {
        q: query,
        skill: filters.skill,
        minEndorsements: filters.minEndorsements,
        verified: filters.verified,
        offset: filters.offset || 0,
        limit: filters.limit || 20
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Search failed:', error.response?.data);
    throw error;
  }
}

// Example: Search for Solidity developers
const results = await searchProfiles('developer', {
  skill: 'Solidity',
  minEndorsements: 5,
  verified: true
});
```

---

## Skill Claims

### Get Claims by Status

```javascript
async function getClaimsByStatus(status, offset = 0, limit = 20) {
  try {
    const response = await api.get('/v1/claims', {
      params: { status, offset, limit }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch claims:', error.response?.data);
    throw error;
  }
}

// Example: Get pending claims
const pendingClaims = await getClaimsByStatus('Pending');
console.log('Pending claims:', pendingClaims);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": 42,
        "claimant": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
        "skillName": "React",
        "evidenceURI": "ipfs://QmY...",
        "status": "Pending",
        "createdAt": "2025-02-20T09:15:00Z",
        "assignedVerifier": null
      }
    ],
    "total": 15,
    "offset": 0,
    "limit": 20
  }
}
```

### Get Claim Details

```javascript
async function getClaimDetails(claimId) {
  try {
    const response = await api.get(`/v1/claims/${claimId}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch claim:', error.response?.data);
    throw error;
  }
}

// Example usage
const claim = await getClaimDetails(42);
console.log('Claim details:', claim);
```

### Get User's Claims

```javascript
async function getUserClaims(address, status = null) {
  try {
    const params = { offset: 0, limit: 100 };
    if (status) params.status = status;
    
    const response = await api.get(`/v1/profiles/${address}/claims`, {
      params
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch user claims:', error.response?.data);
    throw error;
  }
}

// Example: Get all approved claims for a user
const approvedClaims = await getUserClaims(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  'Approved'
);
```

---

## Endorsements

### Get Endorsements for Profile

```javascript
async function getEndorsements(address, offset = 0, limit = 20) {
  try {
    const response = await api.get(`/v1/profiles/${address}/endorsements`, {
      params: { offset, limit }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch endorsements:', error.response?.data);
    throw error;
  }
}

// Example usage
const endorsements = await getEndorsements('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log('Endorsements:', endorsements);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "endorsements": [
      {
        "id": 123,
        "endorser": "0x1234567890abcdef1234567890abcdef12345678",
        "endorserName": "Bob Verifier",
        "skillName": "Solidity",
        "comment": "Excellent smart contract developer",
        "isVerified": true,
        "createdAt": "2025-02-18T16:45:00Z"
      }
    ],
    "total": 45,
    "offset": 0,
    "limit": 20
  }
}
```

### Get Endorsements Given by User

```javascript
async function getGivenEndorsements(address, offset = 0, limit = 20) {
  try {
    const response = await api.get(`/v1/profiles/${address}/endorsements/given`, {
      params: { offset, limit }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch given endorsements:', error.response?.data);
    throw error;
  }
}
```

---

## Pagination & Filtering

### Advanced Pagination Helper

```javascript
class PaginatedAPI {
  constructor(apiClient) {
    this.api = apiClient;
  }
  
  async *fetchAll(endpoint, params = {}, pageSize = 50) {
    let offset = 0;
    
    while (true) {
      const response = await this.api.get(endpoint, {
        params: { ...params, offset, limit: pageSize }
      });
      
      const { data, total } = response.data.data;
      
      for (const item of data) {
        yield item;
      }
      
      offset += pageSize;
      if (offset >= total) break;
    }
  }
  
  async fetchPage(endpoint, page = 1, pageSize = 20, params = {}) {
    const offset = (page - 1) * pageSize;
    const response = await this.api.get(endpoint, {
      params: { ...params, offset, limit: pageSize }
    });
    
    const { data, total } = response.data.data;
    
    return {
      data,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalItems: total,
      hasNext: offset + pageSize < total,
      hasPrev: page > 1
    };
  }
}

// Example usage
const paginatedAPI = new PaginatedAPI(api);

// Fetch all skills (generator)
for await (const skill of paginatedAPI.fetchAll('/v1/profiles/0x.../skills')) {
  console.log('Skill:', skill.name);
}

// Fetch specific page
const page2 = await paginatedAPI.fetchPage('/v1/claims', 2, 20, { status: 'Pending' });
console.log(`Page ${page2.page} of ${page2.totalPages}`);
```

### Filtering Examples

```javascript
// Filter claims by multiple criteria
async function filterClaims(filters) {
  const params = {
    status: filters.status,
    skillName: filters.skillName,
    claimant: filters.claimant,
    verifier: filters.verifier,
    fromDate: filters.fromDate?.toISOString(),
    toDate: filters.toDate?.toISOString(),
    offset: filters.offset || 0,
    limit: filters.limit || 20
  };
  
  // Remove undefined values
  Object.keys(params).forEach(key => 
    params[key] === undefined && delete params[key]
  );
  
  const response = await api.get('/v1/claims', { params });
  return response.data.data;
}

// Example: Get approved Solidity claims from last month
const filteredClaims = await filterClaims({
  status: 'Approved',
  skillName: 'Solidity',
  fromDate: new Date('2025-01-20'),
  toDate: new Date('2025-02-20')
});
```

---

## Webhooks

### Register Webhook

```javascript
async function registerWebhook(config) {
  try {
    const response = await api.post('/v1/webhooks', {
      url: config.url,
      events: config.events, // ['claim.created', 'endorsement.created', etc.]
      secret: config.secret, // Optional: for signature verification
      active: true
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to register webhook:', error.response?.data);
    throw error;
  }
}

// Example: Register webhook for claim events
const webhook = await registerWebhook({
  url: 'https://myapp.com/webhooks/takumi',
  events: ['claim.created', 'claim.approved', 'claim.rejected'],
  secret: 'my-webhook-secret-key'
});
console.log('Webhook ID:', webhook.id);
```

### Webhook Payload Example

```json
{
  "event": "claim.approved",
  "timestamp": "2025-02-20T15:30:00Z",
  "data": {
    "claimId": 42,
    "claimant": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
    "skillName": "React",
    "verifier": "0x1234567890abcdef1234567890abcdef12345678",
    "transactionHash": "0xabc..."
  },
  "signature": "sha256=..."
}
```

### Verify Webhook Signature

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// Express.js webhook handler
app.post('/webhooks/takumi', (req, res) => {
  const signature = req.headers['x-takumi-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  const { event, data } = req.body;
  console.log(`Received ${event}:`, data);
  
  res.status(200).json({ received: true });
});
```

### List and Manage Webhooks

```javascript
// List all webhooks
async function listWebhooks() {
  const response = await api.get('/v1/webhooks');
  return response.data.data;
}

// Update webhook
async function updateWebhook(webhookId, updates) {
  const response = await api.patch(`/v1/webhooks/${webhookId}`, updates);
  return response.data.data;
}

// Delete webhook
async function deleteWebhook(webhookId) {
  await api.delete(`/v1/webhooks/${webhookId}`);
}

// Example: Disable webhook temporarily
await updateWebhook(webhook.id, { active: false });
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "address",
      "issue": "Invalid Ethereum address format"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `BLOCKCHAIN_ERROR` | 503 | Blockchain RPC unavailable |

### Error Handling Best Practices

```javascript
class APIError extends Error {
  constructor(response) {
    super(response.data?.error?.message || 'API request failed');
    this.code = response.data?.error?.code;
    this.status = response.status;
    this.details = response.data?.error?.details;
  }
}

// Centralized error handler
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      throw new APIError(error.response);
    }
    throw error;
  }
);

// Usage with try-catch
async function safeAPICall() {
  try {
    const profile = await getProfile('0xinvalid');
  } catch (error) {
    if (error instanceof APIError) {
      switch (error.code) {
        case 'NOT_FOUND':
          console.log('Profile does not exist');
          break;
        case 'RATE_LIMIT_EXCEEDED':
          console.log('Rate limit hit, retrying in 60s...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          return safeAPICall(); // Retry
        default:
          console.error('API Error:', error.message);
      }
    } else {
      console.error('Network error:', error.message);
    }
  }
}
```

---

## Rate Limiting

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708444800
```

### Handle Rate Limits

```javascript
class RateLimitedAPI {
  constructor(apiClient) {
    this.api = apiClient;
    this.rateLimitRemaining = null;
    this.rateLimitReset = null;
    
    // Track rate limits
    this.api.interceptors.response.use(response => {
      this.rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining']);
      this.rateLimitReset = parseInt(response.headers['x-ratelimit-reset']);
      return response;
    });
  }
  
  async waitIfNeeded() {
    if (this.rateLimitRemaining <= 5) {
      const waitTime = (this.rateLimitReset * 1000) - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limit low, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  async request(config) {
    await this.waitIfNeeded();
    return this.api.request(config);
  }
}

// Usage
const rateLimitedAPI = new RateLimitedAPI(api);
await rateLimitedAPI.request({ method: 'GET', url: '/v1/profiles/0x...' });
```

---

## Best Practices

### 1. Connection Pooling

```javascript
const axios = require('axios');
const http = require('http');
const https = require('https');

const api = axios.create({
  baseURL: 'https://api.takumi.example/api',
  timeout: 10000,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  maxRedirects: 5
});
```

### 2. Retry Logic

```javascript
const axiosRetry = require('axios-retry');

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429;
  }
});
```

### 3. Request Caching

```javascript
const cache = new Map();

async function cachedRequest(endpoint, ttl = 60000) {
  const cached = cache.get(endpoint);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const response = await api.get(endpoint);
  cache.set(endpoint, {
    data: response.data,
    timestamp: Date.now()
  });
  
  return response.data;
}

// Example: Cache profile for 5 minutes
const profile = await cachedRequest('/v1/profiles/0x...', 300000);
```

### 4. Batch Requests

```javascript
async function batchGetProfiles(addresses) {
  const promises = addresses.map(addr => 
    getProfile(addr).catch(err => ({ error: err, address: addr }))
  );
  
  return Promise.all(promises);
}

// Example: Fetch 10 profiles concurrently
const addresses = ['0x...', '0x...', /* ... */];
const profiles = await batchGetProfiles(addresses);
```

### 5. Logging and Monitoring

```javascript
// Request logger
api.interceptors.request.use(config => {
  console.log(`[${new Date().toISOString()}] ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

// Response logger
api.interceptors.response.use(
  response => {
    console.log(`[${new Date().toISOString()}] ${response.status} ${response.config.url}`);
    return response;
  },
  error => {
    console.error(`[${new Date().toISOString()}] ERROR ${error.config?.url}:`, error.message);
    return Promise.reject(error);
  }
);
```

---

## Complete Integration Example

```javascript
const axios = require('axios');
const { ethers } = require('ethers');

class TakumiClient {
  constructor(baseURL, provider) {
    this.api = axios.create({ baseURL });
    this.provider = provider;
    this.accessToken = null;
  }
  
  async login(address) {
    // Get nonce
    const { data: { nonce } } = await this.api.get(`/v1/auth/nonce/${address}`);
    
    // Sign message
    const signer = this.provider.getSigner();
    const message = `Sign this message to authenticate with Takumi:\n\nNonce: ${nonce}`;
    const signature = await signer.signMessage(message);
    
    // Authenticate
    const { data: { accessToken } } = await this.api.post('/v1/auth/verify', {
      address,
      signature
    });
    
    this.accessToken = accessToken;
    this.api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  }
  
  async getProfile(address) {
    const { data } = await this.api.get(`/v1/profiles/${address}`);
    return data.data;
  }
  
  async searchProfiles(query, filters = {}) {
    const { data } = await this.api.get('/v1/profiles/search', {
      params: { q: query, ...filters }
    });
    return data.data;
  }
  
  async getClaims(status, offset = 0, limit = 20) {
    const { data } = await this.api.get('/v1/claims', {
      params: { status, offset, limit }
    });
    return data.data;
  }
}

// Usage
const provider = new ethers.providers.Web3Provider(window.ethereum);
const client = new TakumiClient('https://api.takumi.example/api', provider);

await client.login('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
const profile = await client.getProfile('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log('Profile:', profile);
```

---

## Additional Resources

- **API Reference**: [docs/API.md](./API.md)
- **Smart Contract Docs**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Security**: [docs/SECURITY.md](./SECURITY.md)

---

**Need Help?**
- GitHub Issues: https://github.com/takumi-platform/issues
- Discord: https://discord.gg/takumi
- Email: support@takumi.example.com
