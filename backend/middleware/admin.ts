import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import User from "../models/User";
import logger from "../utils/logger";

const adminCheck = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized - no user ID" });
    }

    const user = await User.findById(req.userId).lean();

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    return next();
  } catch (err) {
    logger.error("Admin middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export default adminCheck;