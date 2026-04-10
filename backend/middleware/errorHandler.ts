import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * Custom application error class with HTTP status code support
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes operational errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factories
export const NotFoundError = (resource: string = "Resource") =>
  new AppError(`${resource} not found`, 404);

export const ValidationError = (message: string) =>
  new AppError(message, 400);

export const UnauthorizedError = (message: string = "Unauthorized") =>
  new AppError(message, 401);

export const ForbiddenError = (message: string = "Forbidden") =>
  new AppError(message, 403);

/**
 * Async handler wrapper — eliminates try/catch in every route handler
 * Usage: router.get("/", asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Central error handler middleware — must be registered LAST with app.use()
 * Converts all errors into clean JSON responses
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default values
  let statusCode = 500;
  let message = "Internal server error";
  let errors: string[] | undefined;

  if (err instanceof AppError) {
    // Operational error — safe to expose message
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    message = "Validation error";
    const mongooseErr = err as any;
    if (mongooseErr.errors) {
      errors = Object.values(mongooseErr.errors).map((e: any) => e.message);
    }
  } else if (err.name === "CastError") {
    // Mongoose CastError (invalid ObjectId etc)
    statusCode = 400;
    message = "Invalid ID format";
  } else if ((err as any).code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    const keyValue = (err as any).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : "field";
    message = `Duplicate value for ${field}`;
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Log the error (full stack for 500s, message only for operational)
  if (statusCode >= 500) {
    logger.error("Server error:", {
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  } else {
    logger.debug(`${statusCode} ${message}`, {
      method: req.method,
      path: req.path,
    });
  }

  // Send response (never expose stack in production)
  const response: any = { message };
  if (errors) response.errors = errors;
  if (process.env.NODE_ENV === "development" && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
