/**
 * Security configuration for production
 * Generate strong secrets using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
 */

import crypto from "crypto";

// Generate a secure random secret if not provided
const generateSecret = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

// Security configuration
export const securityConfig = {
  // JWT Configuration — REQUIRE env vars in production; fallback warns loudly in dev
  jwt: {
    accessSecret: (() => {
      if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[SECURITY] JWT_SECRET must be set in production! Server cannot start without it.');
      }
      const s = generateSecret();
      console.error('\x1b[31m[SECURITY] JWT_SECRET not set! Using random secret — tokens will not survive restarts.\x1b[0m');
      return s;
    })(),
    refreshSecret: (() => {
      if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET;
      if (process.env.NODE_ENV === 'production') {
        throw new Error('[SECURITY] JWT_REFRESH_SECRET must be set in production! Server cannot start without it.');
      }
      const s = generateSecret();
      console.error('\x1b[31m[SECURITY] JWT_REFRESH_SECRET not set! Using random secret — tokens will not survive restarts.\x1b[0m');
      return s;
    })(),
    accessExpiresIn: "15m",
    refreshExpiresIn: "7d",
  },

  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // limit each IP to 100 requests per windowMs
    loginMaxAttempts: 5, // max login attempts
  },

  // CORS configuration
  cors: {
    development: {
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    },
    production: {
      origin: process.env.CORS_ORIGIN?.split(",") || ["https://yourdomain.com"],
      credentials: true,
    },
  },

  // Email configuration
  email: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@reachripple.com",
  },

  // Token expiry for email verification and password reset
  tokens: {
    emailVerificationExpiry: 24 * 60 * 60 * 1000, // 24 hours
    passwordResetExpiry: 1 * 60 * 60 * 1000, // 1 hour
  },
};

// Validate password strength
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { minLength, requireUppercase, requireLowercase, requireNumbers } = securityConfig.password;

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`);
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return { valid: errors.length === 0, errors };
};

export default securityConfig;
