import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

(async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev"
    );

    const User = mongoose.connection.collection("users");
    const users = await User.find({}).toArray();

    console.log("\n=== USERS IN DATABASE ===");
    if (users.length === 0) {
      console.log("No users found. You need to create an account first.");
    } else {
      console.log(`Total: ${users.length} user(s)\n`);
      users.forEach((user: any, i: number) => {
        console.log(`${i + 1}. Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role || "user"}`);
        console.log(`   Status: ${user.status || "active"}`);
        console.log("");
      });
    }

    process.exit(0);
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
