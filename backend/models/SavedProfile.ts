import mongoose, { Schema, Document, Model } from "mongoose";

export interface SavedProfileDocument extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  adId: mongoose.Schema.Types.ObjectId;
  savedAt: Date;
}

const SavedProfileSchema = new Schema<SavedProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adId: {
      type: Schema.Types.ObjectId,
      ref: "Ad",
      required: true,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure one user can only save one profile once
SavedProfileSchema.index({ userId: 1, adId: 1 }, { unique: true });

export const SavedProfile: Model<SavedProfileDocument> =
  mongoose.models.SavedProfile || mongoose.model<SavedProfileDocument>("SavedProfile", SavedProfileSchema);

export default SavedProfile;
