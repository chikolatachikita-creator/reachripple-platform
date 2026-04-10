const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reachripple-dev');
  const Ad = mongoose.connection.collection('ads');
  const now = new Date();
  
  // First, find Lady de and Premier
  const allAds = await Ad.find({ tier: 'SPOTLIGHT' }).project({ _id: 1, title: 1, qualityScore: 1, lastPulsedAt: 1 }).toArray();
  console.log('All SPOTLIGHT ads:');
  allAds.forEach(a => console.log(`  ${a.title} | id=${a._id} | qScore=${a.qualityScore} | pulsed=${a.lastPulsedAt}`));
  
  // Find by title pattern
  const ladyDe = await Ad.findOne({ title: /Lady de/i });
  const premier = await Ad.findOne({ title: /Premier.*Silk/i });
  
  if (ladyDe) {
    const r1 = await Ad.updateOne({ _id: ladyDe._id }, { $set: { lastPulsedAt: now } });
    console.log(`\nLady de (${ladyDe._id}) bump: ${r1.modifiedCount}`);
  } else {
    console.log('\nLady de NOT FOUND');
  }
  
  if (premier) {
    const r2 = await Ad.updateOne({ _id: premier._id }, { $set: { lastPulsedAt: new Date(now.getTime() - 1000) } });
    console.log(`Premier (${premier._id}) bump: ${r2.modifiedCount}`);
  } else {
    console.log('Premier NOT FOUND');
  }
  
  await mongoose.disconnect();
  console.log('\nDone');
}

run().catch(e => { console.error(e); process.exit(1); });
