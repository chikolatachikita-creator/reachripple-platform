import { Request, Response } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import User from "../models/User";
import { signAccessToken, signRefreshToken } from "../utils/jwt";
import logger from "../utils/logger";

// JWKS client for Apple id_token signature verification.
// Apple's public keys rotate; jwks-rsa caches them with TTL + rate limit.
const appleJwks = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 24 * 60 * 60 * 1000, // 24h
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const verifyAppleIdToken = (idToken: string, audience: string): Promise<any> =>
  new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      (header, callback) => {
        if (!header.kid) return callback(new Error("Missing kid in id_token header"));
        appleJwks.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      },
      {
        algorithms: ["RS256"],
        issuer: "https://appleid.apple.com",
        audience,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });

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
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth",
  });

  return { accessToken, refreshToken };
};

// Shared logic: find-or-create user by OAuth provider, then issue JWT
const handleOAuthLogin = async (
  res: Response,
  provider: "google" | "github" | "facebook" | "apple",
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
  const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
  res.json({
    google: {
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${frontend}/auth/google/callback`,
    },
    github: {
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      clientId: process.env.GITHUB_CLIENT_ID || null,
    },
    facebook: {
      enabled: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
      clientId: process.env.FACEBOOK_CLIENT_ID || null,
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || `${frontend}/auth/facebook/callback`,
    },
    apple: {
      enabled: !!(
        process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_PRIVATE_KEY
      ),
      clientId: process.env.APPLE_CLIENT_ID || null,
      redirectUri: process.env.APPLE_REDIRECT_URI || `${frontend}/auth/apple/callback`,
    },
  });
};

// ─── FACEBOOK OAuth ─────────────────────────────────
// POST /api/auth/oauth/facebook
// Body: { code: string } — the authorization code from Facebook's consent screen
export const facebookCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ message: "Authorization code is required" });

    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri =
      process.env.FACEBOOK_REDIRECT_URI ||
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/facebook/callback`;

    if (!clientId || !clientSecret) {
      return res.status(501).json({ message: "Facebook OAuth is not configured" });
    }

    // Exchange code for access token (Facebook uses GET with query params)
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as any;

    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error("Facebook token exchange failed", tokenData);
      return res.status(401).json({ message: "Failed to authenticate with Facebook" });
    }

    // Fetch user profile (email is only returned if the user granted the email scope)
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(
        tokenData.access_token
      )}`
    );
    const userInfo = (await profileRes.json()) as any;

    if (!userInfo.id) {
      return res.status(400).json({ message: "Could not retrieve profile from Facebook" });
    }
    if (!userInfo.email) {
      return res.status(400).json({
        message: "Facebook did not return an email address. Please use a different sign-in method.",
      });
    }

    return handleOAuthLogin(res, "facebook", {
      id: String(userInfo.id),
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split("@")[0],
      avatarUrl: userInfo.picture?.data?.url,
    });
  } catch (err: any) {
    logger.error("Facebook OAuth error:", err);
    return res.status(500).json({ message: "OAuth authentication failed" });
  }
};

// ─── APPLE OAuth (Sign in with Apple) ────────────────────────
// POST /api/auth/oauth/apple
// Body: { code: string, user?: { name?: { firstName?: string; lastName?: string } } }
//
// Apple is special:
//   1. The "client_secret" is a short-lived JWT we sign with our .p8 private key
//      (ES256, kid=APPLE_KEY_ID, iss=APPLE_TEAM_ID, sub=APPLE_CLIENT_ID).
//   2. The user's name is ONLY sent on the very first authorisation, in the
//      front-end form post (`user` field). We accept it on the request body so
//      the client can forward it.
//   3. The token endpoint returns an `id_token` (a JWT). We decode it for the
//      user's email and `sub` (stable Apple user ID).
export const appleCallback = async (req: Request, res: Response) => {
  try {
    const { code, user: appleUser } = req.body as {
      code?: string;
      user?: { name?: { firstName?: string; lastName?: string } };
    };
    if (!code) return res.status(400).json({ message: "Authorization code is required" });

    const clientId = process.env.APPLE_CLIENT_ID;
    const teamId = process.env.APPLE_TEAM_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const redirectUri =
      process.env.APPLE_REDIRECT_URI ||
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/apple/callback`;

    if (!clientId || !teamId || !keyId || !privateKey) {
      return res.status(501).json({ message: "Apple OAuth is not configured" });
    }

    // 1. Build the client_secret JWT
    const now = Math.floor(Date.now() / 1000);
    const clientSecret = jwt.sign(
      {
        iss: teamId,
        iat: now,
        exp: now + 60 * 5, // 5 minutes
        aud: "https://appleid.apple.com",
        sub: clientId,
      },
      privateKey,
      { algorithm: "ES256", keyid: keyId }
    );

    // 2. Exchange code for tokens
    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });
    const tokenData = (await tokenRes.json()) as any;

    if (!tokenRes.ok || !tokenData.id_token) {
      logger.error("Apple token exchange failed", tokenData);
      return res.status(401).json({ message: "Failed to authenticate with Apple" });
    }

    // 3. Verify id_token signature against Apple's JWKS, plus iss + aud claims.
    let decoded: any;
    try {
      decoded = await verifyAppleIdToken(tokenData.id_token, clientId);
    } catch (verifyErr: any) {
      logger.error("Apple id_token verification failed:", verifyErr?.message || verifyErr);
      return res.status(401).json({ message: "Invalid Apple identity token" });
    }
    if (!decoded?.sub) {
      return res.status(401).json({ message: "Invalid Apple identity token" });
    }

    const email: string | undefined = decoded.email;
    if (!email) {
      return res.status(400).json({
        message: "Apple did not return an email address. Please use a different sign-in method.",
      });
    }

    const fullName = appleUser?.name
      ? [appleUser.name.firstName, appleUser.name.lastName].filter(Boolean).join(" ").trim()
      : "";

    return handleOAuthLogin(res, "apple", {
      id: String(decoded.sub),
      email,
      name: fullName || email.split("@")[0],
    });
  } catch (err: any) {
    logger.error("Apple OAuth error:", err);
    return res.status(500).json({ message: "OAuth authentication failed" });
  }
};
