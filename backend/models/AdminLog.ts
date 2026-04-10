import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * AdminLog Model
 * Tracks ALL admin actions for accountability and audit trail.
 * Every admin edit, delete, suspend, approve, reject creates a log entry.
 */

export type AdminAction =
  | "AD_APPROVE"
  | "AD_REJECT"
  | "AD_DELETE"
  | "AD_EDIT"
  | "AD_BOOST"
  | "AD_TIER_CHANGE"
  | "AD_STATUS_CHANGE"
  | "USER_SUSPEND"
  | "USER_BAN"
  | "USER_ACTIVATE"
  | "USER_DELETE"
  | "USER_VERIFY"
  | "USER_EDIT"
  | "USER_RESET_PASSWORD"
  | "REPORT_RESOLVE"
  | "REPORT_DISMISS"
  | "SETTING_UPDATE"
  | "BULK_ACTION"
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "MODERATION_APPROVE"
  | "MODERATION_REJECT"
  | "MODERATION_SUSPEND"
  | "MODERATION_INVESTIGATE"
  | "MODERATION_UNFLAG"
  | "MANUAL_PATTERN_SCAN";

export interface AdminLogDocument extends Document {
  adminId: Types.ObjectId;
  adminEmail: string;
  action: AdminAction;
  targetType: "ad" | "user" | "report" | "setting" | "system";
  targetId?: Types.ObjectId;
  description: string;
  previousValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AdminLogModel extends Model<AdminLogDocument> {
  logAction(data: {
    adminId: Types.ObjectId | string;
    adminEmail: string;
    action: AdminAction;
    targetType: "ad" | "user" | "report" | "setting" | "system";
    targetId?: Types.ObjectId | string;
    description: string;
    previousValue?: any;
    newValue?: any;
    ip?: string;
    userAgent?: string;
  }): Promise<AdminLogDocument>;
}

const AdminLogSchema = new Schema<AdminLogDocument>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminEmail: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "AD_APPROVE",
        "AD_REJECT",
        "AD_DELETE",
        "AD_EDIT",
        "AD_BOOST",
        "AD_TIER_CHANGE",
        "AD_STATUS_CHANGE",
        "USER_SUSPEND",
        "USER_BAN",
        "USER_ACTIVATE",
        "USER_DELETE",
        "USER_VERIFY",
        "USER_EDIT",
        "USER_RESET_PASSWORD",
        "REPORT_RESOLVE",
        "REPORT_DISMISS",
        "SETTING_UPDATE",
        "BULK_ACTION",
        "ADMIN_LOGIN",
        "ADMIN_LOGOUT",
        "MODERATION_APPROVE",
        "MODERATION_REJECT",
        "MODERATION_SUSPEND",
        "MODERATION_INVESTIGATE",
        "MODERATION_UNFLAG",
        "MANUAL_PATTERN_SCAN",
      ],
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["ad", "user", "report", "setting", "system"],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    previousValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient queries
AdminLogSchema.index({ createdAt: -1 });
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AdminLogSchema.index({ action: 1, createdAt: -1 });

/**
 * Static method to create an admin log entry
 */
AdminLogSchema.statics.logAction = async function (data: {
  adminId: Types.ObjectId | string;
  adminEmail: string;
  action: AdminAction;
  targetType: "ad" | "user" | "report" | "setting" | "system";
  targetId?: Types.ObjectId | string;
  description: string;
  previousValue?: any;
  newValue?: any;
  ip?: string;
  userAgent?: string;
}): Promise<AdminLogDocument> {
  return this.create(data);
};

export const AdminLog: AdminLogModel =
  (mongoose.models.AdminLog as AdminLogModel) ||
  mongoose.model<AdminLogDocument, AdminLogModel>("AdminLog", AdminLogSchema);

export default AdminLog;
