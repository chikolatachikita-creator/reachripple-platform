import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

(async () => {
  const email = process.argv[2] || process.env.RESET_EMAIL;
  const newPassword = process.argv[3] || process.env.RESET_PASSWORD;

  if (!email || !newPassword) {
    console.error("Usage: ts-node resetUserPassword.ts <email> <password>");
    console.error("  Or set RESET_EMAIL and RESET_PASSWORD env vars.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev");
  
  const User = mongoose.connection.collection("users");
  const hashed = await bcrypt.hash(newPassword, 10);
  
  const result = await User.updateOne(
    { email },
    { $set: { password: hashed } }
  );
  
  if (result.modifiedCount > 0) {
    console.log("Password reset successfully!");
    console.log("Email:", email);
  } else {
    console.log("User not found or password unchanged");
  }
  
  process.exit();
})();
