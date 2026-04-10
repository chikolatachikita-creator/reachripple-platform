import { Request, Response } from "express";
import crypto from "crypto";
import User from "../models/User";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import logger from "../utils/logger";

// Helper to sanitize user object for response
const sanitizeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  isVerified: user.isVerified,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  oauthProvider: user.oauthProvider,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Issue tokens and set refresh cookie
const issueTokens = (res: Response, userId: string) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });

  return { accessToken, refreshToken };
};

// Shared logic: find-or-create user by OAuth provider, then issue JWT
const handleOAuthLogin = async (
  res: Response,
  provider: "google" | "github",
  profile: { id: string; email: string; name: string; avatarUrl?: string }
) => {
  // 1. Check if an account already exists with this OAuth provider + id
  let user = await User.findOne({ oauthProvider: provider, oauthId: profile.id });

  if (!user) {
    // 2. Check if a local account with the same email exists — link it
    user = await User.findOne({ email: profile.email.toLowerCase() });

    if (user) {
      // Link the existing local account to this OAuth provider
      user.oauthProvider = provider;
      user.oauthId = profile.id;
      if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
      user.isVerified = true; // OAuth-verified email
      user.lastLogin = new Date();
      await user.save();
    } else {
      // 3. Create a brand-new account
      user = await User.create({
        name: profile.name,
        email: profile.email.toLowerCase().trim(),
        oauthProvider: provider,
        oauthId: profile.id,
        avatarUrl: profile.avatarUrl,
        role: "user",
        status: "active",
        isVerified: true, // OAuth emails are pre-verified
      });
    }
  } else {
    // Existing OAuth user — update last login & avatar
    user.lastLogin = new Date();
    if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
    await user.save();
  }

  // Check suspended
  if (user.status === "suspended") {
    return res.status(403).json({ message: "Your account has been suspended" });
  }

  const { accessToken, refreshToken } = issueTokens(res, user._id.toString());

  return res.json({
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  });
};

// ─── GOOGLE OAuth ──────────────────────────────────────────────
// POST /api/auth/oauth/google
// Body: { code: string } — the authorization code from Google's consent screen
export const googleCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code?: string };

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return res.status(501).json({ message: "Google OAuth is not configured" });
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as any;

    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error("Google token exchange failed", tokenData);
      return res.status(401).json({ message: "Failed to authenticate with Google" });
    }

    // Fetch user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo = (await userInfoRes.json()) as any;

    if (!userInfo.email) {
      return res.status(400).json({ message: "Could not retrieve email from Google" });
    }

    return handleOAuthLogin(res, "google", {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split("@")[0],
      avatarUrl: userInfo.picture,
    });
  } catch (err: any) {
    logger.error("Google OAuth error:", err);
    return res.status(500).json({ message: "OAuth authentication failed" });
  }
};

// ─── GITHUB OAuth ──────────────────────────────────────────────
// POST /api/auth/oauth/github
// Body: { code: string } — the authorization code from GitHub's consent screen
export const githubCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code?: string };

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(501).json({ message: "GitHub OAuth is not configured" });
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as any;

    if (!tokenData.access_token) {
      logger.error("GitHub token exchange failed", tokenData);
      return res.status(401).json({ message: "Failed to authenticate with GitHub" });
    }

    // Fetch user info
    const userInfoRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    const userInfo = (await userInfoRes.json()) as any;

    // GitHub may not expose email publicly — fetch from /user/emails
    let email = userInfo.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      });
      const emails = (await emailsRes.json()) as any[];
      const primary = emails.find((e: any) => e.primary && e.verified);
      email = primary?.email || emails[0]?.email;
    }

    if (!email) {
      return res.status(400).json({
        message: "Could not retrieve email from GitHub. Please ensure your email is public or verified on GitHub.",
      });
    }

    return handleOAuthLogin(res, "github", {
      id: String(userInfo.id),
      email,
      name: userInfo.name || userInfo.login || email.split("@")[0],
      avatarUrl: userInfo.avatar_url,
    });
  } catch (err: any) {
    logger.error("GitHub OAuth error:", err);
    return res.status(500).json({ message: "OAuth authentication failed" });
  }
};

// GET /api/auth/oauth/config
// Returns public OAuth client IDs (no secrets) so the frontend can build consent URLs
export const getOAuthConfig = async (_req: Request, res: Response) => {
  res.json({
    google: {
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/google/callback`,
    },
    github: {
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      clientId: process.env.GITHUB_CLIENT_ID || null,
    },
  });
};
