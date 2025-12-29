import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  constantTimeCompare,
  generateSecureToken,
  hashPassword,
  verifyPassword,
} from '../src/utils/crypto';

describe('Crypto Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate a valid live API key', () => {
      const key = generateApiKey('live');
      expect(key).toMatch(/^tak_live_[a-f0-9]{64}$/);
    });

    it('should generate a valid test API key', () => {
      const key = generateApiKey('test');
      expect(key).toMatch(/^tak_test_[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey('live');
      const key2 = generateApiKey('live');
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey and verifyApiKey', () => {
    it('should hash and verify API key correctly', async () => {
      const apiKey = generateApiKey('live');
      const hash = await hashApiKey(apiKey);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(apiKey);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars

      const isValid = await verifyApiKey(apiKey, hash);
      expect(isValid).toBe(true);
    });

    it('should reject invalid API key', async () => {
      const apiKey = generateApiKey('live');
      const hash = await hashApiKey(apiKey);

      const wrongKey = generateApiKey('live');
      const isValid = await verifyApiKey(wrongKey, hash);
      expect(isValid).toBe(false);
    });

    it('should use constant-time comparison (bcrypt)', async () => {
      const apiKey = generateApiKey('live');
      const hash = await hashApiKey(apiKey);

      // Measure time for correct key
      const start1 = process.hrtime.bigint();
      await verifyApiKey(apiKey, hash);
      const end1 = process.hrtime.bigint();
      const time1 = Number(end1 - start1);

      // Measure time for incorrect key
      const wrongKey = generateApiKey('live');
      const start2 = process.hrtime.bigint();
      await verifyApiKey(wrongKey, hash);
      const end2 = process.hrtime.bigint();
      const time2 = Number(end2 - start2);

      // Times should be similar (within 50% variance due to bcrypt's nature)
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      expect(ratio).toBeLessThan(2); // Allow 2x variance for bcrypt
    });

    it('should generate different hashes for same key', async () => {
      const apiKey = generateApiKey('live');
      const hash1 = await hashApiKey(apiKey);
      const hash2 = await hashApiKey(apiKey);

      // bcrypt uses random salts, so hashes should differ
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await verifyApiKey(apiKey, hash1)).toBe(true);
      expect(await verifyApiKey(apiKey, hash2)).toBe(true);
    });
  });

  describe('constantTimeCompare', () => {
    it('should return true for equal strings', () => {
      const str = 'test_string_123';
      expect(constantTimeCompare(str, str)).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeCompare('string1', 'string2')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(constantTimeCompare('short', 'much_longer_string')).toBe(false);
    });

    it('should use constant time comparison', () => {
      const str1 = 'a'.repeat(100);
      const str2 = 'a'.repeat(99) + 'b';
      const str3 = 'b' + 'a'.repeat(99);

      // Measure time for difference at end
      const start1 = process.hrtime.bigint();
      constantTimeCompare(str1, str2);
      const end1 = process.hrtime.bigint();
      const time1 = Number(end1 - start1);

      // Measure time for difference at start
      const start2 = process.hrtime.bigint();
      constantTimeCompare(str1, str3);
      const end2 = process.hrtime.bigint();
      const time2 = Number(end2 - start2);

      // Times should be similar (within reasonable variance)
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      expect(ratio).toBeLessThan(10); // Allow 10x variance for small operations
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token with default length', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
    });

    it('should generate token with custom length', () => {
      const token = generateSecureToken(16);
      expect(token).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject invalid password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should handle special characters', async () => {
      const password = 'P@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });
});
