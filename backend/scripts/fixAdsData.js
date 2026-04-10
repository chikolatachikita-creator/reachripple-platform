const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fullstack');
  const Ad = mongoose.model('Ad', new mongoose.Schema({}, { strict: false, collection: 'ads' }));
  
  // 1. Boost "Lady de" to SPOTLIGHT
  const r1 = await Ad.updateOne(
    { _id: '697e2cb8ac6ff79b87d5c254' }, 
    { $set: { tier: 'SPOTLIGHT', boostTier: 'SPOTLIGHT', qualityScore: 95 } }
  );
  console.log('Lady de → SPOTLIGHT:', r1.modifiedCount ? 'OK' : 'already done');
  
  // 2. Boost "Premier The Silk Road" to SPOTLIGHT
  const r2 = await Ad.updateOne(
    { _id: '696226ad1e584c81679360d8' }, 
    { $set: { tier: 'SPOTLIGHT', boostTier: 'SPOTLIGHT', qualityScore: 92 } }
  );
  console.log('Premier → SPOTLIGHT:', r2.modifiedCount ? 'OK' : 'already done');
  
  // 3. Replace broken Unsplash images on seeded profiles with working placeholders
  const seededAds = await Ad.find({ images: { $elemMatch: { $regex: 'unsplash' } } });
  console.log('Seeded ads with broken Unsplash images:', seededAds.length);
  
  for (const ad of seededAds) {
    const seed = parseInt(ad._id.toString().slice(-4), 16) % 1000;
    const newImages = [
      `https://picsum.photos/seed/${seed}/500/600`,
      `https://picsum.photos/seed/${seed + 1}/500/600`,
    ];
    await Ad.updateOne({ _id: ad._id }, { $set: { images: newImages } });
    console.log('  Fixed:', ad.title);
  }
  
  // 4. Verify final state
  const allAds = await Ad.find({ status: 'approved' }).select('title tier images videos').lean();
  console.log('\n=== Final State ===');
  allAds.forEach(a => {
    console.log(`${a.tier || 'STANDARD'} | ${a.title} | imgs:${(a.images||[]).length} vids:${(a.videos||[]).length}`);
  });
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

run().catch(e => { console.error(e); process.exit(1); });
