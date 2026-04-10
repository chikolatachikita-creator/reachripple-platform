/**
 * Zod validation schemas for all API endpoints
 */

import { z } from "zod";

// ============ AUTH SCHEMAS ============

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .trim()
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .max(100, "Email must be less than 100 characters")
    .transform((v) => v.toLowerCase().trim())
    .optional(),
  phone: z
    .string()
    .regex(/^[0-9+\s-]{10,15}$/, "Invalid phone number format")
    .optional()
    .nullable(),
});

// ============ AD SCHEMAS ============

export const createAdSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be less than 2000 characters")
    .trim(),
  category: z.enum(["Escort", "Male Escort", "Trans", "Massage", "BDSM", "Other"], {
    message: "Invalid category",
  }),
  location: z.string().min(2, "Location is required").max(100).trim(),
  price: z.number().min(0, "Price must be positive").max(10000, "Price seems too high"),
  phone: z
    .string()
    .regex(/^[0-9+\s-]{10,15}$/, "Invalid phone number")
    .optional(),
  email: z.string().email("Invalid email").optional(),
  age: z.number().min(18, "Must be at least 18 years old").max(99).optional(),
  ethnicity: z.string().max(50).optional(),
  bodyType: z.string().max(50).optional(),
  services: z.array(z.string().max(50)).max(20).optional(),
});

export const updateAdSchema = createAdSchema.partial();

export const adStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "hidden", "pending"]),
  rejectionReason: z.string().max(500).optional(),
});

// ============ REPORT SCHEMAS ============

export const createReportSchema = z.object({
  adId: z.string().min(1, "Ad ID is required"),
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters")
    .trim(),
});

export const updateReportSchema = z.object({
  status: z.enum(["pending", "reviewed", "dismissed"]),
});

// ============ SETTINGS SCHEMAS ============

export const updateSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  maintenanceMode: z.boolean().optional(),
  adsRequireApproval: z.boolean().optional(),
  maxImagesPerAd: z.number().min(1).max(20).optional(),
});

// ============ USER ADMIN SCHEMAS ============

export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

// ============ PAGINATION SCHEMAS ============

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().max(100).optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;

