import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Ad from "../models/Ad";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/reachripple-dev";

// ─── Bot user profiles ───────────────────────────────────────────
const botUsers = [
  { name: "Sophia Belle", email: "sophia.belle@demo.test" },
  { name: "Emma Rose", email: "emma.rose@demo.test" },
  { name: "Isabella Luxe", email: "isabella.luxe@demo.test" },
  { name: "Mia Diamond", email: "mia.diamond@demo.test" },
  { name: "Charlotte Reign", email: "charlotte.reign@demo.test" },
  { name: "Ava Sterling", email: "ava.sterling@demo.test" },
  { name: "Luna Star", email: "luna.star@demo.test" },
  { name: "Zara Voss", email: "zara.voss@demo.test" },
  { name: "Layla Monroe", email: "layla.monroe@demo.test" },
  { name: "Elena Hart", email: "elena.hart@demo.test" },
  { name: "Victoria Chase", email: "victoria.chase@demo.test" },
  { name: "Nadia Pearl", email: "nadia.pearl@demo.test" },
  { name: "Sienna Blaze", email: "sienna.blaze@demo.test" },
  { name: "Anastasia Noir", email: "anastasia.noir@demo.test" },
  { name: "Jade Rivers", email: "jade.rivers@demo.test" },
  { name: "Ruby Fox", email: "ruby.fox@demo.test" },
  { name: "Marco Vitale", email: "marco.vitale@demo.test" },
  { name: "Kai Tanaka", email: "kai.tanaka@demo.test" },
  { name: "Dani Blake", email: "dani.blake@demo.test" },
  { name: "Sasha Petrova", email: "sasha.petrova@demo.test" },
  { name: "Priya Sharma", email: "priya.sharma@demo.test" },
  { name: "Camille Laurent", email: "camille.laurent@demo.test" },
  { name: "Aria Fontaine", email: "aria.fontaine@demo.test" },
  { name: "Valentina Cruz", email: "valentina.cruz@demo.test" },
  { name: "Naomi West", email: "naomi.west@demo.test" },
];

// ─── UK locations with outcodes ──────────────────────────────────
const locations = [
  { location: "Central London", outcode: "W1", district: "Westminster", slug: "w1-westminster" },
  { location: "Mayfair", outcode: "W1K", district: "Westminster", slug: "w1k-mayfair" },
  { location: "Knightsbridge", outcode: "SW1X", district: "Knightsbridge", slug: "sw1x-knightsbridge" },
  { location: "Chelsea", outcode: "SW3", district: "Chelsea", slug: "sw3-chelsea" },
  { location: "Soho", outcode: "W1D", district: "Soho", slug: "w1d-soho" },
  { location: "Kensington", outcode: "W8", district: "Kensington", slug: "w8-kensington" },
  { location: "Notting Hill", outcode: "W11", district: "Notting Hill", slug: "w11-notting-hill" },
  { location: "Canary Wharf", outcode: "E14", district: "Tower Hamlets", slug: "e14-canary-wharf" },
  { location: "Manchester City Centre", outcode: "M1", district: "Manchester", slug: "m1-manchester" },
  { location: "Birmingham City Centre", outcode: "B1", district: "Birmingham", slug: "b1-birmingham" },
  { location: "Leeds City Centre", outcode: "LS1", district: "Leeds", slug: "ls1-leeds" },
  { location: "Edinburgh New Town", outcode: "EH1", district: "Edinburgh", slug: "eh1-edinburgh" },
  { location: "Bristol Harbourside", outcode: "BS1", district: "Bristol", slug: "bs1-bristol" },
  { location: "Liverpool City Centre", outcode: "L1", district: "Liverpool", slug: "l1-liverpool" },
  { location: "Glasgow City Centre", outcode: "G1", district: "Glasgow", slug: "g1-glasgow" },
  { location: "Brighton Centre", outcode: "BN1", district: "Brighton", slug: "bn1-brighton" },
  { location: "Cardiff Bay", outcode: "CF10", district: "Cardiff", slug: "cf10-cardiff" },
  { location: "Nottingham City Centre", outcode: "NG1", district: "Nottingham", slug: "ng1-nottingham" },
  { location: "Bath City Centre", outcode: "BA1", district: "Bath", slug: "ba1-bath" },
  { location: "Oxford City Centre", outcode: "OX1", district: "Oxford", slug: "ox1-oxford" },
];

const ethnicities = ["European", "Latin", "Brazilian", "Asian", "Middle Eastern", "African", "Indian", "Mixed", "Caribbean", "Mediterranean"];
const bodyTypes = ["Slim", "Athletic", "Curvy", "Petite", "Average", "Hourglass"];
const genders = ["Female", "Female", "Female", "Female", "Male", "Trans"]; // weighted distribution
const languages = ["English", "French", "Spanish", "Portuguese", "Italian", "Romanian", "Russian", "Arabic", "Polish", "German", "Japanese", "Hindi"];
const serviceForOptions = [["Men"], ["Men", "Couples"], ["Men", "Women"], ["Men", "Women", "Couples"], ["Women"], ["Couples"]];
const travelRadii = ["5 miles", "10 miles", "15 miles", "20 miles", "25 miles", "City-wide"];

const allServices = [
  "Dinner Companion", "Events", "Travel Companion", "GFE", "Photography",
  "Massage", "BDSM", "Role Play", "Webcam", "Couples", "Tantric",
  "Overnight", "Weekend", "City Tours", "Social Events", "Party Companion",
];

const categories = ["escort", "escort", "escort", "escort", "Massage", "BDSM"]; // weighted

const tiers: Array<"STANDARD" | "PRIORITY" | "PRIORITY_PLUS" | "FEATURED"> = ["STANDARD", "STANDARD", "STANDARD", "STANDARD", "PRIORITY", "PRIORITY", "PRIORITY_PLUS", "FEATURED"];

// ─── Ad descriptions (diverse & safe) ────────────────────────────
const descriptions = [
  "Refined and elegant, I bring warmth and sophistication to every encounter. Whether it's a dinner date, social event, or a quiet evening, I ensure an unforgettable experience tailored to your desires.",
  "A captivating presence with a genuine love for connection. I pride myself on creating a relaxed and enjoyable atmosphere. Educated, well-travelled, and always impeccably presented.",
  "Natural beauty with an adventurous spirit. I offer companionship that goes beyond the ordinary. Fluent in multiple languages and comfortable in any setting, from five-star restaurants to cosy evenings.",
  "Sensual and sophisticated, I am the perfect companion for discerning gentlemen. My warm personality and striking looks make every moment special. Available for both incall and outcall appointments.",
  "Fun-loving and down to earth with a passion for great conversation. Whether you need a date for a corporate event or a relaxing evening, I adapt effortlessly to any occasion.",
  "Exotic beauty with a magnetic personality. I bring energy, charm, and an irresistible smile to every meeting. My reviews speak for themselves — I always aim to exceed expectations.",
  "Graceful and attentive, I specialise in creating meaningful connections. Expect genuine warmth, intelligent conversation, and a companion who truly listens. Based centrally with flexible scheduling.",
  "Athletic and confident with a passion for wellness. I offer a unique blend of relaxation and excitement. Professional, discreet, and always punctual. New client friendly.",
  "International model with a heart of gold. I combine beauty with substance, offering companionship that is both stimulating and relaxing. Happy to accommodate special requests.",
  "Charming and articulate, I make the perfect plus-one for any occasion. My diverse interests mean we'll never run out of things to talk about. Genuinely passionate about what I do.",
  "Petite and playful with an infectious laugh. Don't let my size fool you — I bring big energy to every date. Experienced, professional, and committed to your satisfaction.",
  "Tall, elegant, and impossibly glamorous. I turn heads wherever I go and I'll make sure you do too. Perfect for high-profile events or intimate private encounters.",
  "Warm, genuine, and refreshingly honest. I believe in quality over quantity, which is why I limit my appointments to ensure every client receives my full attention.",
  "A true English rose with continental flair. Educated at some of the finest institutions, I offer companionship that is intellectually stimulating and visually breathtaking.",
  "Bold, confident, and unapologetically myself. I cater to those who appreciate authenticity and aren't afraid of a little adventure. BDSM-friendly and open-minded.",
  "Fresh-faced and full of life. Recently relocated to the UK and loving every moment. I bring a unique cultural perspective and a genuine desire to connect.",
  "Seasoned professional offering premium companionship. My extensive travel experience and cultural awareness make me the ideal companion for international businessmen visiting the UK.",
  "Curvy, confident, and absolutely radiant. I celebrate body positivity and bring that energy to every encounter. Specialising in relaxation massage and intimate companionship.",
  "Mysterious and alluring with a taste for the finer things. I offer an exclusive, VIP experience for those who appreciate luxury. Selective but incredibly rewarding.",
  "Youthful energy meets mature sensibility. At my core, I'm a people person who thrives on making others feel comfortable and desired. Available at short notice.",
  "Striking features, warm heart, and an unstoppable work ethic. I take pride in being the best version of myself for every client. References available upon request.",
  "The perfect blend of sweetness and spice. I adapt to your mood and preferences, ensuring a bespoke experience every time. Highly recommended by repeat clients.",
  "Fitness enthusiast with a killer smile. Toned, tanned, and always ready for an adventure. Great for active dates, gym sessions, or simply unwinding together.",
  "Classically beautiful with a modern edge. I stay current with fashion, culture, and world events so our time together is never dull. Bilingual and well-read.",
  "Gentle, caring, and endlessly patient. I specialise in providing a safe, judgement-free space. First-timers and nervous clients are especially welcome.",
];

// ─── Helpers ─────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function genPhone(): string {
  return `07${randInt(100, 999)}${randInt(100000, 999999)}`;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const hashedPassword = await bcrypt.hash("DemoPass123!", 12);

  let createdUsers = 0;
  let createdAds = 0;

  for (let i = 0; i < botUsers.length; i++) {
    const botUser = botUsers[i];

    // Check if user already exists (idempotent)
    let user = await User.findOne({ email: botUser.email });
    if (!user) {
      user = await User.create({
        name: botUser.name,
        email: botUser.email,
        password: hashedPassword,
        role: "user",
        status: "active",
        isVerified: true,
        oauthProvider: "local",
        accountType: "independent",
        verificationStatus: "verified",
        postingPlan: "free",
        idVerificationStatus: "verified",
        accountTier: "free",
        lastLogin: daysAgo(randInt(0, 14)),
        createdAt: daysAgo(randInt(14, 90)),
      });
      createdUsers++;
    }

    // Check if ad already exists for user
    const existingAd = await Ad.findOne({ userId: user._id, isDeleted: false });
    if (existingAd) {
      console.log(`  ⏭ Ad already exists for ${botUser.name}`);
      continue;
    }

    const loc = locations[i % locations.length];
    const age = randInt(21, 35);
    const ethnicity = pick(ethnicities);
    const bodyType = pick(bodyTypes);
    const gender = i < 16 ? "Female" : i < 18 ? "Male" : pick(genders);
    const category = i < 20 ? "escort" : pick(categories);
    const tier = pick(tiers);
    const createdDaysAgo = randInt(1, 60);
    const createdAt = daysAgo(createdDaysAgo);
    const phone = genPhone();
    const services = pickN(allServices, 2, 6);
    const spokenLangs = ["English", ...pickN(languages.filter(l => l !== "English"), 0, 2)];
    const serviceFor = pick(serviceForOptions);
    const incall = Math.random() > 0.3;
    const outcall = Math.random() > 0.2;

    // Use picsum for placeholder images (same pattern as existing data)
    const imgSeed = 200 + i * 3;
    const images = [
      `https://picsum.photos/seed/${imgSeed}/500/600`,
      `https://picsum.photos/seed/${imgSeed + 1}/500/600`,
      `https://picsum.photos/seed/${imgSeed + 2}/500/600`,
    ];

    // Price based on location prestige
    const basePrice = loc.outcode.startsWith("W1") || loc.outcode.startsWith("SW")
      ? randInt(150, 300)
      : randInt(80, 200);

    const firstName = botUser.name.split(" ")[0];
    const title = `${firstName} - ${pick([
      "Elegant Companion", "Stunning & Available", "VIP Experience",
      "Luxury Escort", "Premium Companion", "Exclusive & Refined",
      "Unforgettable Encounter", "Sophisticated Lady", "Charming & Fun",
      "Discreet & Professional", "Natural Beauty", "Captivating Presence",
      "Independent Companion", "The Real Deal", "Genuine & Gorgeous",
    ])}`;

    const ad = await Ad.create({
      title,
      description: descriptions[i % descriptions.length],
      category,
      location: loc.location,
      price: basePrice,
      images,
      status: "approved",
      moderationStatus: "approved",
      moderationScore: 0,
      moderationFlags: [],
      isDeleted: false,
      userId: user._id,
      phone,
      email: botUser.email,
      services,
      age,
      ethnicity,
      bodyType,
      pricing: {
        price_15min: String(Math.round(basePrice * 0.4)),
        price_30min: String(Math.round(basePrice * 0.6)),
        price_1hour: String(basePrice),
        price_2hours: String(Math.round(basePrice * 1.7)),
        price_3hours: String(Math.round(basePrice * 2.3)),
        price_overnight: String(Math.round(basePrice * 5)),
      },
      selectedServices: services,
      profileFields: {
        location: loc.location,
        type: "Independent",
        gender,
        age,
        ethnicity,
        languages: spokenLangs,
        serviceFor,
        incall,
        outcall,
        travelRadius: outcall ? pick(travelRadii) : undefined,
      },
      views: randInt(50, 800),
      clicks: randInt(10, 150),
      tier,
      tierUntil: tier !== "STANDARD" ? new Date(Date.now() + randInt(3, 30) * 86400000) : undefined,
      lastPulsedAt: daysAgo(randInt(0, 3)),
      hasTapUp: Math.random() > 0.7,
      tapUpIntervalHours: pick([6, 8, 12]),
      qualityScore: randInt(30, 85),
      hasNewLabel: createdDaysAgo < 5,
      categorySlug: category === "escort" ? "escorts" : category.toLowerCase(),
      locationSlug: loc.slug,
      outcode: loc.outcode,
      district: loc.district,
      districtSlug: loc.district.toLowerCase().replace(/\s+/g, "-"),
      geoSource: "postcodes.io",
      isOnline: Math.random() > 0.5,
      lastActive: daysAgo(randInt(0, 2)),
      engagementScore: randInt(20, 100),
      visibilityScore: randInt(100, 800),
      locationHistory: [],
      roamingLocations: [],
      imageHashes: [],
      metricsWindow: [],
      videos: [],
      createdAt,
      updatedAt: daysAgo(randInt(0, createdDaysAgo)),
    });

    createdAds++;
    console.log(`  ✅ ${title} (${loc.location}, ${tier}, £${basePrice}/h)`);
  }

  console.log(`\n🎉 Done! Created ${createdUsers} bot users and ${createdAds} bot ads.`);
  console.log(`Total ads now: ${await Ad.countDocuments({ isDeleted: false })}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
