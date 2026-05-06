import mongoose from 'mongoose';
import Ad from '../models/Ad';
import User from '../models/User';

async function createTestProfile() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/reachripple-dev');
    console.log('✅ MongoDB connected');

    // Create or get test user
    let user = await User.findOne({ email: 'victoria@example.com' });
    
    if (!user) {
      user = await User.create({
        name: 'Victoria Grace',
        email: 'victoria@example.com',
        password: 'hashedpassword123',
        phone: '+447911123456',
        status: 'active',
        isVerified: true
      });
      console.log('✅ Created test user:', user._id);
    } else {
      console.log('✅ Using existing user:', user._id);
    }

    // Create test ad
    const testAd = await Ad.create({
      title: 'Victoria Grace',
      description: 'Premium companion with elegant sophistication. Discretion, charm, and unforgettable moments guaranteed. Available for dinner dates, events, and travel companionship. 24/7 availability with advance notice.',
      category: 'escorts',
      location: 'London, UK',
      price: 150,
      userId: user._id,
      phone: '+447911123456',
      age: 28,
      ethnicity: 'European',
      bodyType: 'Athletic',
      status: 'approved',
      isDeleted: false,
      
      // Images (using picsum placeholders — no third-party CDN dependency)
      images: [
        'https://picsum.photos/seed/reachripple-test-1/1400/1750',
        'https://picsum.photos/seed/reachripple-test-2/1400/1750',
        'https://picsum.photos/seed/reachripple-test-3/1400/1750',
        'https://picsum.photos/seed/reachripple-test-4/1400/1750'
      ],

      // Gallery with videos
      gallery: [
        { type: 'image', src: 'https://picsum.photos/seed/reachripple-test-1/1400/1750' },
        { type: 'image', src: 'https://picsum.photos/seed/reachripple-test-2/1400/1750' },
        { type: 'image', src: 'https://picsum.photos/seed/reachripple-test-3/1400/1750' },
        { type: 'image', src: 'https://picsum.photos/seed/reachripple-test-4/1400/1750' },
        { type: 'video', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }
      ],

      // Pricing tiers
      pricing: {
        price_15min: 80,
        price_30min: 120,
        price_1hour: 180,
        price_2hours: 300,
        price_3hours: 420,
        price_overnight: 1200
      },

      // Services offered
      selectedServices: [
        'Dinner Date',
        'Travel Companion',
        'Event Company',
        'Photography',
        'Conversation',
        'Companionship',
        'Shopping',
        'Social Events'
      ],

      // Profile fields
      profileFields: {
        location: 'London, Central',
        type: 'Independent',
        gender: 'Female',
        age: 28,
        ethnicity: 'European',
        languages: ['English', 'French', 'Spanish'],
        serviceFor: ['Men', 'Couples']
      },

      // Placement & bumping
      tier: 'FEATURED',
      tierUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      lastPulsedAt: new Date(),
      hasTapUp: false,
      qualityScore: 95,

      // Engagement
      views: 342,
      clicks: 87,

      // Activity
      lastActive: new Date(),
      isOnline: true
    });

    console.log('✅ Created test ad:', testAd._id);
    console.log('📍 Visit: http://localhost:3000/profile/' + testAd._id);

    await mongoose.disconnect();
    console.log('✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestProfile();
