import request from 'supertest';
import express, { Express } from 'express';
import alertsRouter from '../src/routes/alerts.routes';
import metricsRouter from '../src/routes/metrics.routes';
import skillRouter from '../src/routes/skill.routes';
import storageRouter from '../src/routes/storage.routes';
import notificationRouter from '../src/routes/notification.routes';
import profileRouter from '../src/routes/profile.routes';
import { query } from '../src/config/database';
import * as skillController from '../src/controllers/skill.controller';
import * as storageController from '../src/controllers/storage.controller';
import * as notificationController from '../src/controllers/notification.controller';
import * as profileController from '../src/controllers/profile.controller';
import { metricsCollector } from '../src/middleware/metricsCollector';
import { register } from 'prom-client';

jest.mock('../src/config/database');
jest.mock('../src/controllers/skill.controller');
jest.mock('../src/controllers/storage.controller');
jest.mock('../src/controllers/notification.controller');
jest.mock('../src/controllers/profile.controller');
jest.mock('../src/middleware/metricsCollector');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Alerts Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/alerts', alertsRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/alerts/webhook', () => {
    it('should process alertmanager webhook successfully', async () => {
      const webhook = {
        version: '4',
        groupKey: 'test-group',
        status: 'firing' as const,
        receiver: 'webhook',
        groupLabels: { alertname: 'TestAlert' },
        commonLabels: {},
        commonAnnotations: {},
        externalURL: 'http://alertmanager:9093',
        alerts: [
          {
            status: 'firing' as const,
            labels: { alertname: 'HighCPU', severity: 'warning' },
            annotations: { description: 'CPU usage is high' },
            startsAt: '2024-01-01T00:00:00Z',
            endsAt: '0001-01-01T00:00:00Z',
            generatorURL: 'http://prometheus:9090',
            fingerprint: 'abc123',
          },
        ],
      };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .post('/api/v1/alerts/webhook')
        .send(webhook);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.alertsProcessed).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['alert', 'HighCPU', 'CPU usage is high', 'warning'])
      );
    });

    it('should handle critical alerts', async () => {
      const webhook = {
        version: '4',
        groupKey: 'critical-group',
        status: 'firing' as const,
        receiver: 'webhook',
        groupLabels: {},
        commonLabels: {},
        commonAnnotations: {},
        externalURL: 'http://alertmanager:9093',
        alerts: [
          {
            status: 'firing' as const,
            labels: { alertname: 'APIDown', severity: 'critical' },
            annotations: { description: 'API is not responding' },
            startsAt: '2024-01-01T00:00:00Z',
            endsAt: '0001-01-01T00:00:00Z',
            generatorURL: 'http://prometheus:9090',
            fingerprint: 'critical123',
          },
        ],
      };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .post('/api/v1/alerts/webhook')
        .send(webhook);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle resolved alerts', async () => {
      const webhook = {
        version: '4',
        groupKey: 'resolved-group',
        status: 'resolved' as const,
        receiver: 'webhook',
        groupLabels: {},
        commonLabels: {},
        commonAnnotations: {},
        externalURL: 'http://alertmanager:9093',
        alerts: [
          {
            status: 'resolved' as const,
            labels: { alertname: 'HighCPU', severity: 'warning' },
            annotations: { summary: 'CPU usage normalized' },
            startsAt: '2024-01-01T00:00:00Z',
            endsAt: '2024-01-01T01:00:00Z',
            generatorURL: 'http://prometheus:9090',
            fingerprint: 'resolved123',
          },
        ],
      };

      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .post('/api/v1/alerts/webhook')
        .send(webhook);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should continue processing alerts even if database insert fails', async () => {
      const webhook = {
        version: '4',
        groupKey: 'test-group',
        status: 'firing' as const,
        receiver: 'webhook',
        groupLabels: {},
        commonLabels: {},
        commonAnnotations: {},
        externalURL: 'http://alertmanager:9093',
        alerts: [
          {
            status: 'firing' as const,
            labels: { alertname: 'TestAlert' },
            annotations: { description: 'Test alert' },
            startsAt: '2024-01-01T00:00:00Z',
            endsAt: '0001-01-01T00:00:00Z',
            generatorURL: 'http://prometheus:9090',
            fingerprint: 'test123',
          },
        ],
      };

      mockQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/alerts/webhook')
        .send(webhook);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle webhook processing errors', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/webhook')
        .send({ invalid: 'data' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/alerts/history', () => {
    it('should fetch alert history with default pagination', async () => {
      const mockAlerts = [
        { id: 1, type: 'alert', title: 'Alert 1', severity: 'warning' },
        { id: 2, type: 'alert', title: 'Alert 2', severity: 'critical' },
      ];

      mockQuery.mockResolvedValue({ rows: mockAlerts, rowCount: 2 } as any);

      const response = await request(app).get('/api/v1/alerts/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAlerts);
      expect(response.body.pagination).toEqual({
        limit: 50,
        offset: 0,
        total: 2,
      });
    });

    it('should filter alerts by severity', async () => {
      const mockAlerts = [
        { id: 1, type: 'alert', title: 'Critical Alert', severity: 'critical' },
      ];

      mockQuery.mockResolvedValue({ rows: mockAlerts, rowCount: 1 } as any);

      const response = await request(app)
        .get('/api/v1/alerts/history')
        .query({ severity: 'critical' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockAlerts);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND severity = $1'),
        expect.arrayContaining(['critical', 50, 0])
      );
    });

    it('should handle custom pagination parameters', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const response = await request(app)
        .get('/api/v1/alerts/history')
        .query({ limit: 10, offset: 20 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        limit: 10,
        offset: 20,
        total: 0,
      });
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/v1/alerts/history');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});

describe('Metrics Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/metrics', metricsRouter);
    jest.clearAllMocks();
  });

  describe('GET /metrics', () => {
    it('should return prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('takumi_');
    });

    it('should handle metrics collection errors', async () => {
      jest.spyOn(register, 'metrics').mockRejectedValue(new Error('Metrics error'));

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error collecting metrics');

      jest.restoreAllMocks();
    });
  });

  describe('GET /metrics/indexer', () => {
    it('should return indexer-specific metrics', async () => {
      const response = await request(app).get('/metrics/indexer');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should handle indexer metrics errors', async () => {
      jest.spyOn(register, 'getSingleMetricAsString').mockRejectedValue(new Error('Error'));

      const response = await request(app).get('/metrics/indexer');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Error collecting indexer metrics');

      jest.restoreAllMocks();
    });
  });

  describe('GET /metrics/api', () => {
    it('should return API metrics summary with default time window', async () => {
      const mockSummary = {
        totalRequests: 1000,
        averageResponseTime: 150,
        errorRate: 0.02,
      };

      (metricsCollector.getAPIMetricsSummary as jest.Mock).mockReturnValue(mockSummary);

      const response = await request(app)
        .get('/metrics/api')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.timeWindow).toBe('60 minutes');
      expect(response.body.metrics).toEqual(mockSummary);
      expect(metricsCollector.getAPIMetricsSummary).toHaveBeenCalledWith(60);
    });

    it('should accept custom time window', async () => {
      const mockSummary = { totalRequests: 500 };

      (metricsCollector.getAPIMetricsSummary as jest.Mock).mockReturnValue(mockSummary);

      const response = await request(app)
        .get('/metrics/api')
        .query({ minutes: 30 })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.timeWindow).toBe('30 minutes');
      expect(metricsCollector.getAPIMetricsSummary).toHaveBeenCalledWith(30);
    });

    it('should handle errors', async () => {
      (metricsCollector.getAPIMetricsSummary as jest.Mock).mockImplementation(() => {
        throw new Error('Metrics error');
      });

      const response = await request(app)
        .get('/metrics/api')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch API metrics');
    });
  });

  describe('GET /metrics/gas', () => {
    it('should return gas metrics summary', async () => {
      const mockSummary = {
        totalGasUsed: '1000000',
        averageGasPrice: '50',
        totalCost: '0.05',
      };

      (metricsCollector.getGasMetricsSummary as jest.Mock).mockReturnValue(mockSummary);

      const response = await request(app)
        .get('/metrics/gas')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.timeWindow).toBe('24 hours');
      expect(response.body.metrics).toEqual(mockSummary);
    });

    it('should accept custom hours parameter', async () => {
      (metricsCollector.getGasMetricsSummary as jest.Mock).mockReturnValue({});

      const response = await request(app)
        .get('/metrics/gas')
        .query({ hours: 48 })
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(metricsCollector.getGasMetricsSummary).toHaveBeenCalledWith(48);
    });

    it('should handle errors', async () => {
      (metricsCollector.getGasMetricsSummary as jest.Mock).mockImplementation(() => {
        throw new Error('Gas metrics error');
      });

      const response = await request(app)
        .get('/metrics/gas')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
    });
  });

  describe('GET /metrics/errors', () => {
    it('should return error metrics', async () => {
      const mockErrors = {
        total: 50,
        byType: { ValidationError: 20, DatabaseError: 30 },
      };

      (metricsCollector.getErrorMetrics as jest.Mock).mockReturnValue(mockErrors);

      const response = await request(app)
        .get('/metrics/errors')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.errors).toEqual(mockErrors);
    });

    it('should handle errors', async () => {
      (metricsCollector.getErrorMetrics as jest.Mock).mockImplementation(() => {
        throw new Error('Error metrics error');
      });

      const response = await request(app)
        .get('/metrics/errors')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
    });
  });
});

describe('Skill Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/skills', skillRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/skills', () => {
    it('should call getSkills controller', async () => {
      (skillController.getSkills as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app).get('/api/v1/skills');

      expect(response.status).toBe(200);
      expect(skillController.getSkills).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/skills/search', () => {
    it('should call searchSkills controller', async () => {
      (skillController.searchSkills as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, results: [] });
      });

      const response = await request(app)
        .get('/api/v1/skills/search')
        .query({ q: 'javascript' });

      expect(response.status).toBe(200);
      expect(skillController.searchSkills).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/skills/categories', () => {
    it('should call getSkillCategories controller', async () => {
      (skillController.getSkillCategories as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, categories: [] });
      });

      const response = await request(app).get('/api/v1/skills/categories');

      expect(response.status).toBe(200);
      expect(skillController.getSkillCategories).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/skills/profile/:profileId', () => {
    it('should call getSkillsByProfile controller', async () => {
      (skillController.getSkillsByProfile as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, skills: [] });
      });

      const response = await request(app).get('/api/v1/skills/profile/123');

      expect(response.status).toBe(200);
      expect(skillController.getSkillsByProfile).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/skills/:id', () => {
    it('should call getSkillById controller', async () => {
      (skillController.getSkillById as jest.Mock).mockImplementation((_req, res) => {
        res.json({ success: true, skill: {} });
      });

      const response = await request(app).get('/api/v1/skills/456');

      expect(response.status).toBe(200);
      expect(skillController.getSkillById).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/skills/:id/endorsements', () => {
    it('should call getSkillWithEndorsements controller', async () => {
      (skillController.getSkillWithEndorsements as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, skill: {}, endorsements: [] });
      });

      const response = await request(app).get('/api/v1/skills/789/endorsements');

      expect(response.status).toBe(200);
      expect(skillController.getSkillWithEndorsements).toHaveBeenCalled();
    });
  });
});

describe('Storage Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/storage', storageRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/storage/skill', () => {
    it('should call uploadSkillMetadata controller', async () => {
      (storageController.uploadSkillMetadata as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, cid: 'QmTest' });
      });

      const response = await request(app)
        .post('/api/v1/storage/skill')
        .set('Authorization', 'Bearer valid-token')
        .send({ skillData: {} });

      expect(response.status).toBe(200);
      expect(storageController.uploadSkillMetadata).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/storage/profile', () => {
    it('should call uploadProfileMetadata controller', async () => {
      (storageController.uploadProfileMetadata as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, cid: 'QmProfile' });
      });

      const response = await request(app)
        .post('/api/v1/storage/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({ profileData: {} });

      expect(response.status).toBe(200);
      expect(storageController.uploadProfileMetadata).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/storage/file', () => {
    it('should call uploadFile controller', async () => {
      (storageController.uploadFile as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, cid: 'QmFile' });
      });

      const response = await request(app)
        .post('/api/v1/storage/file')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('test file content'), 'test.txt');

      expect(response.status).toBe(200);
      expect(storageController.uploadFile).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/storage/metadata', () => {
    it('should call getMetadata controller', async () => {
      (storageController.getMetadata as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, metadata: {} });
      });

      const response = await request(app)
        .get('/api/v1/storage/metadata')
        .query({ cid: 'QmTest' });

      expect(response.status).toBe(200);
      expect(storageController.getMetadata).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/storage/pin', () => {
    it('should call pinContent controller', async () => {
      (storageController.pinContent as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, pinned: true });
      });

      const response = await request(app)
        .post('/api/v1/storage/pin')
        .set('Authorization', 'Bearer valid-token')
        .send({ cid: 'QmTest' });

      expect(response.status).toBe(200);
      expect(storageController.pinContent).toHaveBeenCalled();
    });
  });
});

describe('Notification Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/notifications', notificationRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/notifications', () => {
    it('should call getNotifications controller', async () => {
      (notificationController.getNotifications as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, notifications: [] });
      });

      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationController.getNotifications).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/notifications/:id/read', () => {
    it('should call markAsRead controller', async () => {
      (notificationController.markAsRead as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/notifications/123/read')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationController.markAsRead).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/notifications/read-all', () => {
    it('should call markAllAsRead controller', async () => {
      (notificationController.markAllAsRead as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/notifications/read-all')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationController.markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should call deleteNotification controller', async () => {
      (notificationController.deleteNotification as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .delete('/api/v1/notifications/123')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationController.deleteNotification).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/notifications/preferences', () => {
    it('should call getPreferences controller', async () => {
      (notificationController.getPreferences as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, preferences: {} });
      });

      const response = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(notificationController.getPreferences).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/notifications/preferences', () => {
    it('should call updatePreferences controller', async () => {
      (notificationController.updatePreferences as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/notifications/preferences')
        .set('Authorization', 'Bearer valid-token')
        .send({ emailEnabled: true });

      expect(response.status).toBe(200);
      expect(notificationController.updatePreferences).toHaveBeenCalled();
    });
  });
});

describe('Profile Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/profiles', profileRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/profiles', () => {
    it('should call getProfiles controller', async () => {
      (profileController.getProfiles as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, profiles: [] });
      });

      const response = await request(app).get('/api/v1/profiles');

      expect(response.status).toBe(200);
      expect(profileController.getProfiles).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/profiles/search', () => {
    it('should call searchProfiles controller', async () => {
      (profileController.searchProfiles as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, results: [] });
      });

      const response = await request(app)
        .get('/api/v1/profiles/search')
        .query({ q: 'developer' });

      expect(response.status).toBe(200);
      expect(profileController.searchProfiles).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/profiles/:id', () => {
    it('should call getProfileById controller', async () => {
      (profileController.getProfileById as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, profile: {} });
      });

      const response = await request(app).get('/api/v1/profiles/123');

      expect(response.status).toBe(200);
      expect(profileController.getProfileById).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/profiles/address/:address', () => {
    it('should call getProfileByAddress controller', async () => {
      (profileController.getProfileByAddress as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, profile: {} });
      });

      const response = await request(app).get('/api/v1/profiles/address/0x123');

      expect(response.status).toBe(200);
      expect(profileController.getProfileByAddress).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/profiles/:id', () => {
    it('should call updateProfile controller', async () => {
      (profileController.updateProfile as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/profiles/123')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(profileController.updateProfile).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/profiles/:id/stats', () => {
    it('should call getProfileStats controller', async () => {
      (profileController.getProfileStats as jest.Mock).mockImplementation((req, res) => {
        res.json({ success: true, stats: {} });
      });

      const response = await request(app).get('/api/v1/profiles/123/stats');

      expect(response.status).toBe(200);
      expect(profileController.getProfileStats).toHaveBeenCalled();
    });
  });
});
