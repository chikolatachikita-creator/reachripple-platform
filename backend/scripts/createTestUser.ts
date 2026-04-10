import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

(async () => {
  const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";
  await mongoose.connect(MONGO);

  // Check if user already exists
  const existing = await User.findOne({ email: "test@test.com" });
  if (existing) {
    console.log("Test user already exists!");
    process.exit();
  }

  const hashed = await bcrypt.hash("test123", 10);

  await User.create({
    name: "Test User",
    email: "test@test.com",
    password: hashed,
    role: "user",
    status: "active",
  });

  console.log("Test user created!");
  console.log("Email: test@test.com");
  console.log("Password: test123");
  process.exit();
})();
