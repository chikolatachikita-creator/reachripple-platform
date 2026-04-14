/**
 * Seed Sample Listings
 * 
 * Creates sample ads across non-adult categories so visitors can see
 * how listings look even before real users post content.
 * 
 * Usage: npx ts-node scripts/seedSampleListings.ts
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Ad from "../models/Ad";

const MONGO_URI = process.env.MONGO_URI || "";

const SAMPLE_LISTINGS = [
  // Jobs
  {
    title: "Full-Stack Developer Needed — Remote UK",
    description: "We're looking for an experienced full-stack developer to join our team. Must be proficient in React, Node.js and MongoDB. Fully remote position with flexible hours. Competitive salary £45-65k depending on experience.",
    category: "Jobs & Services",
    location: "London",
    locationSlug: "london",
    outcode: "EC1",
    price: 55000,
  },
  {
    title: "Barista Wanted — Part-Time, Central Manchester",
    description: "Friendly independent coffee shop looking for an experienced barista. 20-25 hours per week, weekends essential. Must have latte art skills and a positive attitude. £11.50/hr plus tips.",
    category: "Jobs & Services",
    location: "Manchester City Centre",
    locationSlug: "manchester",
    outcode: "M1",
    price: 0,
  },
  {
    title: "Qualified Electrician — Immediate Start",
    description: "Busy electrical contractor seeking qualified electrician for residential and commercial work across the South East. Must hold 18th Edition, ECS card and own transport. £200-280/day.",
    category: "Jobs & Services",
    location: "Brighton",
    locationSlug: "brighton",
    outcode: "BN1",
    price: 240,
  },

  // Buy & Sell
  {
    title: "iPhone 15 Pro Max 256GB — Mint Condition",
    description: "Selling my iPhone 15 Pro Max, Natural Titanium, 256GB. Purchased in January 2026. Always kept in case with screen protector. Battery health 98%. Original box and charger included. No scratches or dents.",
    category: "Buy & Sell",
    location: "Birmingham",
    locationSlug: "birmingham",
    outcode: "B1",
    price: 849,
  },
  {
    title: "IKEA Malm Double Bed Frame with Mattress",
    description: "White IKEA Malm double bed frame with Sultan mattress. Great condition, only 2 years old. Dismantled and ready for collection. Cash on collection only.",
    category: "Buy & Sell",
    location: "Leeds",
    locationSlug: "leeds",
    outcode: "LS1",
    price: 120,
  },
  {
    title: "Mountain Bike — Specialized Rockhopper 29\"",
    description: "2024 Specialized Rockhopper Comp 29. Shimano Deore groupset, Suntour fork. Size Large. Used for light trail riding only, no damage. Includes a bottle cage and mudguards.",
    category: "Buy & Sell",
    location: "Bristol",
    locationSlug: "bristol",
    outcode: "BS1",
    price: 475,
  },

  // Vehicles
  {
    title: "2021 VW Golf 1.5 TSI Style — Low Miles",
    description: "Volkswagen Golf 8 Style, 1.5 TSI 130bhp, manual. 22,000 miles, full VW service history. Moonstone Grey, LED headlights, adaptive cruise, sat nav, Apple CarPlay. MOT until March 2027. One owner from new.",
    category: "Vehicles",
    location: "Edinburgh",
    locationSlug: "edinburgh",
    outcode: "EH1",
    price: 18995,
  },
  {
    title: "Yamaha MT-07 2023 — A2 Licence Friendly",
    description: "Yamaha MT-07 with only 3,400 miles. A2 licence compatible with restrictor kit fitted. Midnight cyan colour. Akrapovic slip-on exhaust, tail tidy, bar-end mirrors. HPI clear.",
    category: "Vehicles",
    location: "Nottingham",
    locationSlug: "nottingham",
    outcode: "NG1",
    price: 6295,
  },

  // Property
  {
    title: "2 Bed Flat to Rent — Canary Wharf, E14",
    description: "Modern 2-bedroom apartment on the 12th floor with stunning Docklands views. Open-plan kitchen/living, two bathrooms, built-in wardrobes. Gym, concierge, underground parking included. Available 1st May. 12-month minimum tenancy.",
    category: "Property",
    location: "London",
    locationSlug: "london",
    outcode: "E14",
    price: 2200,
  },
  {
    title: "Double Room in Friendly Houseshare — Headingley",
    description: "Large double room available in a clean, friendly 4-bed houseshare. All bills included. Close to the university and Headingley high street. Furnished with bed, desk and wardrobe. Available immediately.",
    category: "Property",
    location: "Leeds",
    locationSlug: "leeds",
    outcode: "LS6",
    price: 550,
  },

  // Pets & Animals
  {
    title: "KC Registered Golden Retriever Puppies",
    description: "Beautiful litter of 7 Golden Retriever puppies. Mum and Dad both KC registered with excellent hip scores. Puppies are microchipped, first vaccinations, wormed and vet checked. Ready to leave from 20th April. Viewing welcome.",
    category: "Pets & Animals",
    location: "Devon",
    locationSlug: "devon",
    outcode: "EX1",
    price: 1200,
  },
  {
    title: "Bengal Kittens — TICA Registered",
    description: "Stunning Bengal kittens, 2 females and 1 male available. Brown spotted, very playful and well socialised. TICA registered, microchipped, neutered, vaccinated. Come with kitten pack and 4 weeks free insurance.",
    category: "Pets & Animals",
    location: "Surrey",
    locationSlug: "surrey",
    outcode: "GU1",
    price: 850,
  },

  // Community
  {
    title: "Volunteer Dog Walkers Needed — RSPCA Sheffield",
    description: "The RSPCA Sheffield branch is looking for volunteers to walk our rescue dogs on weekday mornings. No experience necessary — full training provided. Minimum commitment of one morning per week. Great exercise and rewarding work!",
    category: "Community",
    location: "Sheffield",
    locationSlug: "sheffield",
    outcode: "S1",
    price: 0,
  },
  {
    title: "Community Litter Pick — Victoria Park, Saturday",
    description: "Join our monthly community litter pick this Saturday at Victoria Park, 10am-12pm. All equipment provided. Meet at the main entrance. Families welcome! Refreshments afterwards at the community centre.",
    category: "Community",
    location: "London",
    locationSlug: "london",
    outcode: "E9",
    price: 0,
  },

  // Services
  {
    title: "Professional Painter & Decorator — Free Quotes",
    description: "Experienced painter and decorator offering high-quality interior and exterior work. Over 15 years experience. Fully insured. Specialising in period properties, wallpapering, and feature walls. Free no-obligation quotes. References available.",
    category: "Services",
    location: "Glasgow",
    locationSlug: "glasgow",
    outcode: "G1",
    price: 0,
  },

  // Classes
  {
    title: "Spanish for Beginners — 8-Week Evening Course",
    description: "Fun and friendly Spanish evening class, Tuesdays 7-8:30pm starting 5th May. Small groups (max 8 students). Qualified native teacher. No prior knowledge needed. Materials included. Central Cardiff location.",
    category: "Classes & Lessons",
    location: "Cardiff",
    locationSlug: "cardiff",
    outcode: "CF1",
    price: 120,
  },
];

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  // Check how many seed listings already exist
  const existing = await Ad.countDocuments({ title: { $in: SAMPLE_LISTINGS.map((l) => l.title) } });
  if (existing > 0) {
    console.log(`Found ${existing} existing seed listings. Skipping to avoid duplicates.`);
    await mongoose.disconnect();
    return;
  }

  const docs = SAMPLE_LISTINGS.map((listing) => ({
    ...listing,
    status: "approved",
    moderationStatus: "auto_approved",
    tier: "STANDARD",
    views: Math.floor(Math.random() * 200) + 20,
    clicks: Math.floor(Math.random() * 50) + 5,
    images: [],
    services: [],
    isDeleted: false,
    lastPulsedAt: new Date(),
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
  }));

  const result = await Ad.insertMany(docs);
  console.log(`Seeded ${result.length} sample listings across general categories.`);

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
