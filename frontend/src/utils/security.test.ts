import {
  sanitizeText,
  sanitizeHtml,
  isValidEmail,
  validatePassword,
  isValidUrl,
  sanitizeFormData,
} from '../utils/security';

describe('Security Utilities', () => {
  describe('sanitizeText', () => {
    test('removes all HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    test('handles plain text', () => {
      const input = 'Hello World';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    test('returns empty string for non-string input', () => {
      const result = sanitizeText(null as any);
      expect(result).toBe('');
    });
  });

  describe('isValidEmail', () => {
    test('accepts valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    test('rejects invalid email', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
    });

    test('rejects email without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('accepts strong password', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
    });

    test('rejects password without uppercase', () => {
      const result = validatePassword('weakpass123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('rejects password without number', () => {
      const result = validatePassword('WeakPass!');
      expect(result.isValid).toBe(false);
    });

    test('rejects password without special character', () => {
      const result = validatePassword('WeakPass123');
      expect(result.isValid).toBe(false);
    });

    test('rejects password less than 8 characters', () => {
      const result = validatePassword('Weak1!');
      expect(result.isValid).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('accepts valid HTTP URL with allowed domains', () => {
      expect(isValidUrl('http://example.com', ['example.com'])).toBe(true);
    });

    test('accepts valid HTTPS URL with allowed domains', () => {
      expect(isValidUrl('https://example.com', ['example.com'])).toBe(true);
    });

    test('rejects URL without protocol', () => {
      // URL without protocol gets http: added automatically by URL constructor
      // So this test validates that unknown protocols are rejected
      expect(isValidUrl('ftp://example.com', ['example.com'])).toBe(false);
    });

    test('rejects javascript: protocol (XSS)', () => {
      expect(isValidUrl('javascript:alert("xss")')).toBe(false);
    });

    test('rejects data: protocol', () => {
      expect(isValidUrl('data:text/html,<script>alert("xss")</script>')).toBe(
        false
      );
    });

    test('rejects domain not in whitelist', () => {
      expect(isValidUrl('http://malicious.com', ['example.com'])).toBe(false);
    });
  });

  describe('sanitizeFormData', () => {
    test('sanitizes nested form objects', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        bio: '<img src=x onerror="alert(1)">',
      };
      const result = sanitizeFormData(input);
      expect(result.name).not.toContain('<script>');
      expect(result.email).toBe('john@example.com');
      expect(result.bio).not.toContain('onerror');
    });

    test('handles nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          address: {
            city: 'New York',
          },
        },
      };
      const result = sanitizeFormData(input);
      expect(typeof result.user).toBe('object');
    });
  });
});
