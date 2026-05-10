/**
 * Platform Categories Configuration
 *
 * Defines all categories available on the platform.
 * Only "escorts" is monetized — other categories are free community sections.
 */

export const PLATFORM_CATEGORIES = [
  {
    slug: "escorts",
    name: "Escorts",
    description: "Browse verified escort listings in your area",
    icon: "Heart",
    color: "text-blue-600",
    bgGradient: "from-blue-500 to-blue-600",
    monetized: true,
    subcategories: [
      "Female Escorts",
      "Male Escorts",
      "Trans Escorts",
      "Couples",
      "BDSM",
      "Massage",
    ],
  },
  {
    slug: "massage",
    name: "Massage & Wellness",
    description: "Professional massage and wellness services",
    icon: "Sparkles",
    color: "text-purple-600",
    bgGradient: "from-purple-500 to-indigo-600",
    monetized: false,
    subcategories: [
      "Swedish Massage",
      "Deep Tissue",
      "Sports Massage",
      "Thai Massage",
      "Aromatherapy",
      "Reflexology",
    ],
  },
  {
    slug: "dating",
    name: "Dating & Personals",
    description: "Connect with like-minded people near you",
    icon: "HeartHandshake",
    color: "text-red-500",
    bgGradient: "from-red-400 to-blue-500",
    monetized: false,
    subcategories: [
      "Men Seeking Women",
      "Women Seeking Men",
      "Men Seeking Men",
      "Women Seeking Women",
      "Casual Encounters",
      "Activity Partners",
    ],
  },
  {
    slug: "jobs",
    name: "Jobs & Services",
    description: "Find and post job opportunities",
    icon: "Briefcase",
    color: "text-blue-600",
    bgGradient: "from-blue-500 to-cyan-600",
    monetized: false,
    subcategories: [
      "Full-Time",
      "Part-Time",
      "Freelance",
      "Hospitality",
      "Retail",
      "Trade Services",
    ],
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    description: "Events, nightlife, and entertainment listings",
    icon: "Music",
    color: "text-amber-500",
    bgGradient: "from-amber-400 to-orange-500",
    monetized: false,
    subcategories: [
      "Nightlife",
      "Live Music",
      "Events",
      "Performers",
      "DJs",
      "Photography",
    ],
  },
  {
    slug: "alternative",
    name: "Alternative Lifestyle",
    description: "Explore alternative lifestyle communities",
    icon: "Leaf",
    color: "text-green-600",
    bgGradient: "from-green-500 to-emerald-600",
    monetized: false,
    subcategories: [
      "Naturism",
      "Kink Community",
      "Polyamory",
      "Swinging",
      "Fetish",
      "Support Groups",
    ],
  },
  {
    slug: "buy-sell",
    name: "Buy & Sell",
    description: "Electronics, furniture, fashion, collectibles and more",
    icon: "ShoppingCart",
    color: "text-orange-600",
    bgGradient: "from-orange-400 to-amber-500",
    monetized: false,
    subcategories: [
      "Electronics",
      "Mobile Phones & Tablets",
      "Furniture & Homeware",
      "Fashion & Clothing",
      "Sports & Fitness",
      "Free Stuff",
    ],
  },
  {
    slug: "vehicles",
    name: "Vehicles",
    description: "Cars, motorbikes, vans, caravans and parts",
    icon: "Car",
    color: "text-slate-600",
    bgGradient: "from-slate-500 to-zinc-600",
    monetized: false,
    subcategories: [
      "Cars for Sale",
      "Motorbikes & Scooters",
      "Vans & Commercial",
      "Parts & Accessories",
    ],
  },
  {
    slug: "property",
    name: "Property",
    description: "Houses, flats, rooms, commercial and holiday lets",
    icon: "Home",
    color: "text-emerald-600",
    bgGradient: "from-emerald-500 to-teal-600",
    monetized: false,
    subcategories: [
      "Houses for Rent",
      "Flats & Apartments",
      "Rooms to Rent",
      "Houses for Sale",
      "Commercial Property",
      "Holiday Lets",
    ],
  },
  {
    slug: "pets",
    name: "Pets & Animals",
    description: "Dogs, cats, birds, fish, horses and pet supplies",
    icon: "PawPrint",
    color: "text-yellow-600",
    bgGradient: "from-yellow-400 to-orange-500",
    monetized: false,
    subcategories: [
      "Dogs",
      "Cats & Kittens",
      "Birds",
      "Fish & Aquariums",
      "Horses & Ponies",
      "Pet Accessories",
    ],
  },
  {
    slug: "community",
    name: "Community",
    description: "Local events, notices, volunteering and social groups",
    icon: "Users",
    color: "text-sky-600",
    bgGradient: "from-sky-500 to-blue-600",
    monetized: false,
    subcategories: [
      "Local Events",
      "Public Notices",
      "Charity & Volunteer",
      "Sports Partners",
    ],
  },
  {
    slug: "services",
    name: "Services",
    description: "Tradesmen, tutors, beauty, events and business services",
    icon: "Wrench",
    color: "text-teal-600",
    bgGradient: "from-teal-500 to-cyan-600",
    monetized: false,
    subcategories: [
      "Building & Trades",
      "Tutoring & Lessons",
      "Beauty & Wellness",
      "Cleaning Services",
      "Photography & Video",
      "Event Services",
    ],
  },
  {
    slug: "domestic",
    name: "Domestic Help",
    description: "Childcare, housekeeping, eldercare and home help",
    icon: "Home",
    color: "text-blue-500",
    bgGradient: "from-blue-400 to-blue-500",
    monetized: false,
    subcategories: [
      "Babysitting & Nannies",
      "Housekeeping & Cleaning",
      "Au Pairs",
      "Elderly Care",
    ],
  },
  {
    slug: "classes",
    name: "Classes & Lessons",
    description: "Tutoring, music, languages, driving and sports coaching",
    icon: "BookOpen",
    color: "text-indigo-600",
    bgGradient: "from-indigo-500 to-violet-600",
    monetized: false,
    subcategories: [
      "Academic Tutoring",
      "Music Lessons",
      "Language Courses",
      "Driving Lessons",
      "Sports Coaching",
    ],
  },
  {
    slug: "holidays",
    name: "Holidays & Travel",
    description: "Holiday homes, flights, hotels and travel experiences",
    icon: "Plane",
    color: "text-cyan-600",
    bgGradient: "from-cyan-400 to-blue-500",
    monetized: false,
    subcategories: [
      "Holiday Accommodation",
      "Flights & Tickets",
      "Hotels & Resorts",
      "Travel Tours",
    ],
  },
  {
    slug: "farming",
    name: "Farming & Agriculture",
    description: "Farm equipment, livestock, land and agricultural services",
    icon: "Tractor",
    color: "text-lime-600",
    bgGradient: "from-lime-500 to-green-600",
    monetized: false,
    subcategories: [
      "Farm Machinery",
      "Livestock",
      "Agricultural Land",
      "Farm Supplies",
    ],
  },
];

/**
 * Get a category by its slug.
 */
export function getCategoryBySlug(slug) {
  return PLATFORM_CATEGORIES.find((c) => c.slug === slug) || null;
}

/**
 * Get only monetized categories.
 */
export function getMonetizedCategories() {
  return PLATFORM_CATEGORIES.filter((c) => c.monetized);
}

/**
 * Get all category slugs.
 */
export function getAllCategorySlugs() {
  return PLATFORM_CATEGORIES.map((c) => c.slug);
}
