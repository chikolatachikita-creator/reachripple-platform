import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../../models/User";
import AdminLog from "../../models/AdminLog";
import logger from "../../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user with admin role in the User collection
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    if (!JWT_SECRET) {
      logger.error("JWT_SECRET not set");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    // Short-lived admin access token (15 minutes, not 24 hours)
    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET!, { expiresIn: "7d" });

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api",
    });

    // Log admin login
    await AdminLog.logAction({
      adminId: user._id,
      adminEmail: user.email,
      action: "ADMIN_LOGIN",
      targetType: "system",
      description: `Admin login: ${user.email}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      accessToken,
      refreshToken, // backward compatibility
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Accept from cookie (preferred) or body (backward compat)
    const token = req.cookies?.refreshToken || req.body?.token;

    if (!token) return res.status(401).json({ message: "No token provided" });

    if (!JWT_REFRESH_SECRET || !JWT_SECRET) {
      logger.error("JWT secrets missing when refreshing token");
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
      const newAccess = jwt.sign({ id: decoded.id }, JWT_SECRET, { expiresIn: "15m" });

      // Rotate refresh token
      const newRefresh = jwt.sign({ id: decoded.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
      res.cookie("refreshToken", newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/api",
      });

      return res.json({ accessToken: newAccess });
    } catch (err) {
      res.clearCookie("refreshToken", { path: "/api" });
      return res.status(403).json({ message: "Invalid token" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const logoutAdmin = async (req: Request, res: Response) => {
  // Clear HttpOnly cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
  });
  return res.json({ message: "Logged out" });
};
