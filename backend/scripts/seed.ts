/**
 * Comprehensive Seed Script
 * Generates users, ads, and reports for development/testing
 * Usage: npx ts-node scripts/seed.ts
 * 
 * Creates:
 * - 1 admin user
 * - 20 regular users  
 * - 40 ads (2 per user) across all statuses
 * - 10 reports
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

import User from "../models/User";
import Ad from "../models/Ad";
import Report from "../models/Report";
import Setting from "../models/Setting";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";

// ===== SEED DATA =====

const FIRST_NAMES = [
  "Sophia", "Isabella", "Emma", "Jasmine", "Olivia",
  "Ava", "Mia", "Luna", "Chloe", "Amelia",
  "Charlotte", "Harper", "Aria", "Ella", "Grace",
  "Victoria", "Natasha", "Elena", "Lily", "Zara",
];

const LOCATIONS = [
  "London", "Manchester", "Birmingham", "Leeds", "Liverpool",
  "Bristol", "Edinburgh", "Glasgow", "Cardiff", "Newcastle",
  "Brighton", "Oxford", "Cambridge", "Nottingham", "Sheffield",
  "Southampton", "Reading", "Leicester", "Coventry", "Belfast",
];

const OUTCODES = [
  "W1", "SW1", "EC1", "N1", "E1",
  "M1", "B1", "LS1", "L1", "BS1",
  "EH1", "G1", "CF1", "NE1", "BN1",
  "OX1", "CB1", "NG1", "S1", "SO1",
];

const ETHNICITIES = ["European", "Asian", "Latin", "African", "Middle Eastern", "British", "Mixed"];
const BODY_TYPES = ["Slim", "Athletic", "Curvy", "Petite", "Average"];
const SERVICES = [
  "Dinner Date", "Travel Companion", "Private Events", "Entertainment",
  "Social Events", "Shopping Companion", "Tour Guide", "Business Events",
];
const TIERS = ["STANDARD", "STANDARD", "STANDARD", "PRIORITY", "PRIORITY_PLUS", "FEATURED"] as const;
const STATUSES = ["approved", "approved", "approved", "approved", "pending", "rejected"] as const;

const DESCRIPTIONS = [
  "Professional and sophisticated companion. Available for upscale events and private meetings.",
  "Warm, friendly personality with great conversation skills. Perfect for social occasions.",
  "Elegant and charming. Experienced in providing memorable companionship experiences.",
  "Fun-loving and adventurous. Great for exploring the city and nightlife.",
  "Cultured and well-traveled. Fluent in multiple languages.",
  "Genuine and down-to-earth personality. Easy to connect with.",
  "Stylish and fashionable. Ideal companion for high-end events.",
  "Passionate about life and meeting new people. Always brings positive energy.",
];

const REPORT_REASONS = [
  "Suspicious profile - images appear to be stolen from another website",
  "Contact information seems fake or invalid",
  "Profile description contains inappropriate content",
  "Suspected scam - asked for upfront payment before meeting",
  "Multiple profiles from same person under different names",
  "Underage content suspected",
  "Harassment in private messages",
  "Misleading location information - claims to be local but is not",
  "Profile appears to be advertising illegal services",
  "Spam - repetitive posting of same content",
];

async function seed() {
  console.log("🌱 Starting seed process...\n");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("📦 Connected to MongoDB\n");

    // ===== 1. CREATE ADMIN USER =====
    console.log("👑 Creating admin user...");
    const adminPassword = await bcrypt.hash("Admin123!", 12);
    const admin = await User.findOneAndUpdate(
      { email: "admin@reachripple.com" },
      {
        name: "Platform Admin",
        email: "admin@reachripple.com",
        password: adminPassword,
        role: "admin",
        status: "active",
        isVerified: true,
        accountType: "independent",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✅ Admin: admin@reachripple.com / Admin123!\n`);

    // ===== 2. CREATE REGULAR USERS =====
    console.log("👥 Creating 20 users...");
    const userPassword = await bcrypt.hash("User123!", 12);
    const users: any[] = [];

    for (let i = 0; i < 20; i++) {
      const name = FIRST_NAMES[i];
      const email = `${name.toLowerCase()}@example.com`;

      const user = await User.findOneAndUpdate(
        { email },
        {
          name,
          email,
          password: userPassword,
          role: "user",
          status: i < 18 ? "active" : "suspended",
          isVerified: i < 15,
          accountType: i < 16 ? "independent" : "agency",
          phone: `07${String(Math.floor(Math.random() * 900000000) + 100000000)}`,
          lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          ...(i >= 16 ? {
            agencyDetails: {
              companyName: `${name}'s Agency Ltd`,
              website: `https://www.${name.toLowerCase()}agency.co.uk`,
            },
          } : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      users.push(user);
    }
    console.log(`   ✅ Created ${users.length} users (password: User123!)\n`);

    // ===== 3. CREATE ADS =====
    console.log("📋 Creating 40 ads (2 per user)...");
    const ads: any[] = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const location = LOCATIONS[i % LOCATIONS.length];
      const outcode = OUTCODES[i % OUTCODES.length];

      for (let j = 0; j < 2; j++) {
        const adIndex = i * 2 + j;
        const status = STATUSES[adIndex % STATUSES.length];
        const tier = status === "approved" ? TIERS[adIndex % TIERS.length] : "STANDARD";
        const age = 21 + Math.floor(Math.random() * 15);

        const ad = await Ad.findOneAndUpdate(
          { title: `${user.name} - ${j === 0 ? "Premium Experience" : "Luxury Companion"}`, userId: user._id },
          {
            title: `${user.name} - ${j === 0 ? "Premium Experience" : "Luxury Companion"}`,
            description: DESCRIPTIONS[adIndex % DESCRIPTIONS.length],
            category: "escort",
            location,
            outcode,
            district: location,
            districtSlug: location.toLowerCase().replace(/\s+/g, "-"),
            locationSlug: location.toLowerCase().replace(/\s+/g, "-"),
            categorySlug: "escort",
            price: 100 + Math.floor(Math.random() * 300),
            age,
            ethnicity: ETHNICITIES[adIndex % ETHNICITIES.length],
            bodyType: BODY_TYPES[adIndex % BODY_TYPES.length],
            images: [
              `https://picsum.photos/seed/${adIndex + 1}/400/500`,
              `https://picsum.photos/seed/${adIndex + 100}/400/500`,
            ],
            services: SERVICES.slice(0, 2 + Math.floor(Math.random() * 4)),
            status,
            tier,
            tierUntil: tier !== "STANDARD" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
            userId: user._id,
            phone: user.phone,
            email: user.email,
            isDeleted: false,
            views: Math.floor(Math.random() * 500),
            clicks: Math.floor(Math.random() * 100),
            qualityScore: 40 + Math.floor(Math.random() * 60),
            lastPulsedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            profileFields: {
              type: user.accountType === "agency" ? "Agency" : "Independent",
              gender: "Female",
              age,
              ethnicity: ETHNICITIES[adIndex % ETHNICITIES.length],
              incall: Math.random() > 0.3,
              outcall: Math.random() > 0.5,
              serviceFor: ["Men"],
            },
            pricing: {
              price_30min: String(80 + Math.floor(Math.random() * 120)),
              price_1hour: String(150 + Math.floor(Math.random() * 200)),
              price_2hours: String(280 + Math.floor(Math.random() * 300)),
            },
            ...(status === "rejected" ? { rejectionReason: "Profile does not meet community guidelines" } : {}),
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        ads.push(ad);
      }
    }

    const statusBreakdown = {
      approved: ads.filter(a => a.status === "approved").length,
      pending: ads.filter(a => a.status === "pending").length,
      rejected: ads.filter(a => a.status === "rejected").length,
    };
    console.log(`   ✅ Created ${ads.length} ads (${statusBreakdown.approved} approved, ${statusBreakdown.pending} pending, ${statusBreakdown.rejected} rejected)\n`);

    // ===== 4. CREATE REPORTS =====
    console.log("🚩 Creating 10 reports...");
    const approvedAds = ads.filter(a => a.status === "approved");

    for (let i = 0; i < 10; i++) {
      const targetAd = approvedAds[i % approvedAds.length];
      const reporter = users[(i + 5) % users.length]; // Different user reports

      await Report.findOneAndUpdate(
        { adId: targetAd._id, reporterId: reporter._id },
        {
          adId: targetAd._id,
          reporterId: reporter._id,
          reason: REPORT_REASONS[i % REPORT_REASONS.length],
          status: i < 6 ? "pending" : i < 8 ? "reviewed" : "dismissed",
          description: REPORT_REASONS[i % REPORT_REASONS.length],
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`   ✅ Created 10 reports (6 pending, 2 reviewed, 2 dismissed)\n`);

    // ===== 5. SEED DEFAULT PRICING SETTINGS =====
    console.log("💰 Seeding default pricing settings...");
    const pricingDefaults = [
      { key: "pricing_ad_post_free", value: "0", description: "Free tier ad posting price" },
      { key: "pricing_ad_post_basic", value: "9.99", description: "Basic plan ad posting price" },
      { key: "pricing_ad_post_premium", value: "19.99", description: "Premium plan ad posting price" },
      { key: "pricing_feature_featured", value: "29.99", description: "Featured listing price (£29.99/week)" },
      { key: "pricing_feature_priority_plus", value: "16.99", description: "Priority Plus placement price (£16.99/week)" },
      { key: "pricing_feature_priority", value: "9.99", description: "Priority listing price (£9.99/week)" },
      { key: "pricing_feature_tap_up", value: "1.99", description: "Tap-up bump price" },
      { key: "pricing_feature_new_label", value: "3.99", description: "New label price" },
      { key: "pricing_feature_website_link", value: "5.99", description: "Website link price" },
      { key: "pricing_subscription_basic", value: "29.99", description: "Basic monthly subscription" },
      { key: "pricing_subscription_premium", value: "49.99", description: "Premium monthly subscription" },
      { key: "payment_gateway", value: "stripe", description: "Payment gateway provider" },
      { key: "payment_currency", value: "USD", description: "Default currency" },
      { key: "payment_enabled", value: "false", description: "Whether payments are live" },
    ];

    for (const setting of pricingDefaults) {
      await Setting.findOneAndUpdate(
        { key: setting.key },
        { key: setting.key, value: setting.value },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`   ✅ Seeded ${pricingDefaults.length} pricing/payment settings\n`);

    // ===== SUMMARY =====
    console.log("═══════════════════════════════════════");
    console.log("   🎉 SEED COMPLETE!");
    console.log("═══════════════════════════════════════");
    console.log(`   Admin:    admin@reachripple.com / Admin123!`);
    console.log(`   Users:    20 (password: User123!)`);
    console.log(`   Ads:      ${ads.length} (${statusBreakdown.approved} approved)`);
    console.log(`   Reports:  10`);
    console.log(`   Settings: ${pricingDefaults.length} pricing defaults`);
    console.log("═══════════════════════════════════════\n");

  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("📦 Disconnected from MongoDB");
  }
}

seed();
