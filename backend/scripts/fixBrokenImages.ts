/**
 * Fix Broken Images Script
 * Replaces /uploads/... paths (lost on Render ephemeral FS) with picsum placeholder images
 * Usage: npx ts-node scripts/fixBrokenImages.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

import Ad from "../models/Ad";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";

async function fixBrokenImages() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Find all ads with /uploads/ paths in images
  const ads = await Ad.find({
    images: { $regex: /^\/uploads\// },
    isDeleted: { $ne: true },
  });

  console.log(`Found ${ads.length} ads with broken /uploads/ images`);

  for (const ad of ads) {
    const brokenImages = (ad as any).images.filter((img: string) =>
      img.startsWith("/uploads/")
    );

    if (brokenImages.length === 0) continue;

    // Generate picsum placeholder images with unique seeds based on ad ID
    const idHash = (ad as any)._id.toString().slice(-4);
    const seedBase = parseInt(idHash, 16) % 1000;
    const newImages = brokenImages.map((_: string, i: number) =>
      `https://picsum.photos/seed/${seedBase + i}/500/600`
    );

    // Replace broken images with placeholders
    const updatedImages = (ad as any).images.map((img: string) => {
      if (img.startsWith("/uploads/")) {
        const idx = brokenImages.indexOf(img);
        return newImages[idx] ?? `https://picsum.photos/seed/${seedBase}/500/600`;
      }
      return img;
    });

    await Ad.updateOne({ _id: ad._id }, { $set: { images: updatedImages } });
    console.log(`  Fixed: ${(ad as any).title} (${brokenImages.length} images replaced)`);
  }

  console.log("\nDone!");
  await mongoose.disconnect();
}

fixBrokenImages().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
