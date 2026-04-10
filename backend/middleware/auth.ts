import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";

export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  userId?: string;
}

const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error("JWT_SECRET is not set");
      return res.status(500).json({ message: "Server config error" });
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.userId = decoded.id;

    return next();
  } catch (err) {
    logger.error(err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default auth;