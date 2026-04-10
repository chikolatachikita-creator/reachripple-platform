import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/Ad';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reachripple-dev');
  
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const ads = await Ad.find({ status: 'approved' }).limit(19);
  
  if (ads.length < 10) {
    console.log('Not enough ads to demo tiers. Need at least 10 approved ads.');
    process.exit(1);
  }
  
  console.log(`\n🎯 Setting up ${ads.length} ads with Vivastreet-style tiers...\n`);
  
  // First 3 = FEATURED (VIP carousel)
  for (let i = 0; i < 3 && i < ads.length; i++) {
    await Ad.findByIdAndUpdate(ads[i]._id, {
      tier: 'FEATURED',
      tierUntil: sevenDaysFromNow,
      qualityScore: 80 + Math.floor(Math.random() * 20)
    });
    console.log(`✨ FEATURED: ${ads[i].title}`);
  }
  
  // Next 4 = PRIORITY_PLUS (Featured/Popular block)
  for (let i = 3; i < 7 && i < ads.length; i++) {
    await Ad.findByIdAndUpdate(ads[i]._id, {
      tier: 'PRIORITY_PLUS',
      tierUntil: sevenDaysFromNow,
      qualityScore: 60 + Math.floor(Math.random() * 20)
    });
    console.log(`⭐ PRIORITY_PLUS: ${ads[i].title}`);
  }
  
  // Next 4 = PRIORITY (Higher placement above standard)
  for (let i = 7; i < 11 && i < ads.length; i++) {
    await Ad.findByIdAndUpdate(ads[i]._id, {
      tier: 'PRIORITY',
      tierUntil: sevenDaysFromNow,
      qualityScore: 40 + Math.floor(Math.random() * 20)
    });
    console.log(`💖 PRIORITY: ${ads[i].title}`);
  }
  
  // Give 2 ads a paid NEW label (even if older than 48h)
  for (let i = 11; i < 13 && i < ads.length; i++) {
    await Ad.findByIdAndUpdate(ads[i]._id, {
      tier: 'STANDARD',
      hasNewLabel: true,
      newLabelUntil: sevenDaysFromNow,
      qualityScore: 30 + Math.floor(Math.random() * 20)
    });
    console.log(`🆕 PAID NEW LABEL: ${ads[i].title}`);
  }
  
  // Rest = STANDARD
  for (let i = 13; i < ads.length; i++) {
    await Ad.findByIdAndUpdate(ads[i]._id, {
      tier: 'STANDARD',
      tierUntil: null,
      qualityScore: 20 + Math.floor(Math.random() * 30)
    });
    console.log(`📄 STANDARD: ${ads[i].title}`);
  }
  
  console.log('\n✅ Demo tiers set up successfully!');
  console.log('\n📊 Summary:');
  console.log('   - FEATURED (VIP): 3 ads - top carousel');
  console.log('   - PRIORITY_PLUS (Featured): 4 ads - below VIP, above feed');
  console.log('   - PRIORITY (Highlight): 4 ads - visual pop in feed');
  console.log('   - STANDARD + Paid NEW: 2 ads - shows NEW even if older');
  console.log('   - STANDARD: rest - normal feed');
  console.log('\n🔄 Refresh the homepage to see the tiered layout!\n');
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
