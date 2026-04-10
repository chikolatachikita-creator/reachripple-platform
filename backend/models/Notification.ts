import mongoose, { Schema, Document } from "mongoose";

export interface NotificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  type: string;
  message: string;
  read: boolean;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast user-based queries
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, read: 1 });

const Notification = mongoose.model<NotificationDocument>("Notification", NotificationSchema);

export default Notification;
