import mongoose from 'mongoose';
import '../models/Ad';

const Ad = mongoose.model('Ad');

async function checkAds() {
  try {
    await mongoose.connect('mongodb://localhost:27017/reachripple-dev');
    const count = await Ad.countDocuments({});
    console.log('Total ads in database:', count);
    
    const ads = await Ad.find({}).limit(3);
    console.log('\nSample ads:');
    ads.forEach(ad => {
      console.log(`- ${ad.title}`);
      console.log(`  Tier: ${ad.tier}`);
      console.log(`  Images: ${ad.images?.length || 0}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAds();
