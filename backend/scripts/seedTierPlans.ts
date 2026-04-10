/**
 * Seed Tier Plans
 *
 * Creates or updates the 7 tier plans in the database.
 * Usage: npx ts-node scripts/seedTierPlans.ts
 */

import mongoose from "mongoose";
import TierPlan from "../models/TierPlan";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";

const PLANS = [
  {
    slug: "free",
    name: "Free",
    category: "individual",
    priceMonthly: 0,
    priceYearly: 0,
    visibilityMultiplier: 0.85,
    maxAds: 1,
    maxImages: 5,
    maxVideos: 0,
    bumpCooldownHours: 4,
    boostDiscount: 0,
    features: ["1 active ad", "5 images", "Standard placement", "Basic support"],
    sortOrder: 0,
  },
  {
    slug: "standard",
    name: "Standard",
    category: "individual",
    priceMonthly: 9.99,
    priceYearly: 95.88,
    visibilityMultiplier: 1.0,
    maxAds: 3,
    maxImages: 10,
    maxVideos: 1,
    bumpCooldownHours: 2,
    boostDiscount: 0,
    features: ["3 active ads", "10 images per ad", "1 video per ad", "2h bump cooldown", "Email support"],
    sortOrder: 1,
  },
  {
    slug: "prime",
    name: "Prime",
    category: "individual",
    priceMonthly: 24.99,
    priceYearly: 239.88,
    visibilityMultiplier: 1.2,
    maxAds: 5,
    maxImages: 15,
    maxVideos: 3,
    bumpCooldownHours: 1,
    boostDiscount: 10,
    features: ["5 active ads", "15 images per ad", "3 videos per ad", "1h bump cooldown", "10% boost discount", "Priority support", "Growth Dashboard"],
    sortOrder: 2,
  },
  {
    slug: "spotlight",
    name: "Spotlight",
    category: "individual",
    priceMonthly: 49.99,
    priceYearly: 479.88,
    visibilityMultiplier: 1.45,
    maxAds: 10,
    maxImages: 20,
    maxVideos: 5,
    bumpCooldownHours: 0.5,
    boostDiscount: 20,
    features: ["10 active ads", "20 images per ad", "5 videos per ad", "30min bump cooldown", "20% boost discount", "Priority placement", "Growth Dashboard", "Dedicated support"],
    sortOrder: 3,
  },
  {
    slug: "agency_starter",
    name: "Agency Starter",
    category: "agency",
    priceMonthly: 49.99,
    priceYearly: 479.88,
    visibilityMultiplier: 1.1,
    maxAds: 10,
    maxImages: 10,
    maxVideos: 1,
    bumpCooldownHours: 2,
    boostDiscount: 5,
    features: ["10 active ads", "10 images per ad", "1 video per ad", "Agency badge", "5% boost discount", "Multi-user management"],
    sortOrder: 10,
  },
  {
    slug: "agency_pro",
    name: "Agency Pro",
    category: "agency",
    priceMonthly: 99.99,
    priceYearly: 959.88,
    visibilityMultiplier: 1.3,
    maxAds: 25,
    maxImages: 15,
    maxVideos: 3,
    bumpCooldownHours: 1,
    boostDiscount: 15,
    features: ["25 active ads", "15 images per ad", "3 videos per ad", "Agency badge", "15% boost discount", "Priority support", "Growth Dashboard", "Multi-user management"],
    sortOrder: 11,
  },
  {
    slug: "agency_elite",
    name: "Agency Elite",
    category: "agency",
    priceMonthly: 199.99,
    priceYearly: 1919.88,
    visibilityMultiplier: 1.5,
    maxAds: 50,
    maxImages: 20,
    maxVideos: 5,
    bumpCooldownHours: 0.5,
    boostDiscount: 25,
    features: ["50 active ads", "20 images per ad", "5 videos per ad", "Agency badge", "25% boost discount", "Dedicated account manager", "Growth Dashboard", "Multi-user management", "API access"],
    sortOrder: 12,
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  for (const plan of PLANS) {
    await TierPlan.findOneAndUpdate(
      { slug: plan.slug },
      { $set: plan },
      { upsert: true, new: true }
    );
    console.log(`  ✓ ${plan.name} (${plan.slug})`);
  }

  console.log(`\nSeeded ${PLANS.length} tier plans.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
