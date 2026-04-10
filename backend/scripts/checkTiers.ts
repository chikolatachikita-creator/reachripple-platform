import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/Ad';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reachripple-dev');
  
  // Count by tier
  const tierCounts = await Ad.aggregate([
    { $group: { _id: '$tier', count: { $sum: 1 } } }
  ]);
  console.log('\n📊 Tier Distribution:');
  tierCounts.forEach(t => console.log(`   ${t._id || 'null'}: ${t.count}`));
  
  // Sample ads
  const sample = await Ad.find({ status: 'approved' })
    .limit(5)
    .select('title tier tierUntil hasNewLabel createdAt');
  console.log('\n📝 Sample Ads:');
  sample.forEach(ad => {
    console.log(`   - ${ad.title}`);
    console.log(`     tier: ${ad.tier}, tierUntil: ${ad.tierUntil || 'none'}`);
    console.log(`     hasNewLabel: ${ad.hasNewLabel || false}`);
  });
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
