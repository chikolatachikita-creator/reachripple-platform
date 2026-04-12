/**
 * Create and seed test profiles
 */
import mongoose from "mongoose";
import Ad from "./models/Ad";

const MONGO_URI = "mongodb+srv://reachriple-app:Password1@reachripple.fmnurep.mongodb.net/reachripple?retryWrites=true&w=majority&appName=reachripple";

async function seedData() {
  try {
    console.log("🔌 Connecting...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!");
    
    // Check if data exists
    const count = await Ad.countDocuments();
    console.log(`📊 Current profiles: ${count}`);
    
    if (count === 0) {
      console.log("📝 Creating test profiles...");
      
      const testProfiles = [
        {
          title: "Emma - London Companion",
          description: "Friendly and outgoing",
          postcode: "W1A 1AA",
          outcode: "W1A",
          district: "Westminster",
          districtSlug: "westminster",
          locationSlug: "london",
          price: 100,
          tier: "FEATURED",
          status: "active",
          isDeleted: false,
        },
        {
          title: "Sophie - Central London",
          description: "Professional and discrete",
          postcode: "EC1A 1BB",
          outcode: "EC1A",
          district: "City of London",
          districtSlug: "city-of-london",
          locationSlug: "london",
          price: 120,
          tier: "PRIORITY_PLUS",
          status: "active",
          isDeleted: false,
        },
        {
          title: "Jessica - West End",
          description: "Beautiful and charming",
          postcode: "W1D 4FA",
          outcode: "W1D",
          district: "Westminster",
          districtSlug: "westminster",
          locationSlug: "london",
          price: 150,
          tier: "PRIORITY",
          status: "active",
          isDeleted: false,
        },
      ];
      
      for (const profileData of testProfiles) {
        const newAd = new Ad(profileData);
        await newAd.save();
        console.log(`✅ Created: ${profileData.title}`);
      }
      
      console.log("🎉 Test data seeded successfully!");
    } else {
      console.log("✅ Database already has profiles");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

seedData();
