/**
 * AdvertiserSignal Model
 *
 * Aggregates all identifiable signals for each advertiser.
 * Signals enable cross-account linking: phone, WhatsApp, IP, device,
 * image hashes, payment methods, cities.
 *
 * Updated every time an ad is posted, edited, or the user logs in.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export interface AdvertiserSignalDocument extends Document {
  userId: mongoose.Types.ObjectId;

  // Contact signals
  phoneNumbers: string[];
  whatsappNumbers: string[];
  emailAddresses: string[];

  // Device / network signals
  ipAddresses: string[];         // /24 subnets stored for privacy
  deviceFingerprints: string[];  // hash(UA + screen + tz + …)

  // Content signals
  imageHashes: string[];         // perceptual hashes of uploaded images

  // Financial signals
  paymentMethods: string[];      // hashed card last-4 / PayPal IDs

  // Geographic signals
  citiesPosted: string[];        // normalised city names

  // Scam scoring
  scamScore: number;             // 0-100 — independent of riskScore

  // Metadata
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvertiserSignalModel extends Model<AdvertiserSignalDocument> {
  getOrCreate(userId: string | mongoose.Types.ObjectId): Promise<AdvertiserSignalDocument>;
}

const AdvertiserSignalSchema = new Schema<AdvertiserSignalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    phoneNumbers: { type: [String], default: [] },
    whatsappNumbers: { type: [String], default: [] },
    emailAddresses: { type: [String], default: [] },

    ipAddresses: { type: [String], default: [] },
    deviceFingerprints: { type: [String], default: [] },

    imageHashes: { type: [String], default: [] },

    paymentMethods: { type: [String], default: [] },

    citiesPosted: { type: [String], default: [] },

    scamScore: { type: Number, default: 0, min: 0, max: 100 },

    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index arrays for fast cross-account lookups
AdvertiserSignalSchema.index({ phoneNumbers: 1 });
AdvertiserSignalSchema.index({ whatsappNumbers: 1 });
AdvertiserSignalSchema.index({ ipAddresses: 1 });
AdvertiserSignalSchema.index({ deviceFingerprints: 1 });
AdvertiserSignalSchema.index({ imageHashes: 1 });
AdvertiserSignalSchema.index({ paymentMethods: 1 });
AdvertiserSignalSchema.index({ scamScore: -1 });

// Static: upsert-get helper
AdvertiserSignalSchema.statics.getOrCreate = async function (
  userId: string | mongoose.Types.ObjectId
): Promise<AdvertiserSignalDocument> {
  let doc = await this.findOne({ userId });
  if (!doc) {
    doc = await this.create({ userId });
  }
  return doc;
};

export const AdvertiserSignal = mongoose.model<
  AdvertiserSignalDocument,
  AdvertiserSignalModel
>("AdvertiserSignal", AdvertiserSignalSchema);

export default AdvertiserSignal;
