import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

(async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev");
  
  const User = mongoose.connection.collection("users");
  const user = await User.findOne({ name: { $regex: "Mustafa", $options: "i" } });
  
  if (user) {
    console.log("Found user:");
    console.log("Name:", user.name);
    console.log("Email:", user.email);
    console.log("Role:", user.role || "N/A");
    console.log("Phone:", user.phone || "N/A");
    console.log("\nPassword is hashed and cannot be retrieved.");
    console.log("You can reset it if needed.");
  } else {
    console.log("User 'Mustafa' not found in database");
  }
  
  process.exit();
})();
