import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../services/emailService";
import { securityConfig, validatePassword } from "../config/security";
import logger from "../utils/logger";

// Helper to sanitize user object for response (never expose password)
const sanitizeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  isVerified: user.isVerified,
  phone: user.phone,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Generate secure random token
const generateToken = (): string => crypto.randomBytes(32).toString("hex");

// REGISTER
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: "Password does not meet requirements",
        errors: passwordValidation.errors 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = new Date(Date.now() + securityConfig.tokens.emailVerificationExpiry);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "user",
      status: "active",
      isVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });

    // Send verification email
    await sendVerificationEmail(user.email, user.name, emailVerificationToken);

    // Generate tokens
    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth",
    });

    return res.status(200).json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken, // Still sent in body for backward compatibility
      message: "Registration successful. Please check your email to verify your account.",
    });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is suspended
    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    // OAuth-only accounts have no password — prompt them to use their provider
    if (user.oauthProvider && user.oauthProvider !== "local" && !user.password) {
      return res.status(400).json({
        message: `This account uses ${user.oauthProvider === "google" ? "Google" : "GitHub"} sign-in. Please use the ${user.oauthProvider === "google" ? "Google" : "GitHub"} button to log in.`,
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // ── Anti-fraud: track login signals (non-blocking) ──
    import("../services/signalService").then(({ ingestSignals, generateDeviceFingerprint }) => {
      ingestSignals(user._id.toString(), {
        ip: req.ip,
        deviceFingerprint: generateDeviceFingerprint(req),
        email: email.toLowerCase(),
        phone: user.phone,
      }).catch(() => {});
    }).catch(() => {});

    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/auth",
    });

    return res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken, // Still sent in body for backward compatibility
    });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const refresh = (req: Request, res: Response) => {
  try {
    // Accept refresh token from cookie (preferred) or body (backward compatibility)
    const refreshToken = req.cookies?.refreshToken || (req.body as any)?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    const payload = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken(payload.id);

    // Issue a new refresh token (token rotation for security)
    const newRefreshToken = signRefreshToken(payload.id);
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });

    return res.json({ accessToken });
  } catch (err: any) {
    logger.error(err);
    // Clear invalid refresh cookie
    res.clearCookie("refreshToken", { path: "/api/auth" });
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

// GET CURRENT USER
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// UPDATE PROFILE
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, email } = req.body as { name?: string; email?: string };

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    // Normalise email
    const normalisedEmail = email.toLowerCase().trim();

    // Check if email is taken by another user
    const existingUser = await User.findOne({ email: normalisedEmail, _id: { $ne: userId } });
    if (existingUser) {
      // SECURITY: Use generic message to prevent email enumeration
      return res.status(400).json({ message: "Unable to update profile. Please try again." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { name, email: normalisedEmail },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// CHANGE PASSWORD
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: "Password does not meet requirements",
        errors: passwordValidation.errors 
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string };

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    // Mark user as verified and remove token fields
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    await User.updateOne({ _id: user._id }, { $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    return res.json({ message: "Email verified successfully" });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// RESEND VERIFICATION EMAIL
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const emailVerificationToken = generateToken();
    const emailVerificationExpires = new Date(Date.now() + securityConfig.tokens.emailVerificationExpiry);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, user.name, emailVerificationToken);

    return res.json({ message: "Verification email sent" });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If an account exists, a password reset email has been sent" });
    }

    // Generate password reset token
    const passwordResetToken = generateToken();
    const passwordResetExpires = new Date(Date.now() + securityConfig.tokens.passwordResetExpiry);

    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(user.email, user.name, passwordResetToken);

    return res.json({ message: "If an account exists, a password reset email has been sent" });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// RESET PASSWORD
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: "Password does not meet requirements",
        errors: passwordValidation.errors 
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    await User.updateOne({ _id: user._id }, { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } });

    return res.json({ message: "Password reset successfully. You can now login with your new password." });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// LOGOUT
export const logout = async (req: Request, res: Response) => {
  try {
    // Clear refresh token HttpOnly cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });
    
    return res.json({ message: "Logged out successfully" });
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// EXPORT USER DATA (GDPR Article 15 & 20 — Subject Access Request)
export const exportUserData = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await User.findById(userId).select("-password -emailVerificationToken -passwordResetToken");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const Ad = (await import("../models/Ad")).default;
    const SavedProfile = (await import("../models/SavedProfile")).default;
    const SearchHistory = (await import("../models/SearchHistory")).default;
    const Notification = (await import("../models/Notification")).default;
    const [ads, savedProfiles, searchHistory, notifications] = await Promise.all([
      Ad.find({ userId: user._id, isDeleted: false }).select("-moderationScore -moderationFlags -moderationNote -moderationReviewedBy -imageHashes").lean(),
      SavedProfile.find({ userId: user._id }).lean(),
      SearchHistory.find({ userId: user._id }).lean(),
      Notification.find({ userId: user._id }).select("-__v").lean(),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      platform: "ReachRipple",
      account: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        accountType: (user as any).accountType,
        accountTier: (user as any).accountTier,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: (user as any).lastLogin,
      },
      ads: ads.map((ad: any) => ({
        id: ad._id,
        title: ad.title,
        description: ad.description,
        category: ad.category,
        location: ad.location,
        price: ad.price,
        status: ad.status,
        phone: ad.phone,
        email: ad.email,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
      })),
      savedProfiles: savedProfiles.map((sp: any) => ({
        profileId: sp.profileId,
        savedAt: sp.createdAt,
      })),
      searchHistory: searchHistory.map((sh: any) => ({
        query: sh.query,
        filters: sh.filters,
        searchedAt: sh.createdAt,
      })),
      notifications: notifications.map((n: any) => ({
        type: n.type,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="reachripple-data-export-${Date.now()}.json"`);
    return res.json(exportData);
  } catch (err: any) {
    logger.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// DELETE ACCOUNT
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { password, confirmDelete } = req.body as { 
      password?: string; 
      confirmDelete?: string;
    };

    // Require password confirmation for security
    if (!password) {
      return res.status(400).json({ message: "Password is required to delete account" });
    }

    // Require explicit confirmation text
    if (confirmDelete !== "DELETE MY ACCOUNT") {
      return res.status(400).json({ 
        message: "Please type 'DELETE MY ACCOUNT' to confirm deletion" 
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    // Import Ad model to handle user's ads
    const Ad = (await import("../models/Ad")).default;
    const SavedProfile = (await import("../models/SavedProfile")).default;
    const SearchHistory = (await import("../models/SearchHistory")).default;
    const Notification = (await import("../models/Notification")).default;
    // Message model removed — in-app messaging deleted

    // Soft delete user's ads (mark as deleted, don't remove)
    await Ad.updateMany(
      { userId: user._id },
      { isDeleted: true, status: "hidden" }
    );

    // Delete user's saved profiles
    await SavedProfile.deleteMany({ userId: user._id });

    // Delete user's search history
    await SearchHistory.deleteMany({ userId: user._id });

    // Delete user's notifications
    await Notification.deleteMany({ userId: user._id });

    // Soft delete the user (preserve data for legal/audit purposes)
    user.status = "suspended";
    user.email = `deleted_${user._id}@deleted.local`;
    user.name = "Deleted User";
    user.password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    user.phone = undefined;
    user.isVerified = false;
    await user.save();

    // Clear cookies
    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "strict" });

    return res.json({ 
      message: "Account deleted successfully. We're sorry to see you go.",
      deleted: true
    });
  } catch (err: any) {
    logger.error("Account deletion error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
