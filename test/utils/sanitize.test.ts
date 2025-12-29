import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeHtml } from '@/utils/sanitize';

describe('sanitize utilities', () => {
  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeText(input);
      expect(result).not.toContain('onclick');
    });

    it('should preserve safe content', () => {
      const input = 'Hello <b>World</b>';
      const result = sanitizeText(input);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should handle empty strings', () => {
      expect(sanitizeText('')).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove dangerous tags', () => {
      const input = '<p>Safe</p><script>alert(1)</script>';
      const result = sanitizeHtml(input);
      expect(result).toContain('Safe');
      expect(result).not.toContain('<script>');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });
  });
});
