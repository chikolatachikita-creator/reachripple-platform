#!/usr/bin/env node
/**
 * Quick test to verify MongoDB connection from your MONGO_URI
 * Usage: npm run test:mongo
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Error: MONGO_URI environment variable not set");
  console.log("Set it by:");
  console.log("  export MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db");
  process.exit(1);
}

console.log("🔌 Testing MongoDB connection...");
console.log(`📍 URI: ${MONGO_URI.substring(0, 50)}...`);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🗄️  Host: ${mongoose.connection.host}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:");
    console.error(err.message);
    if (err.message.includes("authentication failed")) {
      console.log("\n💡 Tip: Check your username/password in connection string");
    }
    if (err.message.includes("No suitable servers")) {
      console.log("\n💡 Tip: Check IP whitelist in MongoDB Atlas (allow all IPs)");
    }
    process.exit(1);
  });
