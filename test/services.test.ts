import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import storageService from '../src/services/storage.service';
import notificationService from '../src/services/notification.service';
import { query } from '../src/config/database';

// Mock database
jest.mock('../src/config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadMetadata', () => {
    it('should upload metadata to IPFS', async () => {
      const metadata = {
        name: 'Test Skill',
        description: 'Test Description',
        skillId: '123',
        timestamp: new Date().toISOString(),
      };

      const result = await storageService.uploadMetadata(metadata);
      
      expect(result).toHaveProperty('cid');
      expect(typeof result.cid).toBe('string');
    });

    it('should handle upload errors', async () => {
      const invalidMetadata = null as any;

      await expect(
        storageService.uploadMetadata(invalidMetadata)
      ).rejects.toThrow();
    });
  });

  describe('getFromIPFS', () => {
    it('should retrieve metadata from IPFS', async () => {
      const cid = 'QmTest123';
      
      const result = await storageService.getFromIPFS(cid);
      
      expect(result).toBeDefined();
    });
  });
});

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      await notificationService.createNotification(
        '0x123',
        'endorsement',
        'New Endorsement',
        'You received an endorsement',
        JSON.stringify({ skillId: '456' })
      );

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve notifications for a user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, user_address: '0x123', type: 'endorsement', title: 'Test 1', message: 'Message 1' },
          { id: 2, user_address: '0x123', type: 'skill_claimed', title: 'Test 2', message: 'Message 2' },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const notifications = await notificationService.getUserNotifications('0x123', 10, 0);

      expect(notifications).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await notificationService.markAsRead('1', '0x123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.arrayContaining(['1', '0x123'])
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 5,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await notificationService.markAllAsRead('0x123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.arrayContaining(['0x123'])
      );
    });
  });
});
