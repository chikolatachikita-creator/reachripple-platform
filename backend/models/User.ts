import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "suspended";
export type AccountType = "independent" | "agency";
export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
export type PostingPlan = "free" | "basic" | "premium";
export type OAuthProvider = "local" | "google" | "github";

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  phone?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // ===== OAUTH =====
  oauthProvider: OAuthProvider;
  oauthId?: string;          // Provider-specific user ID
  avatarUrl?: string;        // Profile picture from OAuth provider
  
  // ===== ACCOUNT TYPE (Independent vs Agency) =====
  accountType: AccountType;
  verificationStatus: VerificationStatus;
  postingPlan: PostingPlan;
  
  // ID Verification (for Trust badges)
  idVerificationStatus: VerificationStatus;
  idVerificationDoc?: string;      // Uploaded ID doc path
  idVerifiedAt?: Date;
  idVerifiedBy?: mongoose.Types.ObjectId;
  
  // Agency-specific fields (required for agency accounts)
  agencyDetails?: {
    companyName?: string;
    companyNumber?: string; // UK Companies House registration
    vatNumber?: string;
    directorName?: string;
    registeredAddress?: string;
    tradingAddress?: string;
    website?: string;
    // Documents (stored as file paths/URLs)
    companyRegistrationDoc?: string;
    proofOfAddress?: string;
    directorIdDoc?: string;
    // Verification
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
    rejectionReason?: string;
  };
  
  // ===== ACCOUNT TIER =====
  accountTier: "free" | "standard" | "prime" | "spotlight";

  // ===== TRUST & SAFETY SIGNALS (backend only) =====
  // These are NOT exposed to the UI - used for internal ranking
  // Risk fields (riskScore, riskLevel, isUnderReview) now live in RiskProfile model
  lastActiveAt?: Date;           // Last activity timestamp
  profileCompletenessScore?: number;  // 0-100 score based on filled fields
  totalAdsPosted?: number;       // Lifetime ad count
  adsRejectedCount?: number;     // Number of rejected ads
  reportsReceivedCount?: number; // Number of reports against this user
  ipCountry?: string;            // Country from last known IP (for location mismatch)
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false, select: false }, // Not required for OAuth users
    oauthProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    oauthId: { type: String },      // Provider-specific user ID
    avatarUrl: { type: String },     // Profile picture from OAuth provider
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    phone: { type: String, trim: true },
    lastLogin: { type: Date },
    
    // ===== ACCOUNT TYPE (Independent vs Agency) =====
    accountType: {
      type: String,
      enum: ["independent", "agency"],
      default: "independent",
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },
    postingPlan: {
      type: String,
      enum: ["free", "basic", "premium"],
      default: "free",
    },
    
    // ID Verification (for Trust badges)
    idVerificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },
    idVerificationDoc: { type: String },
    idVerifiedAt: { type: Date },
    idVerifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    // Agency-specific fields
    agencyDetails: {
      companyName: { type: String, trim: true },
      companyNumber: { type: String, trim: true }, // UK Companies House
      vatNumber: { type: String, trim: true },
      directorName: { type: String, trim: true },
      registeredAddress: { type: String, trim: true },
      tradingAddress: { type: String, trim: true },
      website: { type: String, trim: true },
      // Documents (file paths/URLs)
      companyRegistrationDoc: { type: String },
      proofOfAddress: { type: String },
      directorIdDoc: { type: String },
      // Verification tracking
      verifiedAt: { type: Date },
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectionReason: { type: String },
    },
    
    // ===== ACCOUNT TIER =====
    accountTier: {
      type: String,
      enum: ["free", "standard", "prime", "spotlight"],
      default: "free",
    },

    // ===== TRUST & SAFETY SIGNALS (backend only, not exposed) =====
    // Risk fields (riskScore, riskLevel, isUnderReview) now live in RiskProfile model
    lastActiveAt: { type: Date, select: false },
    profileCompletenessScore: { type: Number, default: 0, select: false },
    totalAdsPosted: { type: Number, default: 0, select: false },
    adsRejectedCount: { type: Number, default: 0, select: false },
    reportsReceivedCount: { type: Number, default: 0, select: false },
    ipCountry: { type: String, select: false },
  },
  { timestamps: true }
);

// Indexes for performance (email already has unique:true which creates an index)
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ accountType: 1, postingPlan: 1 });
UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ oauthProvider: 1, oauthId: 1 }, { sparse: true });

export const User: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);

export default User;
