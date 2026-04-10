import mongoose, { Schema, Document, Model } from "mongoose";

export interface SearchHistoryDocument extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  keyword?: string;
  location?: string;
  category?: string;
  distance?: number;
  ageRange?: [number, number];
  sortBy?: string;
  searchedAt: Date;
}

const SearchHistorySchema = new Schema<SearchHistoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    keyword: String,
    location: String,
    category: String,
    distance: Number,
    ageRange: {
      type: [Number],
      default: undefined,
    },
    sortBy: {
      type: String,
      enum: ["featured", "newest", "distance"],
      default: "featured",
    },
    searchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for fast lookups
SearchHistorySchema.index({ userId: 1, searchedAt: -1 });

export const SearchHistory: Model<SearchHistoryDocument> =
  mongoose.models.SearchHistory || mongoose.model<SearchHistoryDocument>("SearchHistory", SearchHistorySchema);

export default SearchHistory;
