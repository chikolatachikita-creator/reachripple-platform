import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

(async () => {
  const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";
  await mongoose.connect(MONGO);

  const admin = await User.findOne({ email: "admin@reachripple.com" });
  console.log("Admin found:", admin ? "Yes" : "No");
  
  if (admin) {
    console.log("Email:", admin.email);
    const hashed = await bcrypt.hash("Admin123!", 10);
    admin.password = hashed;
    admin.role = "admin";
    await admin.save();
    console.log("Password reset to: Admin123!");
  } else {
    // Create new admin
    const hashed = await bcrypt.hash("Admin123!", 10);
    await User.create({
      name: "Admin",
      email: "admin@reachripple.com",
      password: hashed,
      role: "admin",
      status: "active",
    });
    console.log("Admin created with password: Admin123!");
  }

  process.exit();
})();
