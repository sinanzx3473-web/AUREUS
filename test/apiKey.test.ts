import request from 'supertest';
import app from '../src/index';
import { query } from '../src/config/database';
import { generateApiKey, hashApiKey } from '../src/utils/crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('API Key Management', () => {
  let adminToken: string;
  let testApiKeyId: string;

  beforeAll(async () => {
    // Create admin token
    adminToken = jwt.sign(
      { address: '0xadmin', isAdmin: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Clean up test data
    await query('DELETE FROM api_keys WHERE name LIKE $1', ['Test API Key%']);
  });

  afterAll(async () => {
    // Clean up
    await query('DELETE FROM api_keys WHERE name LIKE $1', ['Test API Key%']);
  });

  describe('POST /api/v1/keys', () => {
    it('should create a new API key', async () => {
      const response = await request(app)
        .post('/api/v1/keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test API Key 1',
          description: 'Test key for unit tests',
          permissions: ['read', 'write'],
          expiresInDays: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.apiKey).toMatch(/^tak_live_[a-f0-9]{64}$/);
      expect(response.body.data.name).toBe('Test API Key 1');
      expect(response.body.data.description).toBe('Test key for unit tests');
      expect(response.body.warning).toContain('Store this API key securely');

      testApiKeyId = response.body.data.id;
    });

    it('should reject request without admin token', async () => {
      const response = await request(app)
        .post('/api/v1/keys')
        .send({
          name: 'Test API Key',
        });

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid name', async () => {
      const response = await request(app)
        .post('/api/v1/keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/keys', () => {
    it('should list all API keys', async () => {
      const response = await request(app)
        .get('/api/v1/keys')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify no plaintext keys are returned
      response.body.data.forEach((key: any) => {
        expect(key.apiKey).toBeUndefined();
        expect(key.key_hash).toBeUndefined();
        expect(key.id).toBeDefined();
        expect(key.name).toBeDefined();
      });
    });

    it('should reject request without admin token', async () => {
      const response = await request(app).get('/api/v1/keys');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/keys/:id/revoke', () => {
    it('should revoke an API key', async () => {
      const response = await request(app)
        .post(`/api/v1/keys/${testApiKeyId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('revoked');
    });

    it('should reject request with invalid ID', async () => {
      const response = await request(app)
        .post('/api/v1/keys/invalid-id/revoke')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/keys/:id/rotate', () => {
    let rotateTestKeyId: string;

    beforeAll(async () => {
      // Create a key to rotate
      const response = await request(app)
        .post('/api/v1/keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test API Key for Rotation',
        });

      rotateTestKeyId = response.body.data.id;
    });

    it('should rotate an API key', async () => {
      const response = await request(app)
        .post(`/api/v1/keys/${rotateTestKeyId}/rotate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.apiKey).toMatch(/^tak_live_[a-f0-9]{64}$/);
      expect(response.body.data.name).toBe('Test API Key for Rotation');
      expect(response.body.warning).toContain('Store this API key securely');
    });
  });

  describe('DELETE /api/v1/keys/:id', () => {
    let deleteTestKeyId: string;

    beforeAll(async () => {
      // Create a key to delete
      const response = await request(app)
        .post('/api/v1/keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test API Key for Deletion',
        });

      deleteTestKeyId = response.body.data.id;
    });

    it('should delete an API key', async () => {
      const response = await request(app)
        .delete(`/api/v1/keys/${deleteTestKeyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .delete(`/api/v1/keys/${deleteTestKeyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('API Key Authentication', () => {
    let validApiKey: string;

    beforeAll(async () => {
      // Create a valid API key for testing
      const apiKey = generateApiKey('live');
      const keyHash = await hashApiKey(apiKey);

      await query(
        `INSERT INTO api_keys (key_hash, name, created_by, is_active)
         VALUES ($1, $2, $3, true)`,
        [keyHash, 'Test Auth Key', '0xtest']
      );

      validApiKey = apiKey;
    });

    it('should authenticate with valid API key', async () => {
      const response = await request(app)
        .get('/api/v1/keys')
        .set('X-API-Key', validApiKey);

      expect(response.status).toBe(200);
    });

    it('should reject invalid API key', async () => {
      const invalidKey = generateApiKey('live');

      const response = await request(app)
        .get('/api/v1/keys')
        .set('X-API-Key', invalidKey);

      expect(response.status).toBe(403);
    });

    it('should reject malformed API key', async () => {
      const response = await request(app)
        .get('/api/v1/keys')
        .set('X-API-Key', 'invalid-format');

      expect(response.status).toBe(403);
    });

    it('should reject request without API key', async () => {
      const response = await request(app).get('/api/v1/keys');

      expect(response.status).toBe(401);
    });
  });
});
