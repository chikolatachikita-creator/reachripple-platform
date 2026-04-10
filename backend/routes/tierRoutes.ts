/**
 * Tier Routes
 *
 * Endpoints for listing tier plans, upgrading/downgrading account tier,
 * cancelling subscriptions, and checking subscription status.
 * Uses direct GBP pricing for payments.
 */

import { Router, Response } from "express";
import auth, { AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import TierPlan, { TierPlanDocument, TierSlug } from "../models/TierPlan";
import { Subscription } from "../models/Subscription";
import User from "../models/User";
import Ad from "../models/Ad";
import { purchaseTierSchema } from "../validators/boostValidator";
import { logInfo, logWarn, logError } from "../utils/logger";

const router = Router();

// ============================================
// TIER ORDERING (for upgrade/downgrade detection)
// ============================================
const TIER_RANK: Record<string, number> = {
  free: 0,
  standard: 1,
  prime: 2,
  spotlight: 3,
  agency_starter: 1,
  agency_pro: 2,
  agency_elite: 3,
};

// ============================================
// GET /api/tiers — List all available tier plans
// ============================================

router.get("/", async (_req, res: Response) => {
  try {
    const plans = await TierPlan.find({ isActive: true })
      .sort({ category: 1, sortOrder: 1 })
      .lean();

    res.json({ plans });
  } catch (err: any) {
    logError("Failed to fetch tier plans", err.message);
    res.status(500).json({ message: "Failed to load tier plans" });
  }
});

// ============================================
// GET /api/tiers/my-subscription — Get current subscription
// ============================================

router.get("/my-subscription", auth, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await Subscription.getActiveSubscription(req.userId!);
    const user = await User.findById(req.userId).select("accountTier");

    if (!sub) {
      return res.json({
        subscription: null,
        currentTier: user?.accountTier || "free",
      });
    }

    // Populate with plan details
    const plan: any = await TierPlan.findOne({ slug: sub.tierSlug }).lean();

    res.json({
      subscription: {
        id: sub._id,
        tierSlug: sub.tierSlug,
        tierName: plan?.name || sub.tierSlug,
        status: sub.status,
        billingCycle: sub.billingCycle,
        priceGBP: sub.priceGBP,
        startDate: sub.startDate,
        currentPeriodEnd: sub.currentPeriodEnd,
        autoRenew: sub.autoRenew,
        cancelledAt: sub.cancelledAt,
      },
      currentTier: user?.accountTier || "free",
    });
  } catch (err: any) {
    logError("Failed to fetch subscription", err.message, { userId: req.userId });
    res.status(500).json({ message: "Failed to load subscription" });
  }
});

// ============================================
// POST /api/tiers/upgrade — Purchase or change tier
// ============================================

router.post(
  "/upgrade",
  auth,
  validateBody(purchaseTierSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { tierSlug, billingCycle } = req.body;
      const userId = req.userId!;

      // 1. Get the target plan
      const plan = await TierPlan.findOne({ slug: tierSlug, isActive: true });
      if (!plan) {
        return res.status(404).json({ message: "Tier plan not found or inactive" });
      }

      // 2. Check agency tier restrictions
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (plan.category === "agency" && user.accountType !== "agency") {
        return res.status(403).json({
          message: "Agency tiers are only available to verified agency accounts",
        });
      }

      // 3. Check if already on this tier
      if (user.accountTier === tierSlug) {
        return res.status(400).json({ message: "You are already on this tier" });
      }

      // 4. Calculate price in GBP
      const price = billingCycle === "yearly"
        ? (plan.priceYearly || plan.priceMonthly * 12)
        : plan.priceMonthly;
      const priceGBP = Math.round(price * 100) / 100;

      // 5. Pro-rata credit for existing active subscription
      let upgradeCredit = 0;
      const existingSub = await Subscription.getActiveSubscription(userId);

      if (existingSub && existingSub.status === "active") {
        const now = new Date();
        const periodEnd = new Date(existingSub.currentPeriodEnd);
        const periodStart = new Date(existingSub.startDate);
        const totalMs = periodEnd.getTime() - periodStart.getTime();
        const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());
        const unusedFraction = totalMs > 0 ? remainingMs / totalMs : 0;
        upgradeCredit = Math.round(existingSub.priceGBP * unusedFraction * 100) / 100;

        // Only allow credit if upgrading, not downgrading
        const oldRank = TIER_RANK[existingSub.tierSlug] || 0;
        const newRank = TIER_RANK[tierSlug] || 0;
        if (newRank <= oldRank) {
          upgradeCredit = 0; // No pro-rata refund for downgrades
        }
      }

      // 6. Expire old subscription
      if (existingSub && existingSub.status === "active") {
        existingSub.status = "expired";
        existingSub.expiredAt = new Date();
        await existingSub.save();
      }

      // 7. Calculate period end
      const startDate = new Date();
      const periodEnd = new Date(startDate);
      if (billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // 8. Create new subscription
      const subscription = await Subscription.create({
        userId,
        tierSlug,
        status: "active",
        billingCycle,
        priceGBP,
        startDate,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        previousTierSlug: user.accountTier,
        upgradeCredit,
      });

      // 9. Update user's account tier
      const effectiveTier = plan.category === "agency"
        ? mapAgencyTierToAccountTier(tierSlug)
        : tierSlug;
      user.accountTier = effectiveTier as any;
      await user.save();

      // 10. Handle downgrade ad enforcement
      const oldRank = TIER_RANK[existingSub?.tierSlug || "free"] || 0;
      const newRank = TIER_RANK[tierSlug] || 0;
      if (newRank < oldRank) {
        await enforceAdLimits(userId, plan);
      }

      logInfo("Tier upgraded", {
        userId,
        from: existingSub?.tierSlug || "free",
        to: tierSlug,
        billingCycle,
        priceGBP,
        upgradeCredit,
      });

      res.json({
        message: `Successfully upgraded to ${plan.name}`,
        subscription: {
          id: subscription._id,
          tierSlug: subscription.tierSlug,
          tierName: plan.name,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          priceGBP: subscription.priceGBP,
          startDate: subscription.startDate,
          currentPeriodEnd: subscription.currentPeriodEnd,
          upgradeCredit,
        },
        newTier: effectiveTier,
      });
    } catch (err: any) {
      logError("Tier upgrade failed", err.message, { userId: req.userId });
      res.status(500).json({ message: "Tier upgrade failed" });
    }
  }
);

// ============================================
// POST /api/tiers/cancel — Cancel subscription
// ============================================

router.post("/cancel", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const sub = await Subscription.getActiveSubscription(userId);

    if (!sub || sub.status !== "active") {
      return res.status(400).json({ message: "No active subscription to cancel" });
    }

    if (sub.tierSlug === "free") {
      return res.status(400).json({ message: "Cannot cancel the free tier" });
    }

    sub.status = "cancelled";
    sub.cancelledAt = new Date();
    sub.autoRenew = false;
    await sub.save();

    logInfo("Subscription cancelled", {
      userId,
      tierSlug: sub.tierSlug,
      activeUntil: sub.currentPeriodEnd,
    });

    res.json({
      message: "Subscription cancelled. You will retain access until the end of your billing period.",
      activeUntil: sub.currentPeriodEnd,
    });
  } catch (err: any) {
    logError("Cancel subscription failed", err.message, { userId: req.userId });
    res.status(500).json({ message: "Failed to cancel subscription" });
  }
});

// ============================================
// POST /api/tiers/toggle-renewal — Toggle auto-renewal
// ============================================

router.post("/toggle-renewal", auth, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await Subscription.getActiveSubscription(req.userId!);
    if (!sub) {
      return res.status(400).json({ message: "No active subscription" });
    }

    sub.autoRenew = !sub.autoRenew;
    await sub.save();

    res.json({
      autoRenew: sub.autoRenew,
      message: sub.autoRenew
        ? "Auto-renewal enabled"
        : "Auto-renewal disabled. Your subscription will expire at the end of the billing period.",
    });
  } catch (err: any) {
    logError("Toggle renewal failed", err.message, { userId: req.userId });
    res.status(500).json({ message: "Failed to toggle renewal" });
  }
});

// ============================================
// HELPERS
// ============================================

/**
 * Map agency tier slugs to the 4 user-level accountTier values.
 * Agency tiers map to their closest individual equivalent.
 */
function mapAgencyTierToAccountTier(tierSlug: string): string {
  const map: Record<string, string> = {
    agency_starter: "standard",
    agency_pro: "prime",
    agency_elite: "spotlight",
  };
  return map[tierSlug] || tierSlug;
}

/**
 * When downgrading, hide excess ads beyond the new plan's maxAds limit.
 * Keeps the most recently updated ads active, hides the rest.
 */
async function enforceAdLimits(
  userId: string,
  plan: TierPlanDocument
): Promise<void> {
  const activeAds = await Ad.find({
    userId,
    status: { $in: ["approved", "pending"] },
    isDeleted: false,
  })
    .sort({ updatedAt: -1 })
    .select("_id title");

  if (activeAds.length <= plan.maxAds) return;

  // Keep the first N (most recent), hide the rest
  const adsToHide = activeAds.slice(plan.maxAds);
  const idsToHide = adsToHide.map((ad) => ad._id);

  await Ad.updateMany(
    { _id: { $in: idsToHide } },
    { $set: { status: "hidden" } }
  );

  logWarn("Ads hidden due to tier downgrade", {
    userId,
    newTier: plan.slug,
    maxAds: plan.maxAds,
    hiddenCount: idsToHide.length,
    hiddenAdIds: idsToHide,
  });
}

// ============================================
// RENEWAL CRON (exported for index.ts)
// ============================================

/**
 * Process expired / due-for-renewal subscriptions.
 * Called from a periodic cron job in index.ts.
 */
export async function processSubscriptionRenewals(): Promise<void> {
  const now = new Date();

  // 1. Find active subs past their period end
  const dueSubs = await Subscription.find({
    status: "active",
    currentPeriodEnd: { $lte: now },
  });

  for (const sub of dueSubs) {
    try {
      if (!sub.autoRenew) {
        // Let it expire → downgrade user to free
        sub.status = "expired";
        sub.expiredAt = now;
        await sub.save();

        await User.findByIdAndUpdate(sub.userId, { accountTier: "free" });

        // Enforce ad limits for free tier
        const freePlan = await TierPlan.findOne({ slug: "free" });
        if (freePlan) {
          await enforceAdLimits(String(sub.userId), freePlan);
        }

        logInfo("Subscription expired (auto-renew off)", {
          userId: sub.userId,
          tierSlug: sub.tierSlug,
        });
        continue;
      }

      // 2. Attempt renewal — record GBP price
      const plan = await TierPlan.findOne({ slug: sub.tierSlug });
      if (!plan) {
        sub.status = "expired";
        sub.expiredAt = now;
        await sub.save();
        continue;
      }

      const renewalPrice = sub.billingCycle === "yearly"
        ? (plan.priceYearly || plan.priceMonthly * 12)
        : plan.priceMonthly;

      // Extend subscription period
      const newPeriodEnd = new Date(sub.currentPeriodEnd);
      if (sub.billingCycle === "yearly") {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      sub.currentPeriodEnd = newPeriodEnd;
      sub.renewalAttempts = 0;
      sub.renewalFailedAt = undefined;
      sub.priceGBP = renewalPrice;
      await sub.save();

      logInfo("Subscription renewed", {
        userId: sub.userId,
        tierSlug: sub.tierSlug,
        newPeriodEnd,
        priceGBP: renewalPrice,
      });
    } catch (err: any) {
      logError("Subscription renewal error", err.message, {
        subId: sub._id,
        userId: sub.userId,
      });
    }
  }

  // 4. Handle cancelled subs past their period end
  const expiredCancelled = await Subscription.find({
    status: "cancelled",
    currentPeriodEnd: { $lte: now },
  });

  for (const sub of expiredCancelled) {
    sub.status = "expired";
    sub.expiredAt = now;
    await sub.save();

    await User.findByIdAndUpdate(sub.userId, { accountTier: "free" });

    const freePlan = await TierPlan.findOne({ slug: "free" });
    if (freePlan) {
      await enforceAdLimits(String(sub.userId), freePlan);
    }

    logInfo("Cancelled subscription expired", {
      userId: sub.userId,
      tierSlug: sub.tierSlug,
    });
  }
}

export default router;
