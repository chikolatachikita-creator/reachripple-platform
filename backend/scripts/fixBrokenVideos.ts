import mongoose from "mongoose";
import Ad from "../models/Ad";

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://reachriple-app:Password1@reachripple.fmnurep.mongodb.net/reachripple?retryWrites=true&w=majority";

async function fix() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected");
  const ads = await Ad.find({ "videos.url": { $regex: "^/uploads/" } });
  console.log("Ads with broken videos:", ads.length);
  for (const ad of ads) {
    await Ad.updateOne({ _id: ad._id }, { $set: { videos: [] } });
    console.log("  Cleared videos for:", (ad as any).title || ad._id);
  }
  await mongoose.disconnect();
  console.log("Done");
}
fix().catch(console.error);
