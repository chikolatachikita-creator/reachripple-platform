/**
 * Validation middleware using Zod schemas
 */

import { Request, Response, NextFunction, ParamsDictionary } from "express-serve-static-core";
import { ZodSchema, ZodError } from "zod";
import { ParsedQs } from "qs";

/**
 * Creates a validation middleware for request body
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          message: "Validation failed",
          errors,
        });
      }
      return res.status(400).json({ message: "Invalid request data" });
    }
  };
};

/**
 * Creates a validation middleware for query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as ParsedQs;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          message: "Validation failed",
          errors,
        });
      }
      return res.status(400).json({ message: "Invalid query parameters" });
    }
  };
};

/**
 * Creates a validation middleware for URL parameters
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as ParamsDictionary;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          message: "Validation failed",
          errors,
        });
      }
      return res.status(400).json({ message: "Invalid URL parameters" });
    }
  };
};
