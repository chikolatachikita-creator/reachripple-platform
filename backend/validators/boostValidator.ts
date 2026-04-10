/**
 * Boost & Tier Purchase Validators (Zod v4)
 */

import { z } from "zod";

/**
 * Purchase a placement boost (STANDARD/PRIORITY/PRIORITY_PLUS/FEATURED) for an ad.
 */
export const purchaseBoostSchema = z.object({
  adId: z.string().min(1, "Ad ID is required"),
  tier: z.enum(["STANDARD", "PRIORITY", "PRIORITY_PLUS", "FEATURED"], {
    message: "Tier must be STANDARD, PRIORITY, PRIORITY_PLUS, or FEATURED",
  }),
  durationDays: z.number().int().min(1).max(30).default(7),
});

/**
 * Activate Tap Up (auto-bump) for an ad.
 */
export const activateTapUpSchema = z.object({
  adId: z.string().min(1, "Ad ID is required"),
  intervalHours: z.enum(["6", "8", "12"], {
    message: "Interval must be 6, 8, or 12 hours",
  }),
  durationDays: z.number().int().min(1).max(30).default(7),
});

/**
 * Purchase an account tier upgrade.
 */
export const purchaseTierSchema = z.object({
  tierSlug: z.enum(["standard", "prime", "spotlight", "agency_starter", "agency_pro", "agency_elite"], {
    message: "Invalid tier slug",
  }),
  billingCycle: z.enum(["monthly", "yearly"], {
    message: "Billing cycle must be monthly or yearly",
  }),
});
