import express from "express";
import logger from "../utils/logger";
import ContactSubmission from "../models/ContactSubmission";
import { getRedis } from "../services/cacheService";
import { sendContactNotificationEmail } from "../services/emailService";

const router = express.Router();

/**
 * POST /api/contact
 * Handle contact form submissions
 * Stores message in DB, optionally sends email notification
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({
        message: "Name, email, and message are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Rate limit: max 3 contact submissions per email per hour
    const rateLimitKey = `contact_rate:${email.toLowerCase()}`;
    const redis = getRedis();

    if (redis) {
      // Redis-based rate limiting (survives restarts, works across instances)
      const current = await redis.incr(rateLimitKey);
      if (current === 1) {
        await redis.expire(rateLimitKey, 3600); // 1 hour TTL
      }
      if (current > 3) {
        return res.status(429).json({
          message: "Too many submissions. Please try again later.",
        });
      }
    } else {
      // Fallback: in-memory rate limiting (dev only)
      const key = email.toLowerCase();
      if (!contactRateLimit[key]) {
        contactRateLimit[key] = { count: 0, resetAt: Date.now() + 3600000 };
      }
      if (Date.now() > contactRateLimit[key].resetAt) {
        contactRateLimit[key] = { count: 0, resetAt: Date.now() + 3600000 };
      }
      contactRateLimit[key].count++;
      if (contactRateLimit[key].count > 3) {
        return res.status(429).json({
          message: "Too many submissions. Please try again later.",
        });
      }
    }

    // Store in database
    const submission = await ContactSubmission.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || "General Inquiry",
      message: message.trim(),
      ipAddress: req.ip,
    });

    logger.info(`Contact form submission stored`, {
      id: submission._id,
      from: `${name} <${email}>`,
      subject: subject || "General Inquiry",
      messageLength: message.length,
    });

    // Send email notification to admin (non-blocking)
    sendContactNotificationEmail(name.trim(), email.trim(), subject?.trim() || "General Inquiry", message.trim())
      .catch((err) => logger.error("Failed to send contact notification email", err));

    return res.json({
      success: true,
      message: "Your message has been received. We'll get back to you within 24-48 hours.",
    });
  } catch (err) {
    logger.error("Contact form error:", err);
    return res.status(500).json({ message: "Failed to submit contact form" });
  }
});

// Fallback in-memory rate limit store (used when Redis unavailable)
const contactRateLimit: Record<string, { count: number; resetAt: number }> = {};

export default router;
