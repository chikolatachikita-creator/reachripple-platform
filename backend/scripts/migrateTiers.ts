/**
 * Migration Script: Update old tier values in ads collection
 * 
 * Maps legacy tier names to current placement tier names:
 *   SPOTLIGHT → FEATURED
 *   PRIME     → PRIORITY_PLUS
 *   VIP       → FEATURED
 *   GLOW      → PRIORITY
 * 
 * Also fixes any lowercase variants.
 * 
 * Usage: npx ts-node scripts/migrateTiers.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/escort-platform";

const TIER_MAPPING: Record<string, string> = {
  SPOTLIGHT: "FEATURED",
  PRIME: "PRIORITY_PLUS",
  VIP: "FEATURED",
  GLOW: "PRIORITY",
  // Lowercase variants
  spotlight: "FEATURED",
  prime: "PRIORITY_PLUS",
  vip: "FEATURED",
  glow: "PRIORITY",
};

async function migrateTiers() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;
  if (!db) {
    console.error("Failed to get database connection");
    process.exit(1);
  }

  const adsCollection = db.collection("ads");

  // Find all ads with old tier values
  const oldTierValues = Object.keys(TIER_MAPPING);
  const adsWithOldTiers = await adsCollection
    .find({ tier: { $in: oldTierValues } })
    .toArray();

  console.log(`Found ${adsWithOldTiers.length} ads with old tier values.`);

  if (adsWithOldTiers.length === 0) {
    console.log("No migration needed. All tier values are current.");
    await mongoose.disconnect();
    return;
  }

  // Show breakdown
  const breakdown: Record<string, number> = {};
  for (const ad of adsWithOldTiers) {
    const oldTier = ad.tier as string;
    breakdown[oldTier] = (breakdown[oldTier] || 0) + 1;
  }
  console.log("Breakdown of old tiers:", breakdown);

  // Perform batch updates for each old tier value
  let totalUpdated = 0;
  for (const [oldTier, newTier] of Object.entries(TIER_MAPPING)) {
    const result = await adsCollection.updateMany(
      { tier: oldTier },
      { $set: { tier: newTier } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  ${oldTier} → ${newTier}: ${result.modifiedCount} ads updated`);
      totalUpdated += result.modifiedCount;
    }
  }

  console.log(`\nMigration complete. ${totalUpdated} ads updated.`);

  // Verify no old tiers remain
  const remaining = await adsCollection.countDocuments({
    tier: { $in: oldTierValues },
  });
  if (remaining === 0) {
    console.log("Verification: All tier values are now valid.");
  } else {
    console.error(`WARNING: ${remaining} ads still have old tier values!`);
  }

  // Show current tier distribution
  const distribution = await adsCollection
    .aggregate([
      { $group: { _id: "$tier", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();
  console.log("\nCurrent tier distribution:");
  for (const entry of distribution) {
    console.log(`  ${entry._id}: ${entry.count}`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

migrateTiers().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
