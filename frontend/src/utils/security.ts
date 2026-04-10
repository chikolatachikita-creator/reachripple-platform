/**
 * Security Utilities
 * Provides functions for secure data handling and XSS prevention
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - Raw HTML string
 * @returns Clean HTML string
 */
export const sanitizeHtml = (dirty: string): string => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitizes text to prevent XSS (strips all tags)
 * @param text - Raw text string
 * @returns Plain text
 */
export const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};

/**
 * Validates email format
 * @param email - Email string
 * @returns true if valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * @param password - Password string
 * @returns object with isValid and errors
 */
export const validatePassword = (password: string) => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates URL to prevent open redirect attacks
 * @param url - URL string
 * @param allowedDomains - Optional list of allowed domains
 * @returns true if valid
 */
export const isValidUrl = (url: string, allowedDomains?: string[]): boolean => {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Check against allowed domains if provided
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.includes(urlObj.hostname);
    }
    
    // Default: only allow same origin
    return urlObj.hostname === window.location.hostname;
  } catch {
    return false;
  }
};

/**
 * Sanitizes form input data
 * @param data - Object with form data
 * @returns Sanitized data
 */
export const sanitizeFormData = (data: Record<string, any>) => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

const securityUtils = {
  sanitizeHtml,
  sanitizeText,
  isValidEmail,
  validatePassword,
  isValidUrl,
  sanitizeFormData,
};

export default securityUtils;
