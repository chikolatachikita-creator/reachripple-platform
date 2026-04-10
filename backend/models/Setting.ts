import mongoose, { Schema, Document, Model } from "mongoose";

export interface SettingDocument extends Document {
  key: string;
  value: unknown;
}

const SettingSchema = new Schema<SettingDocument>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Setting: Model<SettingDocument> =
  mongoose.models.Setting ||
  mongoose.model<SettingDocument>("Setting", SettingSchema);

export default Setting;
