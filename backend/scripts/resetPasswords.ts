import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

(async () => {
  try {
    const newPassword = process.argv[2] || process.env.RESET_PASSWORD;

    if (!newPassword) {
      console.error("Usage: ts-node resetPasswords.ts <password>");
      console.error("  Or set RESET_PASSWORD env var.");
      process.exit(1);
    }

    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev"
    );

    const User = mongoose.connection.collection("users");
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Reset all known dev/test accounts
    const emails = ["test@test.com", "admin@reachripple.com"];
    for (const email of emails) {
      const result = await User.updateOne(
        { email },
        { $set: { password: hashedPassword } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✓ ${email} password reset`);
      } else {
        console.log(`- ${email} not found or unchanged`);
      }
    }

    console.log("\nDone. New password was set from CLI arg / env var.");

    process.exit(0);
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
