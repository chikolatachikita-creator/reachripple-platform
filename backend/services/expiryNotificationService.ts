import Ad from '../models/Ad';
import { AuditLog } from '../models/AuditLog';
import BoostPurchase from '../models/BoostPurchase';
import Notification from '../models/Notification';
import { EXPIRY_NOTIFICATIONS } from '../constants/boostConfig';
import { logInfo, logWarn, logError } from '../utils/logger';

/**
 * Expiry Notification Service
 * 
 * Handles:
 * - 48h expiry warnings
 * - 12h expiry warnings  
 * - Expired tier notifications
 * - Renewal deep links
 */

// ============================================
// NOTIFICATION TRIGGERS
// ============================================

export interface ExpiryNotification {
  userId: string;
  adId: string;
  type: 'expiring_48h' | 'expiring_12h' | 'expired';
  tierName: string;
  expiresAt: Date;
  renewUrl: string;
}

/**
 * Check for expiring tiers and create notifications
 * Should be called by scheduled job every hour
 */
export async function checkExpiringTiers(): Promise<ExpiryNotification[]> {
  const now = new Date();
  const notifications: ExpiryNotification[] = [];
  
  // Check for 48h expiry
  const expires48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const expires47h = new Date(now.getTime() + 47 * 60 * 60 * 1000);
  
  const expiring48hAds = await Ad.find({
    status: 'approved',
    isDeleted: { $ne: true },
    tier: { $in: ['FEATURED', 'PRIORITY_PLUS', 'PRIORITY'] },
    tierUntil: { $gte: expires47h, $lte: expires48h },
  }).populate('userId', 'email name');
  
  for (const ad of expiring48hAds) {
    const existingNotification = await Notification.findOne({
      userId: ad.userId,
      relatedId: ad._id,
      type: 'tier_expiring_48h',
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }, // Within last 24h
    });
    
    if (!existingNotification) {
      await createExpiryNotification(ad, 'expiring_48h');
      notifications.push({
        userId: ad.userId?.toString() || '',
        adId: ad._id.toString(),
        type: 'expiring_48h',
        tierName: ad.tier,
        expiresAt: ad.tierUntil as Date,
        renewUrl: `/boost/renew/${ad._id}`,
      });
    }
  }
  
  // Check for 12h expiry
  const expires12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const expires11h = new Date(now.getTime() + 11 * 60 * 60 * 1000);
  
  const expiring12hAds = await Ad.find({
    status: 'approved',
    isDeleted: { $ne: true },
    tier: { $in: ['FEATURED', 'PRIORITY_PLUS', 'PRIORITY'] },
    tierUntil: { $gte: expires11h, $lte: expires12h },
  }).populate('userId', 'email name');
  
  for (const ad of expiring12hAds) {
    const existingNotification = await Notification.findOne({
      userId: ad.userId,
      relatedId: ad._id,
      type: 'tier_expiring_12h',
      createdAt: { $gte: new Date(now.getTime() - 6 * 60 * 60 * 1000) }, // Within last 6h
    });
    
    if (!existingNotification) {
      await createExpiryNotification(ad, 'expiring_12h');
      notifications.push({
        userId: ad.userId?.toString() || '',
        adId: ad._id.toString(),
        type: 'expiring_12h',
        tierName: ad.tier,
        expiresAt: ad.tierUntil as Date,
        renewUrl: `/boost/renew/${ad._id}`,
      });
    }
  }
  
  // Check for just expired (demote and notify)
  const justExpiredAds = await Ad.find({
    status: 'approved',
    isDeleted: { $ne: true },
    tier: { $in: ['FEATURED', 'PRIORITY_PLUS', 'PRIORITY'] },
    tierUntil: { $lt: now },
  }).populate('userId', 'email name');
  
  for (const ad of justExpiredAds) {
    const previousTier = ad.tier;
    
    // Demote to STANDARD
    await Ad.updateOne(
      { _id: ad._id },
      { 
        $set: { tier: 'STANDARD' },
        $unset: { tierUntil: 1 },
      }
    );
    
    // Log the demotion
    await AuditLog.log('TIER_DOWNGRADE', {
      adId: ad._id,
      userId: ad.userId,
      previousValue: { tier: previousTier },
      newValue: { tier: 'STANDARD' },
      reason: 'Tier expired',
      severity: 'info',
    });
    
    // Create notification
    await createExpiryNotification(ad, 'expired', previousTier);
    
    notifications.push({
      userId: ad.userId?.toString() || '',
      adId: ad._id.toString(),
      type: 'expired',
      tierName: previousTier,
      expiresAt: ad.tierUntil as Date,
      renewUrl: `/boost/renew/${ad._id}`,
    });
  }
  
  logInfo('Expiry check complete', {
    total: notifications.length,
    expiring48h: notifications.filter(n => n.type === 'expiring_48h').length,
    expiring12h: notifications.filter(n => n.type === 'expiring_12h').length,
    expired: notifications.filter(n => n.type === 'expired').length,
  });
  
  return notifications;
}

/**
 * Create in-app notification for expiry
 */
async function createExpiryNotification(
  ad: any,
  type: 'expiring_48h' | 'expiring_12h' | 'expired',
  previousTier?: string
): Promise<void> {
  const tierName = previousTier || ad.tier;
  const tierDisplayName = tierName === 'FEATURED' ? 'Featured' : 
                          tierName === 'PRIORITY_PLUS' ? 'Priority Plus' : 'Priority';
  
  let message: string;
  let notificationType: string;
  
  switch (type) {
    case 'expiring_48h':
      message = `Your ${tierDisplayName} boost for "${ad.title}" expires in 48 hours. Renew now to keep your premium position.`;
      notificationType = 'tier_expiring_48h';
      break;
    case 'expiring_12h':
      message = `⚠️ Your ${tierDisplayName} boost for "${ad.title}" expires in less than 12 hours! Renew immediately to avoid losing visibility.`;
      notificationType = 'tier_expiring_12h';
      break;
    case 'expired':
      message = `Your ${tierDisplayName} boost for "${ad.title}" has expired. Your listing is now in the standard feed. Renew to regain premium visibility.`;
      notificationType = 'tier_expired';
      break;
  }
  
  await Notification.create({
    userId: ad.userId,
    type: notificationType,
    message,
    read: false,
    relatedId: ad._id,
    actionUrl: `/boost/renew/${ad._id}`,
  });
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getExpiryEmailTemplate(
  userName: string,
  adTitle: string,
  tierDisplayName: string,
  type: 'expiring_48h' | 'expiring_12h' | 'expired',
  renewUrl: string
): EmailTemplate {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const fullRenewUrl = `${baseUrl}${renewUrl}`;
  
  switch (type) {
    case 'expiring_48h':
      return {
        subject: `Your ${tierDisplayName} boost expires in 48 hours`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; }
    .cta { display: inline-block; background: #ec4899; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .footer { background: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Your boost expires soon!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your <strong>${tierDisplayName}</strong> boost for "<strong>${adTitle}</strong>" will expire in <strong>48 hours</strong>.</p>
      <p>Don't lose your premium visibility! Renew now to stay at the top.</p>
      <a href="${fullRenewUrl}" class="cta">Renew Boost Now</a>
      <p style="margin-top: 20px;">Or copy this link: ${fullRenewUrl}</p>
    </div>
    <div class="footer">
      <p>You're receiving this because you have an active boost. <a href="${baseUrl}/settings/notifications">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`,
        text: `Hi ${userName},

Your ${tierDisplayName} boost for "${adTitle}" will expire in 48 hours.

Don't lose your premium visibility! Renew now to stay at the top.

Renew here: ${fullRenewUrl}

---
You're receiving this because you have an active boost.`,
      };
      
    case 'expiring_12h':
      return {
        subject: `⚠️ URGENT: Your ${tierDisplayName} boost expires in 12 hours!`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #fef2f2; padding: 20px; border: 2px solid #dc2626; }
    .cta { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: bold; }
    .footer { background: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 URGENT: Boost expires in 12 hours!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your <strong>${tierDisplayName}</strong> boost for "<strong>${adTitle}</strong>" expires in <strong>less than 12 hours</strong>!</p>
      <p><strong>After expiry, your listing will drop to the standard feed and lose its premium position.</strong></p>
      <a href="${fullRenewUrl}" class="cta">🚀 RENEW NOW</a>
      <p style="margin-top: 20px;">One-click renewal: ${fullRenewUrl}</p>
    </div>
    <div class="footer">
      <p>This is an urgent notification about your expiring boost.</p>
    </div>
  </div>
</body>
</html>`,
        text: `⚠️ URGENT: Hi ${userName},

Your ${tierDisplayName} boost for "${adTitle}" expires in LESS THAN 12 HOURS!

After expiry, your listing will drop to the standard feed and lose its premium position.

RENEW NOW: ${fullRenewUrl}

---
This is an urgent notification about your expiring boost.`,
      };
      
    case 'expired':
      return {
        subject: `Your ${tierDisplayName} boost has expired - Renew to get back on top`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6b7280; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .stats { background: #fff; padding: 15px; border-radius: 8px; margin: 16px 0; }
    .footer { background: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your boost has expired</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your <strong>${tierDisplayName}</strong> boost for "<strong>${adTitle}</strong>" has expired. Your listing is now showing in the standard feed.</p>
      <div class="stats">
        <p><strong>What you're missing:</strong></p>
        <ul>
          <li>Premium visibility at the top of search results</li>
          <li>Up to 5x more views than standard listings</li>
          <li>Tumble Up feature to bump your ad</li>
        </ul>
      </div>
      <p>Get back on top with a new boost:</p>
      <a href="${fullRenewUrl}" class="cta">Renew ${tierDisplayName} Boost</a>
    </div>
    <div class="footer">
      <p>You're receiving this because your boost expired. <a href="${baseUrl}/settings/notifications">Manage notifications</a></p>
    </div>
  </div>
</body>
</html>`,
        text: `Hi ${userName},

Your ${tierDisplayName} boost for "${adTitle}" has expired. Your listing is now showing in the standard feed.

What you're missing:
- Premium visibility at the top of search results
- Up to 5x more views than standard listings
- Tumble Up feature to bump your ad

Get back on top: ${fullRenewUrl}

---
You're receiving this because your boost expired.`,
      };
  }
}

export default {
  checkExpiringTiers,
  getExpiryEmailTemplate,
};
