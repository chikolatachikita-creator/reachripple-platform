import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

async function resetAdminPassword() {
  try {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const adminEmail = process.argv[2] || process.env.ADMIN_EMAIL || "admin@reachripple.com";
    const newPassword = process.argv[3] || process.env.RESET_PASSWORD;

    if (!newPassword) {
      console.error("Usage: ts-node resetAdminPassword.ts [email] <password>");
      console.error("  Or set RESET_PASSWORD env var.");
      process.exit(1);
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    const result = await User.findOneAndUpdate(
      { email: adminEmail },
      { 
        password: hashed, 
        role: "admin", 
        status: "active", 
        isVerified: true 
      },
      { new: true }
    );

    if (result) {
      console.log("\n✓ SUCCESS! Admin password reset:");
      console.log("  Email:", adminEmail);

      console.log("  Role:", result.role);
      console.log("\n  Login at: http://localhost:3000/admin");
    } else {
      console.log("✗ Admin not found. Creating new admin...");
      
      const admin = await User.create({
        name: "Admin",
        email: adminEmail,
        password: hashed,
        role: "admin",
        status: "active",
        isVerified: true,
      });
      
      console.log("\n✓ Admin created!");
      console.log("  Email:", adminEmail);

    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("✗ Error:", err);
    process.exit(1);
  }
}

resetAdminPassword();
