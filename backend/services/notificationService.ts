/**
 * Notification Service
 *
 * Creates in-app notifications AND pushes them via Socket.IO
 * so the frontend receives real-time updates without polling.
 */

import Notification, { NotificationDocument } from "../models/Notification";
import { getIO } from "../config/socket";
import logger from "../utils/logger";

// ── Notification types ─────────────────────────────────────────
export type NotificationType =
  | "ad_approved"
  | "ad_rejected"
  | "verification_approved"
  | "verification_rejected"
  | "boost_activated"
  | "boost_expired"
  | "credit_added"
  | "report_resolved"
  | "system";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
  meta?: Record<string, any>;
}

// ── Create & emit ──────────────────────────────────────────────
/**
 * Create a persistent notification and push it via Socket.IO.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationDocument> {
  const { userId, type, message, meta } = input;

  // 1. Save to database
  const notification = await Notification.create({
    user: userId,
    type,
    message,
    meta,
  });

  // 2. Emit via Socket.IO (if connected)
  const io = getIO();
  if (io) {
    io.to(userId).emit("notification:new", {
      _id: notification._id,
      type: notification.type,
      message: notification.message,
      meta: notification.meta,
      read: false,
      createdAt: notification.createdAt,
    });

    // Also emit an unread count update
    const unread = await Notification.countDocuments({
      user: userId,
      read: false,
    });
    io.to(userId).emit("notification:unread-count", { count: unread });
  }

  logger.info(`Notification sent to ${userId}: [${type}] ${message}`);
  return notification;
}

// ── Batch helper ───────────────────────────────────────────────
/**
 * Send the same notification to multiple users.
 */
export async function notifyMany(
  userIds: string[],
  type: NotificationType,
  message: string,
  meta?: Record<string, any>
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) =>
      createNotification({ userId, type, message, meta })
    )
  );
}

// ── Convenience helpers ────────────────────────────────────────
export const notifyAdApproved = (userId: string, adTitle: string, adId: string) =>
  createNotification({
    userId,
    type: "ad_approved",
    message: `Your ad "${adTitle}" has been approved and is now live!`,
    meta: { adId },
  });

export const notifyAdRejected = (userId: string, adTitle: string, adId: string, reason?: string) =>
  createNotification({
    userId,
    type: "ad_rejected",
    message: `Your ad "${adTitle}" was not approved.${reason ? ` Reason: ${reason}` : ""}`,
    meta: { adId, reason },
  });

export const notifyVerificationApproved = (userId: string) =>
  createNotification({
    userId,
    type: "verification_approved",
    message: "Your ID verification has been approved! Your profile now shows a verified badge.",
  });

export const notifyVerificationRejected = (userId: string, reason?: string) =>
  createNotification({
    userId,
    type: "verification_rejected",
    message: `Your ID verification was not approved.${reason ? ` Reason: ${reason}` : " Please resubmit with a clearer document."}`,
    meta: { reason },
  });

export const notifyBoostActivated = (userId: string, tier: string, adTitle: string) =>
  createNotification({
    userId,
    type: "boost_activated",
    message: `Your "${adTitle}" has been boosted to ${tier}!`,
    meta: { tier },
  });

export const notifyBoostExpired = (userId: string, adTitle: string, adId: string) =>
  createNotification({
    userId,
    type: "boost_expired",
    message: `The boost on "${adTitle}" has expired. Re-boost to stay at the top!`,
    meta: { adId },
  });
