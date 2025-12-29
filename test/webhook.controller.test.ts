import request from 'supertest';
import app from '../src/index';
import { query } from '../src/config/database';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Webhook Controller', () => {
  let userToken: string;
  let testWebhookId: string;
  const testProfileId = 'test-profile-webhook';

  beforeAll(async () => {
    userToken = jwt.sign(
      { address: '0xwebhook', profileId: testProfileId },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Clean up test data
    await query('DELETE FROM webhooks WHERE profile_id = $1', [testProfileId]);
  });

  afterAll(async () => {
    await query('DELETE FROM webhooks WHERE profile_id = $1', [testProfileId]);
  });

  describe('POST /api/v1/webhooks', () => {
    it('should create a new webhook', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['transaction.confirmed', 'alert.triggered'],
          description: 'Test webhook',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.webhook).toBeDefined();
      expect(response.body.webhook.url).toBe('https://example.com/webhook');
      expect(response.body.webhook.secret).toBeDefined();

      testWebhookId = response.body.webhook.id;
    });

    it('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'not-a-valid-url',
          events: ['transaction.confirmed'],
        });

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .send({
          url: 'https://example.com/webhook',
          events: ['transaction.confirmed'],
        });

      expect(response.status).toBe(401);
    });

    it('should reject empty events array', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: [],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/webhooks', () => {
    it('should list user webhooks', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.webhooks)).toBe(true);
      expect(response.body.webhooks.length).toBeGreaterThan(0);
    });

    it('should not expose webhook secrets in list', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks')
        .set('Authorization', `Bearer ${userToken}`);

      response.body.webhooks.forEach((webhook: any) => {
        expect(webhook.secret).toBeUndefined();
      });
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/webhooks/:id', () => {
    it('should get webhook details', async () => {
      const response = await request(app)
        .get(`/api/v1/webhooks/${testWebhookId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.webhook.id).toBe(testWebhookId);
    });

    it('should reject invalid webhook ID', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks/invalid-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent webhook', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/webhooks/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/webhooks/:id', () => {
    it('should update webhook', async () => {
      const response = await request(app)
        .patch(`/api/v1/webhooks/${testWebhookId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'https://example.com/webhook-updated',
          events: ['alert.triggered'],
          is_active: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.webhook.url).toBe('https://example.com/webhook-updated');
    });

    it('should reject invalid update data', async () => {
      const response = await request(app)
        .patch(`/api/v1/webhooks/${testWebhookId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'invalid-url',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/webhooks/:id', () => {
    it('should delete webhook', async () => {
      const response = await request(app)
        .delete(`/api/v1/webhooks/${testWebhookId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for already deleted webhook', async () => {
      const response = await request(app)
        .delete(`/api/v1/webhooks/${testWebhookId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/webhooks/:id/test', () => {
    let activeWebhookId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'https://example.com/test-webhook',
          events: ['transaction.confirmed'],
        });

      activeWebhookId = response.body.webhook.id;
    });

    it('should send test webhook', async () => {
      const response = await request(app)
        .post(`/api/v1/webhooks/${activeWebhookId}/test`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject for non-existent webhook', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/v1/webhooks/${fakeId}/test`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });
});
