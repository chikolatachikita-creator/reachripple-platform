/**
 * Email service for sending verification and password reset emails
 */

import nodemailer from "nodemailer";
import { securityConfig } from "../config/security";
import logger from "../utils/logger";

// Create transporter
const createTransporter = () => {
  const { host, port, secure, user, pass } = securityConfig.email;

  // For development, use ethereal email or console logging
  if (!user || !pass) {
    logger.warn("Email credentials not configured. Emails will be logged to console.");
    return null;
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true,           // reuse connections
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });

  // Verify SMTP connection asynchronously (non-blocking)
  transport.verify()
    .then(() => logger.info("✉️  SMTP connection verified"))
    .catch((err) => logger.warn("⚠️  SMTP connection failed — emails may not send:", err.message));

  return transport;
};

const transporter = createTransporter();

// Base URL for email links
const getBaseUrl = () => {
  return process.env.FRONTEND_URL || "http://localhost:3000";
};

/**
 * Send email helper function
 */
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const mailOptions = {
    from: securityConfig.email.from,
    to,
    subject,
    html,
  };

  if (!transporter) {
    // Log email preparation to console for development (no sensitive content)
    logger.info("📧 ============ EMAIL (DEV MODE) ============");
    logger.info(`To: ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Body length: ${html.length} characters`);
    logger.info("[Full body omitted - see logs if needed]");
    logger.info("============================================");
    return true;
  }

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error: any) {
    // Retry once on transient failures
    if (error.responseCode >= 400 && error.responseCode < 500) {
      logger.error(`Email send permanently failed (${error.responseCode}):`, error.message);
      return false;
    }
    try {
      logger.warn(`Email send failed, retrying once: ${error.message}`);
      await new Promise((r) => setTimeout(r, 2000));
      await transporter.sendMail(mailOptions);
      logger.info(`Email sent (retry) to ${to}: ${subject}`);
      return true;
    } catch (retryError) {
      logger.error("Email send failed after retry:", retryError);
      return false;
    }
  }
};

/**
 * Send email verification email
 */
export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to ReachRipple!</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>Thank you for signing up. Please verify your email address to activate your account.</p>
          <p style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${verifyUrl}</p>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ReachRipple. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Verify Your Email - ReachRipple", html);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444, #f97316); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
          <h2>Hi ${name}!</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong> This link expires in 1 hour for security reasons.
          </div>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ReachRipple. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Reset Your Password - ReachRipple", html);
};

/**
 * Send welcome email after verification
 */
export const sendWelcomeEmail = async (email: string, name: string): Promise<boolean> => {
  const loginUrl = `${getBaseUrl()}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Email Verified!</h1>
        </div>
        <div class="content">
          <h2>Welcome, ${name}!</h2>
          <p>Your email has been verified successfully. Your account is now fully activated!</p>
          <p>You can now:</p>
          <ul>
            <li>Create and manage your ads</li>
            <li>Save your favorite profiles</li>
            <li>Write reviews</li>
            <li>And much more!</li>
          </ul>
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Get Started</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ReachRipple. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Welcome to ReachRipple! 🎉", html);
};

/**
 * Send contact form notification to admin
 */
export const sendContactNotificationEmail = async (
  senderName: string,
  senderEmail: string,
  subject: string,
  message: string
): Promise<boolean> => {
  const adminEmail = securityConfig.email.from || "admin@reachripple.com";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 20px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .field { margin-bottom: 15px; }
        .field-label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .field-value { margin-top: 4px; }
        .message-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; white-space: pre-wrap; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📬 New Contact Form Submission</h1>
        </div>
        <div class="content">
          <div class="field">
            <div class="field-label">From</div>
            <div class="field-value">${senderName} &lt;${senderEmail}&gt;</div>
          </div>
          <div class="field">
            <div class="field-label">Subject</div>
            <div class="field-value">${subject}</div>
          </div>
          <div class="field">
            <div class="field-label">Message</div>
            <div class="message-box">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
        </div>
        <div class="footer">
          <p>Reply directly to ${senderEmail} to respond.</p>
          <p>&copy; ${new Date().getFullYear()} ReachRipple Admin</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(adminEmail, `[Contact] ${subject} — from ${senderName}`, html);
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendContactNotificationEmail,
};
