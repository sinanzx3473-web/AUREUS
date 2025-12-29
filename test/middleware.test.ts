import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../src/middleware/errorHandler';
import { csrfProtection, getCsrfToken } from '../src/middleware/csrf';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Middleware Tests', () => {
  describe('Error Handler Middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    it('should handle generic errors', async () => {
      app.get('/test-error', () => {
        throw new Error('Test error');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test-error');

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should handle validation errors', async () => {
      app.post('/test-validation', (req, res) => {
        const error: any = new Error('Validation failed');
        error.statusCode = 400;
        error.details = ['Field is required'];
        throw error;
      });
      app.use(errorHandler);

      const response = await request(app).post('/test-validation');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation');
    });

    it('should handle unauthorized errors', async () => {
      app.get('/test-auth', (req, res) => {
        const error: any = new Error('Unauthorized');
        error.statusCode = 401;
        throw error;
      });
      app.use(errorHandler);

      const response = await request(app).get('/test-auth');

      expect(response.status).toBe(401);
    });

    it('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test-stack', () => {
        throw new Error('Production error');
      });
      app.use(errorHandler);

      const response = await request(app).get('/test-stack');

      expect(response.body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('CSRF Protection Middleware', () => {
    let app: express.Application;
    let userToken: string;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      userToken = jwt.sign(
        { address: '0xtest', profileId: 'test-profile' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Mock auth middleware
      app.use((req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            req.user = jwt.verify(token, JWT_SECRET) as any;
          } catch (error) {
            // Invalid token
          }
        }
        next();
      });
    });

    it('should generate CSRF token', async () => {
      app.get('/csrf-token', (req, res) => {
        const token = generateCsrfToken(req, res);
        res.json({ csrfToken: token });
      });

      const response = await request(app)
        .get('/csrf-token')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.csrfToken).toBeDefined();
      expect(typeof response.body.csrfToken).toBe('string');
    });

    it('should accept valid CSRF token', async () => {
      let csrfToken: string;

      app.get('/get-token', (req, res) => {
        csrfToken = generateCsrfToken(req, res);
        res.json({ csrfToken });
      });

      app.post('/protected', csrfProtection, (req, res) => {
        res.json({ success: true });
      });

      // Get token first
      const tokenResponse = await request(app)
        .get('/get-token')
        .set('Authorization', `Bearer ${userToken}`);

      csrfToken = tokenResponse.body.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      // Use token
      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken);

      expect(response.status).toBe(200);
    });

    it('should reject missing CSRF token', async () => {
      app.post('/protected', csrfProtection, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject invalid CSRF token', async () => {
      app.post('/protected', csrfProtection, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/protected')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-CSRF-Token', 'invalid-token');

      expect(response.status).toBe(403);
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('should allow requests within limit', async () => {
      const app = express();
      const { apiLimiter } = require('../src/middleware/rateLimit');

      app.use(apiLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should block requests exceeding limit', async () => {
      const app = express();
      const { strictLimiter } = require('../src/middleware/rateLimit');

      app.use(strictLimiter);
      app.post('/test', (req, res) => res.json({ success: true }));

      // Make multiple requests to exceed limit
      const requests = Array(20).fill(null).map(() =>
        request(app).post('/test')
      );

      const responses = await Promise.all(requests);
      const blockedResponses = responses.filter(r => r.status === 429);

      expect(blockedResponses.length).toBeGreaterThan(0);
    });
  });
});
