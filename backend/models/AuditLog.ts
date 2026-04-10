import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/**
 * AuditLog Model
 * Tracks all boost/bump operations for abuse detection and compliance
 */

export type AuditAction = 
  // Boost/Bump actions
  | 'TUMBLE_UP'           // Manual bump
  | 'TAP_UP_ACTIVATE'     // Auto-bump subscription started
  | 'TAP_UP_DEACTIVATE'   // Auto-bump cancelled
  | 'TAP_UP_BUMP'         // Scheduled auto-bump executed
  | 'TIER_UPGRADE'        // Purchased tier upgrade
  | 'TIER_DOWNGRADE'      // Tier expired/cancelled
  | 'ADDON_PURCHASE'      // Add-on purchased
  | 'ADDON_EXPIRED'       // Add-on expired
  // Moderation actions
  | 'AD_CREATED'          // Ad posted
  | 'AD_EDITED'           // Ad content edited
  | 'AD_FLAGGED'          // Ad flagged for review
  | 'AD_UNFLAGGED'        // Flag removed
  | 'AD_AUTO_APPROVED'    // Passed automated checks
  | 'AD_APPROVED'         // Admin approved
  | 'AD_REJECTED'         // Admin rejected
  | 'AD_SUSPENDED'        // Ad suspended (moderation)
  | 'AD_UNDER_INVESTIGATION' // Escalated to investigation
  // Risk & safety actions
  | 'RISK_SCORE_CHANGED'  // User risk score recalculated
  | 'RED_FLAG_DETECTED'   // Red flag pattern matched
  | 'PATTERN_DETECTED'    // Anti-trafficking pattern detected
  | 'PHONE_REUSE_DETECTED' // Same phone across accounts
  | 'IMAGE_REUSE_DETECTED' // Same images across accounts
  | 'CITY_HOP_DETECTED'   // Rapid city changes detected
  // Account actions
  | 'ACCOUNT_SUSPENDED'   // Account suspended
  | 'ACCOUNT_VERIFIED'    // ID verification approved
  | 'ACCOUNT_VERIFICATION_REJECTED' // ID verification rejected
  | 'REPORT_SUBMITTED'    // New report filed
  | 'REPORT_REVIEWED'     // Report reviewed by admin
  // Abuse detection
  | 'RATE_LIMITED'        // User hit rate limit
  | 'ABUSE_DETECTED'      // Suspicious activity detected
  | 'CONFIG_CHANGED'      // Admin config updated
  | 'MANUAL_OVERRIDE';    // Admin manual action

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogDocument extends Document {
  // Action details
  action: AuditAction;
  severity: AuditSeverity;
  
  // Actor
  userId?: Types.ObjectId;
  adminId?: Types.ObjectId;
  isSystem: boolean;
  
  // Target
  adId?: Types.ObjectId;
  targetUserId?: Types.ObjectId;
  
  // Context
  ip?: string;
  userAgent?: string;
  location?: string;
  
  // Details
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  reason?: string;
  
  // Timestamps
  createdAt: Date;
}

// Interface for static methods
export interface AuditLogModel extends Model<AuditLogDocument> {
  log(action: AuditAction, data: Partial<AuditLogDocument>): Promise<AuditLogDocument>;
  countUserActionsInWindow(userId: Types.ObjectId, action: AuditAction, windowMs: number): Promise<number>;
  getRecentAbuse(hours?: number): Promise<AuditLogDocument[]>;
  getUserBumpStats(userId: Types.ObjectId, days?: number): Promise<any[]>;
  detectIpAbuse(ip: string, hours?: number): Promise<{ suspicious: boolean; reason?: string; users?: any[] }>;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    // Action details
    action: {
      type: String,
      required: true,
      enum: [
        'TUMBLE_UP',
        'TAP_UP_ACTIVATE',
        'TAP_UP_DEACTIVATE',
        'TAP_UP_BUMP',
        'TIER_UPGRADE',
        'TIER_DOWNGRADE',
        'ADDON_PURCHASE',
        'ADDON_EXPIRED',
        'AD_CREATED',
        'AD_EDITED',
        'AD_FLAGGED',
        'AD_UNFLAGGED',
        'AD_AUTO_APPROVED',
        'AD_APPROVED',
        'AD_REJECTED',
        'AD_SUSPENDED',
        'AD_UNDER_INVESTIGATION',
        'RISK_SCORE_CHANGED',
        'RED_FLAG_DETECTED',
        'PATTERN_DETECTED',
        'PHONE_REUSE_DETECTED',
        'IMAGE_REUSE_DETECTED',
        'CITY_HOP_DETECTED',
        'ACCOUNT_SUSPENDED',
        'ACCOUNT_VERIFIED',
        'ACCOUNT_VERIFICATION_REJECTED',
        'REPORT_SUBMITTED',
        'REPORT_REVIEWED',
        'RATE_LIMITED',
        'ABUSE_DETECTED',
        'CONFIG_CHANGED',
        'MANUAL_OVERRIDE',
      ],
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    
    // Actor
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    
    // Target
    adId: {
      type: Schema.Types.ObjectId,
      ref: 'Ad',
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Context
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    location: {
      type: String,
      trim: true,
      lowercase: true,
    },
    
    // Details
    previousValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Time-based queries (for analytics)
AuditLogSchema.index({ createdAt: -1 });

// Find abuse patterns for a user
AuditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

// Find ad activity
AuditLogSchema.index({ adId: 1, createdAt: -1 });

// Find by severity
AuditLogSchema.index({ severity: 1, createdAt: -1 });

// TTL index: auto-delete after 90 days (optional, remove if you need longer retention)
// AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Log an action
 */
AuditLogSchema.statics.log = async function(
  action: AuditAction,
  data: Partial<AuditLogDocument>
) {
  return this.create({
    action,
    severity: data.severity || 'info',
    ...data,
  });
};

/**
 * Count user actions in time window (for rate limiting)
 */
AuditLogSchema.statics.countUserActionsInWindow = async function(
  userId: Types.ObjectId,
  action: AuditAction,
  windowMs: number
) {
  const since = new Date(Date.now() - windowMs);
  
  return this.countDocuments({
    userId,
    action,
    createdAt: { $gte: since },
  });
};

/**
 * Get recent abuse events
 */
AuditLogSchema.statics.getRecentAbuse = async function(hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    severity: { $in: ['warning', 'critical'] },
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .populate('userId adId')
    .limit(100);
};

/**
 * Get bump stats for a user
 */
AuditLogSchema.statics.getUserBumpStats = async function(userId: Types.ObjectId, days: number = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        action: { $in: ['TUMBLE_UP', 'TAP_UP_BUMP'] },
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          action: '$action',
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.action',
        totalBumps: { $sum: '$count' },
        dailyAverage: { $avg: '$count' },
        days: { $push: { date: '$_id.day', count: '$count' } },
      },
    },
  ]);
};

/**
 * Detect potential abuse (many bumps from same IP)
 */
AuditLogSchema.statics.detectIpAbuse = async function(ip: string, hours: number = 1) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const result = await this.aggregate([
    {
      $match: {
        ip,
        action: 'TUMBLE_UP',
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: '$userId',
        bumpCount: { $sum: 1 },
        ads: { $addToSet: '$adId' },
      },
    },
  ]);
  
  // Suspicious: same IP bumping multiple users' ads
  const uniqueUsers = result.length;
  if (uniqueUsers > 3) {
    return {
      suspicious: true,
      reason: `IP ${ip} used by ${uniqueUsers} different users in ${hours}h`,
      users: result.map(r => r._id),
    };
  }
  
  return { suspicious: false };
};

export const AuditLog: AuditLogModel = (mongoose.models.AuditLog as AuditLogModel) || 
  mongoose.model<AuditLogDocument, AuditLogModel>('AuditLog', AuditLogSchema);

export default AuditLog;
