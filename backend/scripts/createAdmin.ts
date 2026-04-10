import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

(async () => {
  const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";
  await mongoose.connect(MONGO);

  const hashed = await bcrypt.hash("Admin123!", 10);

  await User.create({
    name: "Admin",
    email: "admin@reachripple.com",
    password: hashed,
    role: "admin",
    status: "active",
  });

  console.log("Admin created!");
  process.exit();
})();
