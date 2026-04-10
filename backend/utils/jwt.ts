import jwt from "jsonwebtoken";
import { JwtPayload } from "../middleware/auth";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

export const signAccessToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return jwt.sign({ id }, secret, { expiresIn: ACCESS_EXPIRES_IN });
};

export const signRefreshToken = (id: string): string => {
  const secret =
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET (or JWT_REFRESH/JWT_SECRET) is not set");
  }

  return jwt.sign({ id }, secret, { expiresIn: REFRESH_EXPIRES_IN });
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const secret =
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET (or JWT_REFRESH/JWT_SECRET) is not set");
  }

  return jwt.verify(token, secret) as JwtPayload;
};