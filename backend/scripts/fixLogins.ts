import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";

// Users to reset
const TARGETS = [
  { email: "admin@reachripple.com", password: "password123" },
  { email: "nati@gmail.com", password: "password123" },
  { email: "johndoe@gmail.com", password: "password123" }
];

async function fixLogins() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    
    // Use collection directly to avoid model schema issues if any
    const User = mongoose.connection.collection("users");
    
    for (const target of TARGETS) {
      console.log(`Resetting password for ${target.email}...`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(target.password, 10);
      
      // Update
      const result = await User.updateOne(
        { email: target.email },
        { 
            $set: { 
                password: hashedPassword,
                status: "active",  // Ensure active
                isVerified: true   // Ensure verified
            } 
        }
      );
      
      if (result.matchedCount > 0) {
        console.log(`✅ Success! Login with: ${target.email} / ${target.password}`);
      } else {
        // Create if missing?
        console.log(`⚠️ User ${target.email} not found. Creating...`);
        await User.insertOne({
             name: target.email.split("@")[0],
             email: target.email,
             password: hashedPassword,
             role: target.email.includes("admin") ? "admin" : "user",
             status: "active",
             isVerified: true,
             createdAt: new Date(),
             updatedAt: new Date()
        });
        console.log(`✅ Created! Login with: ${target.email} / ${target.password}`);
      }
    }
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Done.");
  }
}

fixLogins();