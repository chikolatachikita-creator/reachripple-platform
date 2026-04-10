/**
 * Tiers API Client
 * Handles tier plan listing, subscription management, and tier upgrades.
 */
import client from "./client";

// Types
export interface TierPlan {
  _id: string;
  slug: string;
  name: string;
  category: "individual" | "agency";
  priceMonthly: number;
  priceYearly?: number;
  visibilityMultiplier: number;
  maxAds: number;
  maxImages: number;
  maxVideos: number;
  bumpCooldownHours: number;
  boostDiscount: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface SubscriptionInfo {
  id: string;
  tierSlug: string;
  tierName: string;
  status: "active" | "cancelled" | "expired" | "pending";
  billingCycle: "monthly" | "yearly";
  priceGBP: number;
  creditsCharged: number;
  startDate: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  cancelledAt?: string;
}

export interface MySubscriptionResponse {
  subscription: SubscriptionInfo | null;
  currentTier: string;
  credits: number;
}

export interface UpgradeResponse {
  message: string;
  subscription: SubscriptionInfo & { upgradeCredit: number };
  newTier: string;
}

// API calls

export async function getTierPlans(): Promise<TierPlan[]> {
  const { data } = await client.get("/tiers");
  return data.plans;
}

export async function getMySubscription(): Promise<MySubscriptionResponse> {
  const { data } = await client.get("/tiers/my-subscription");
  return data;
}

export async function upgradeTier(
  tierSlug: string,
  billingCycle: "monthly" | "yearly"
): Promise<UpgradeResponse> {
  const { data } = await client.post("/tiers/upgrade", { tierSlug, billingCycle });
  return data;
}

export async function cancelSubscription(): Promise<{ message: string; activeUntil: string }> {
  const { data } = await client.post("/tiers/cancel");
  return data;
}

export async function toggleAutoRenewal(): Promise<{ autoRenew: boolean; message: string }> {
  const { data } = await client.post("/tiers/toggle-renewal");
  return data;
}
