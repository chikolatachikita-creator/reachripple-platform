/**
 * Seed Script: Populate database with mock escort profiles
 * Usage: npx ts-node scripts/seedProfiles.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import '../models/User';
import '../models/Ad';

const Ad = mongoose.model('Ad');

const MOCK_PROFILES = [
  {
    title: "Sophia - Professional Companion",
    description: "Sophisticated and elegant companion for professional events and private meetings. Fluent in multiple languages.",
    age: 24,
    location: "West London",
    ethnicity: "European",
    bodyType: "Slim",
    images: [
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=400&fit=crop"
    ],
    price: 150,
    services: ["Dinner Date", "Travel Companion"],
    tier: "PRIORITY_PLUS",
    category: "escort",
    status: "approved"
  },
  {
    title: "Isabella - Luxury Experience",
    description: "Premium luxury companion. Discreet, professional, and passionate. Available for upscale experiences.",
    age: 26,
    location: "Mayfair",
    ethnicity: "Latin",
    bodyType: "Curvy",
    images: [
      "https://images.unsplash.com/photo-1517841905240-74decceecfda?w=500&h=400&fit=crop"
    ],
    price: 200,
    services: ["Dinner Date", "Private Events"],
    tier: "FEATURED",
    category: "escort",
    status: "approved"
  },
  {
    title: "Emma - Friendly & Fun",
    description: "Bubbly, friendly personality. Perfect for casual outings, dinners, and entertainment.",
    age: 23,
    location: "South London",
    ethnicity: "British",
    bodyType: "Athletic",
    images: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=400&fit=crop"
    ],
    price: 120,
    services: ["Dinner Date", "Entertainment"],
    tier: "STANDARD",
    category: "escort",
    status: "approved"
  },
  {
    title: "Jasmine - Exotic Beauty",
    description: "Stunning exotic beauty with warm personality. Experienced in providing memorable companionship.",
    age: 25,
    location: "East London",
    ethnicity: "Asian",
    bodyType: "Slim",
    images: [
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=400&fit=crop"
    ],
    price: 140,
    services: ["Dinner Date", "Travel Companion", "Entertainment"],
    tier: "PRIORITY_PLUS",
    category: "escort",
    status: "approved"
  },
  {
    title: "Victoria - Premium VIP",
    description: "Exclusive VIP companion for discerning clients. Sophisticated, intelligent, and captivating.",
    age: 27,
    location: "Knightsbridge",
    ethnicity: "Russian",
    bodyType: "Curvy",
    images: [
      "https://images.unsplash.com/photo-1520813792240-267b3dee01f5?w=500&h=400&fit=crop"
    ],
    price: 250,
    services: ["Dinner Date", "Private Events", "Travel Companion"],
    tier: "FEATURED",
    category: "escort",
    status: "approved"
  },
  {
    title: "Natasha - Charming Companion",
    description: "Charming and witty companion. Excellent conversationalist with knowledge of culture and current affairs.",
    age: 24,
    location: "North London",
    ethnicity: "Eastern European",
    bodyType: "Slim",
    images: [
      "https://images.unsplash.com/photo-1534528741775-53a8c3fbd625?w=500&h=400&fit=crop"
    ],
    price: 130,
    services: ["Dinner Date", "Entertainment"],
    tier: "STANDARD",
    category: "escort",
    status: "approved"
  },
  {
    title: "Amelia - Elegant & Refined",
    description: "Elegant and refined companion for upscale events. Impeccable manners and sophisticated style.",
    age: 28,
    location: "Chelsea",
    ethnicity: "British",
    bodyType: "Slim",
    images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=500&h=400&fit=crop"
    ],
    price: 160,
    services: ["Dinner Date", "Private Events", "Entertainment"],
    tier: "PRIORITY_PLUS",
    category: "escort",
    status: "approved"
  },
  {
    title: "Luna - Passionate & Playful",
    description: "Passionate and playful personality. Great sense of humor and love for adventure.",
    age: 22,
    location: "Soho",
    ethnicity: "Mixed",
    bodyType: "Athletic",
    images: [
      "https://images.unsplash.com/photo-1514888286974-6c03bf1a9dfe?w=500&h=400&fit=crop"
    ],
    price: 110,
    services: ["Dinner Date", "Entertainment"],
    tier: "STANDARD",
    category: "escort",
    status: "approved"
  },
  {
    title: "Angelica - Luxury Selection",
    description: "Exclusive luxury selection. Premium experience with attention to every detail.",
    age: 26,
    location: "Belgravia",
    ethnicity: "Italian",
    bodyType: "Curvy",
    images: [
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=400&fit=crop"
    ],
    price: 180,
    services: ["Dinner Date", "Private Events", "Travel Companion"],
    tier: "FEATURED",
    category: "escort",
    status: "approved"
  },
  {
    title: "Serena - Relaxed & Easy-going",
    description: "Relaxed and easy-going companion. Perfect for casual fun and genuine connection.",
    age: 25,
    location: "Camden",
    ethnicity: "Caribbean",
    bodyType: "Athletic",
    images: [
      "https://images.unsplash.com/photo-1507746781348-f2e470d2b149?w=500&h=400&fit=crop"
    ],
    price: 125,
    services: ["Dinner Date", "Entertainment"],
    tier: "STANDARD",
    category: "escort",
    status: "approved"
  },
  {
    title: "Bianca - Stunning Appearance",
    description: "Stunning appearance with infectious energy. Creates unforgettable experiences.",
    age: 23,
    location: "Notting Hill",
    ethnicity: "Brazilian",
    bodyType: "Curvy",
    images: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=400&fit=crop"
    ],
    price: 135,
    services: ["Dinner Date", "Entertainment"],
    tier: "PRIORITY_PLUS",
    category: "escort",
    status: "approved"
  },
  {
    title: "Zara - Elite Companion",
    description: "Elite companion with international experience. Sophisticated and worldly.",
    age: 29,
    location: "Fitzrovia",
    ethnicity: "French",
    bodyType: "Slim",
    images: [
      "https://images.unsplash.com/photo-1506869545544-40c1a45f2b5f?w=500&h=400&fit=crop"
    ],
    price: 220,
    services: ["Dinner Date", "Private Events", "Travel Companion"],
    tier: "FEATURED",
    category: "escort",
    status: "approved"
  }
];

async function seedProfiles() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/reachripple-dev';
    
    console.log('🌱 Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing seeded ads only (keep user-created ads)
    // await Ad.deleteMany({ userId: { $exists: false } });
    // console.log('🗑️  Cleared existing seeded ads');

    console.log(`\n📝 Seeding ${MOCK_PROFILES.length} profiles...`);
    
    const created = await Ad.insertMany(
      MOCK_PROFILES.map(profile => ({
        ...profile,
        qualityScore: 85,
        views: Math.floor(Math.random() * 500) + 50,
        clicks: Math.floor(Math.random() * 100) + 10,
        isDeleted: false,
        lastPulsedAt: new Date(),
        hasTapUp: profile.tier === 'FEATURED',
        tapUpIntervalHours: 6,
        profileFields: {
          location: profile.location,
          gender: 'Female',
          age: profile.age,
          ethnicity: profile.ethnicity,
          languages: ['English'],
          serviceFor: ['Men', 'Couples'],
          incall: Math.random() > 0.3,
          outcall: Math.random() > 0.4,
          travelRadius: profile.tier === 'FEATURED' ? '25 miles' : '10 miles',
        }
      }))
    );

    console.log(`✅ Successfully created ${created.length} profiles!\n`);
    
    // Show summary
    console.log('📊 Profile Summary:');
    console.log(`   FEATURED: ${MOCK_PROFILES.filter(p => p.tier === 'FEATURED').length}`);
    console.log(`   PRIORITY_PLUS: ${MOCK_PROFILES.filter(p => p.tier === 'PRIORITY_PLUS').length}`);
    console.log(`   STANDARD: ${MOCK_PROFILES.filter(p => p.tier === 'STANDARD').length}`);
    console.log('\n🎉 All done!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding profiles:', error);
    process.exit(1);
  }
}

seedProfiles();
