import request from 'supertest';
import app from '../src/index';
import { query } from '../src/config/database';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Auth Controller', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';
  let authToken: string;

  beforeAll(async () => {
    // Clean up test data
    await query('DELETE FROM profiles WHERE wallet_address = $1', [testAddress]);
  });

  afterAll(async () => {
    // Clean up
    await query('DELETE FROM profiles WHERE wallet_address = $1', [testAddress]);
  });

  describe('POST /api/v1/auth/nonce', () => {
    it('should generate nonce for new address', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ address: testAddress });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.nonce).toBeDefined();
      expect(typeof response.body.nonce).toBe('string');
      expect(response.body.nonce.length).toBeGreaterThan(0);
    });

    it('should return existing nonce for known address', async () => {
      const response1 = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ address: testAddress });

      const response2 = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ address: testAddress });

      expect(response1.body.nonce).toBe(response2.body.nonce);
    });

    it('should reject invalid address format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ address: 'invalid-address' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing address', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/verify', () => {
    it('should reject without signature', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ address: testAddress });

      expect(response.status).toBe(400);
    });

    it('should reject invalid signature format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          address: testAddress,
          signature: 'invalid-signature',
        });

      expect(response.status).toBe(400);
    });

    it('should reject mismatched address', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({
          address: '0x0000000000000000000000000000000000000000',
          signature: '0x' + 'a'.repeat(130),
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    beforeAll(() => {
      authToken = jwt.sign(
        { address: testAddress, profileId: 'test-profile-id' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should refresh valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.expiresIn).toBeDefined();
    });

    it('should reject without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh');

      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { address: testAddress },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.address).toBe(testAddress);
    });

    it('should reject without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
    });
  });
});
