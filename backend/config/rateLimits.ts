/**
 * Rate Limiting Configuration
 * 
 * VivaStreet-style rate limits to prevent abuse:
 * - Location API: Strict (autocomplete abuse prevention)
 * - Ads API: Moderate
 * - Search API: Moderate
 * - Auth API: Strict (credential stuffing prevention)
 */

import rateLimit from "express-rate-limit";
import { logWarn } from "../utils/logger";

// ============================================
// RATE LIMIT CONFIGURATIONS
// ============================================

/**
 * Location API Rate Limiter (STRICT)
 * Prevents autocomplete abuse which is expensive
 * 
 * Production: 60 requests per minute per IP
 * Development: 200 requests per minute
 */
export const locationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 60 : 200,
  message: { 
    error: "Too many location requests. Please slow down.",
    retryAfter: 60 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For for proxied requests, fallback to IP
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])
      : req.ip || req.socket.remoteAddress || "unknown";
    return `loc:${ip}`;
  },
  handler: (req, res) => {
    logWarn("Location rate limit exceeded", { 
      ip: req.ip, 
      path: req.path,
      userAgent: req.get("user-agent")?.substring(0, 100) 
    });
    res.status(429).json({ 
      error: "Too many location requests. Please slow down.",
      retryAfter: 60 
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
});

/**
 * Ads API Rate Limiter (MODERATE)
 * Allows reasonable browsing but prevents scraping
 * 
 * Production: 100 requests per minute per IP
 * Development: 500 requests per minute
 */
export const adsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 100 : 500,
  message: { 
    error: "Too many requests. Please try again shortly.",
    retryAfter: 60 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])
      : req.ip || req.socket.remoteAddress || "unknown";
    return `ads:${ip}`;
  },
  handler: (req, res) => {
    logWarn("Ads rate limit exceeded", { 
      ip: req.ip, 
      path: req.path 
    });
    res.status(429).json({ 
      error: "Too many requests. Please try again shortly.",
      retryAfter: 60 
    });
  },
});

/**
 * Search API Rate Limiter (MODERATE)
 * Prevents automated scraping
 * 
 * Production: 80 requests per minute per IP
 * Development: 400 requests per minute
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 80 : 400,
  message: { 
    error: "Too many search requests. Please slow down.",
    retryAfter: 60 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])
      : req.ip || req.socket.remoteAddress || "unknown";
    return `search:${ip}`;
  },
  handler: (req, res) => {
    logWarn("Search rate limit exceeded", { 
      ip: req.ip, 
      path: req.path 
    });
    res.status(429).json({ 
      error: "Too many search requests. Please slow down.",
      retryAfter: 60 
    });
  },
});

/**
 * Auth API Rate Limiter (STRICT)
 * Prevents credential stuffing and brute force
 * 
 * Production: 10 requests per 15 minutes per IP
 * Development: 50 requests per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 10 : 50,
  message: { 
    error: "Too many authentication attempts. Please wait before trying again.",
    retryAfter: 900 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])
      : req.ip || req.socket.remoteAddress || "unknown";
    return `auth:${ip}`;
  },
  handler: (req, res) => {
    logWarn("Auth rate limit exceeded", { 
      ip: req.ip, 
      email: req.body?.email?.substring(0, 50) 
    });
    res.status(429).json({ 
      error: "Too many authentication attempts. Please wait before trying again.",
      retryAfter: 900 
    });
  },
  skip: (req) => req.method === "GET",
});

/**
 * Ad Creation Rate Limiter (STRICT)
 * Prevents spam posting
 * 
 * Production: 5 ads per day per IP/user
 * Development: 20 ads per day
 */
export const adCreationRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: process.env.NODE_ENV === "production" ? 5 : 20,
  message: { 
    error: "You've reached the daily limit for creating ads. Try again tomorrow.",
    retryAfter: 86400 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).userId;
    if (userId) return `adcreate:user:${userId}`;
    
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])
      : req.ip || req.socket.remoteAddress || "unknown";
    return `adcreate:ip:${ip}`;
  },
  handler: (req, res) => {
    logWarn("Ad creation rate limit exceeded", { 
      ip: req.ip, 
      userId: (req as any).userId 
    });
    res.status(429).json({ 
      error: "You've reached the daily limit for creating ads. Try again tomorrow.",
      retryAfter: 86400 
    });
  },
});

export default {
  locationRateLimiter,
  adsRateLimiter,
  searchRateLimiter,
  authRateLimiter,
  adCreationRateLimiter,
};
