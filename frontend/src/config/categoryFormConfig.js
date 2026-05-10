/**
 * Category-specific form configuration.
 * Each category defines its own fields, services, pricing, and placeholders
 * so the ad creation form adapts to the category's purpose.
 */

export const CATEGORY_FORM_CONFIG = {
  // ===================================================================
  // ESCORTS — uses dedicated CreateAdPage_Luxury (redirect only)
  // ===================================================================
  escorts: {
    useDedicatedPage: true,
    redirectTo: "/create-ad/escort-form",
  },

  // ===================================================================
  // MASSAGE & WELLNESS
  // ===================================================================
  massage: {
    name: "Massage & Wellness",
    icon: "✨",
    accentColor: "purple",
    gradient: "from-purple-500 to-indigo-600",
    titlePlaceholder: "e.g., Professional Deep Tissue Massage – Central London",
    descriptionPlaceholder: "Describe your massage services, qualifications, experience, and what clients can expect...",
    descriptionLabel: "About Your Services",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Manchester" },
      { key: "experience", label: "Years of Experience", type: "number", placeholder: "e.g., 5" },
      { key: "qualifications", label: "Qualifications / Certifications", type: "text", placeholder: "e.g., ITEC Level 3, VTCT Diploma" },
      { key: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Non-binary", "Prefer not to say"] },
      { key: "sessionType", label: "Session Type", type: "checkboxes", options: ["Mobile (I come to you)", "Studio/Salon", "Home-based", "Hotel visits"] },
    ],
    services: [
      "Swedish Massage", "Deep Tissue", "Sports Massage", "Thai Massage",
      "Hot Stone", "Aromatherapy", "Reflexology", "Prenatal Massage",
      "Couples Massage", "Lymphatic Drainage", "Shiatsu", "Indian Head Massage",
    ],
    pricingLabel: "Session Pricing (GBP)",
    pricingTiers: [
      { key: "price_30min", label: "30 Minutes" },
      { key: "price_1hour", label: "1 Hour" },
      { key: "price_90min", label: "90 Minutes" },
      { key: "price_2hours", label: "2 Hours" },
    ],
    contactFields: ["phone", "email", "website"],
  },

  // ===================================================================
  // DATING & PERSONALS
  // ===================================================================
  dating: {
    name: "Dating & Personals",
    icon: "💝",
    accentColor: "rose",
    gradient: "from-blue-400 to-blue-500",
    titlePlaceholder: "e.g., Friendly 28-year-old looking for genuine connections",
    descriptionPlaceholder: "Tell people about yourself – your interests, hobbies, what you're looking for...",
    descriptionLabel: "About You",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Manchester" },
      { key: "age", label: "Age", type: "number", required: true, min: 18, max: 100 },
      { key: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Trans", "Non-binary", "Other"] },
      { key: "lookingFor", label: "Looking For", type: "select", options: ["Men", "Women", "Both", "Everyone"] },
      { key: "relationshipType", label: "What Are You Seeking?", type: "checkboxes", options: ["Friendship", "Dating", "Long-term Relationship", "Casual", "Activity Partner", "Pen Pal"] },
      { key: "interests", label: "Interests / Hobbies", type: "tags", placeholder: "Type and press Enter (e.g., Travel, Music, Cooking)" },
    ],
    services: [], // Personals don't have services
    pricingTiers: [], // Free category
    contactFields: ["email"],
  },

  // ===================================================================
  // JOBS & SERVICES
  // ===================================================================
  jobs: {
    name: "Jobs & Services",
    icon: "💼",
    accentColor: "blue",
    gradient: "from-blue-500 to-cyan-600",
    titlePlaceholder: "e.g., Experienced Plumber Available – Fast Response",
    descriptionPlaceholder: "Describe the role, requirements, responsibilities, or your service offering in detail...",
    descriptionLabel: "Job / Service Description",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Remote, Nationwide" },
      { key: "subcategory", label: "Type", type: "select", options: ["Full-Time Job", "Part-Time Job", "Freelance / Contract", "Temporary", "Volunteer", "Offering a Service"] },
      { key: "salary", label: "Salary / Rate", type: "text", placeholder: "e.g., £35,000/year, £25/hour, Negotiable" },
      { key: "industry", label: "Industry", type: "select", options: ["Construction & Trades", "IT & Technology", "Hospitality & Catering", "Healthcare", "Retail", "Education", "Finance", "Creative & Media", "Transport & Logistics", "Cleaning", "Other"] },
      { key: "experience", label: "Experience Required", type: "select", options: ["No experience needed", "1-2 years", "3-5 years", "5+ years"] },
      { key: "workArrangement", label: "Work Arrangement", type: "checkboxes", options: ["On-site", "Remote", "Hybrid", "Flexible hours"] },
    ],
    services: [
      "Plumbing", "Electrical", "Carpentry", "Painting & Decorating",
      "Gardening", "Cleaning", "IT Support", "Web Design",
      "Photography", "Tutoring", "Personal Training", "Driving",
    ],
    pricingLabel: "Rate (GBP)",
    pricingTiers: [
      { key: "price_hourly", label: "Hourly Rate" },
      { key: "price_daily", label: "Day Rate" },
      { key: "price_fixed", label: "Fixed Price" },
    ],
    contactFields: ["phone", "email"],
  },

  // ===================================================================
  // ENTERTAINMENT
  // ===================================================================
  entertainment: {
    name: "Entertainment",
    icon: "🎵",
    accentColor: "amber",
    gradient: "from-amber-400 to-orange-500",
    titlePlaceholder: "e.g., DJ Available for Events – All Genres",
    descriptionPlaceholder: "Describe your act, experience, style, and what events you cover...",
    descriptionLabel: "About Your Act / Service",
    fields: [
      { key: "location", label: "Location / Coverage Area", type: "text", required: true, placeholder: "e.g., London & South East" },
      { key: "subcategory", label: "Type", type: "select", options: ["DJ", "Live Band", "Solo Musician", "Singer", "Comedian", "Magician", "Dancer", "Photographer", "Videographer", "Event Planner", "Other Performer"] },
      { key: "eventTypes", label: "Events Covered", type: "checkboxes", options: ["Weddings", "Corporate Events", "Birthdays", "Nightclubs", "Festivals", "Private Parties", "Funerals", "Charity Events"] },
      { key: "experience", label: "Years of Experience", type: "number", placeholder: "e.g., 8" },
      { key: "genres", label: "Genres / Styles", type: "tags", placeholder: "Type and press Enter (e.g., R&B, Jazz, Pop)" },
    ],
    services: [
      "Live Performance", "DJ Set", "MC / Hosting", "Sound & Lighting",
      "Photography", "Videography", "Event Planning", "Decoration",
      "Catering Referral", "Custom Playlists",
    ],
    pricingLabel: "Pricing (GBP)",
    pricingTiers: [
      { key: "price_hourly", label: "Per Hour" },
      { key: "price_half_day", label: "Half Day (4hrs)" },
      { key: "price_full_day", label: "Full Day" },
      { key: "price_package", label: "Package Deal" },
    ],
    contactFields: ["phone", "email", "website"],
  },

  // ===================================================================
  // ALTERNATIVE LIFESTYLE
  // ===================================================================
  alternative: {
    name: "Alternative Lifestyle",
    icon: "🌿",
    accentColor: "green",
    gradient: "from-green-500 to-emerald-600",
    titlePlaceholder: "e.g., Friendly Naturist Group – Weekend Meetups",
    descriptionPlaceholder: "Describe your community, events, or what you're looking for...",
    descriptionLabel: "About This Listing",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Manchester" },
      { key: "subcategory", label: "Category", type: "select", options: ["Naturism", "Kink Community", "Polyamory", "Swinging", "Fetish", "Support Group", "Social Group", "Other"] },
      { key: "eventType", label: "Listing Type", type: "select", options: ["Community Group", "Regular Meetup", "Event", "Personal Ad", "Discussion Group"] },
      { key: "ageRange", label: "Age Range Welcome", type: "text", placeholder: "e.g., 21-50, All ages" },
      { key: "openTo", label: "Open To", type: "checkboxes", options: ["Men", "Women", "Couples", "Non-binary", "Everyone"] },
    ],
    services: [],
    pricingTiers: [],
    contactFields: ["email"],
  },

  // ===================================================================
  // BUY & SELL
  // ===================================================================
  "buy-sell": {
    name: "Buy & Sell",
    icon: "🛒",
    accentColor: "orange",
    gradient: "from-orange-400 to-amber-500",
    titlePlaceholder: "e.g., iPhone 15 Pro Max – 256GB – Like New",
    descriptionPlaceholder: "Describe the item: condition, age, reason for selling, any defects...",
    descriptionLabel: "Item Description",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Manchester" },
      { key: "subcategory", label: "Category", type: "select", options: ["Electronics", "Mobile Phones & Tablets", "Computers & Laptops", "Furniture & Homeware", "Fashion & Clothing", "Sports & Fitness", "Baby & Kids Items", "Books, Music & Games", "Collectibles & Art", "Garden & DIY", "Health & Beauty", "Jewellery & Watches", "Free Stuff", "Other"] },
      { key: "condition", label: "Condition", type: "select", options: ["Brand New", "Like New", "Good", "Fair", "For Parts / Repair"] },
      { key: "deliveryOptions", label: "Delivery", type: "checkboxes", options: ["Collection Only", "Local Delivery", "Nationwide Shipping", "Free Postage"] },
    ],
    services: [],
    pricingLabel: "Price (GBP)",
    pricingTiers: [
      { key: "price_fixed", label: "Asking Price" },
    ],
    priceNote: "Leave blank for 'Contact for price' or enter 0 for 'Free'",
    contactFields: ["phone", "email"],
  },

  // ===================================================================
  // VEHICLES
  // ===================================================================
  vehicles: {
    name: "Vehicles",
    icon: "🚗",
    accentColor: "slate",
    gradient: "from-slate-500 to-zinc-600",
    titlePlaceholder: "e.g., 2020 BMW 3 Series – 320d M Sport – 45k miles",
    descriptionPlaceholder: "Describe the vehicle: service history, MOT status, any modifications or issues...",
    descriptionLabel: "Vehicle Description",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Manchester" },
      { key: "subcategory", label: "Vehicle Type", type: "select", options: ["Car", "Motorbike / Scooter", "Van / Commercial", "Caravan / Campervan", "Truck / Trailer", "Parts & Accessories", "Other"] },
      { key: "make", label: "Make", type: "text", placeholder: "e.g., BMW, Ford, Toyota" },
      { key: "model", label: "Model", type: "text", placeholder: "e.g., 3 Series, Focus, Corolla" },
      { key: "year", label: "Year", type: "number", placeholder: "e.g., 2020", min: 1900, max: 2030 },
      { key: "mileage", label: "Mileage", type: "text", placeholder: "e.g., 45,000 miles" },
      { key: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Electric", "Hybrid", "LPG", "Other"] },
      { key: "transmission", label: "Transmission", type: "select", options: ["Manual", "Automatic", "Semi-Auto"] },
      { key: "colour", label: "Colour", type: "text", placeholder: "e.g., Black, Silver" },
      { key: "doors", label: "Doors", type: "select", options: ["2", "3", "4", "5"] },
    ],
    services: [],
    pricingLabel: "Price (GBP)",
    pricingTiers: [
      { key: "price_fixed", label: "Asking Price" },
    ],
    priceNote: "Enter 0 for 'Price on Application'",
    contactFields: ["phone", "email"],
  },

  // ===================================================================
  // PROPERTY
  // ===================================================================
  property: {
    name: "Property",
    icon: "🏠",
    accentColor: "emerald",
    gradient: "from-emerald-500 to-teal-600",
    titlePlaceholder: "e.g., Spacious 2-Bed Flat – Islington – £1,400/month",
    descriptionPlaceholder: "Describe the property: layout, condition, neighbourhood, transport links, bills included...",
    descriptionLabel: "Property Description",
    fields: [
      { key: "location", label: "Location / Area", type: "text", required: true, placeholder: "e.g., Islington, London N1" },
      { key: "subcategory", label: "Listing Type", type: "select", options: ["House for Rent", "Flat / Apartment for Rent", "Room to Rent", "House for Sale", "Flat for Sale", "Commercial Property", "Holiday Let", "Parking / Garage", "Property Wanted"] },
      { key: "bedrooms", label: "Bedrooms", type: "select", options: ["Studio", "1", "2", "3", "4", "5+"] },
      { key: "bathrooms", label: "Bathrooms", type: "select", options: ["1", "2", "3", "4+"] },
      { key: "furnished", label: "Furnished", type: "select", options: ["Furnished", "Part-furnished", "Unfurnished"] },
      { key: "availableFrom", label: "Available From", type: "text", placeholder: "e.g., Immediately, 1st March 2026" },
      { key: "features", label: "Features", type: "checkboxes", options: ["Garden", "Parking", "Balcony", "Ensuite", "Pets Allowed", "Bills Included", "Central Heating", "Double Glazing", "EPC Rating A-C", "Wheelchair Accessible"] },
    ],
    services: [],
    pricingLabel: "Price (GBP)",
    pricingTiers: [
      { key: "price_monthly", label: "Monthly Rent / Price" },
      { key: "price_deposit", label: "Deposit" },
    ],
    priceNote: "For sales, enter the full asking price in Monthly field",
    contactFields: ["phone", "email"],
  },

  // ===================================================================
  // PETS & ANIMALS
  // ===================================================================
  pets: {
    name: "Pets & Animals",
    icon: "🐾",
    accentColor: "yellow",
    gradient: "from-yellow-400 to-orange-500",
    titlePlaceholder: "e.g., KC Registered Golden Retriever Puppies – Ready Now",
    descriptionPlaceholder: "Describe the pet: breed, age, temperament, vaccinations, reason for rehoming...",
    descriptionLabel: "Pet Description",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Manchester" },
      { key: "subcategory", label: "Animal Type", type: "select", options: ["Dogs", "Cats & Kittens", "Birds", "Fish & Aquariums", "Horses & Ponies", "Rabbits & Small Pets", "Reptiles", "Pet Accessories", "Pets Wanted", "Missing / Found Pets"] },
      { key: "breed", label: "Breed", type: "text", placeholder: "e.g., Golden Retriever, Bengal" },
      { key: "petAge", label: "Age", type: "text", placeholder: "e.g., 8 weeks, 2 years" },
      { key: "petGender", label: "Gender", type: "select", options: ["Male", "Female", "Unknown", "N/A"] },
      { key: "healthInfo", label: "Health", type: "checkboxes", options: ["Vaccinated", "Microchipped", "Neutered / Spayed", "Vet Checked", "KC Registered", "Wormed", "Flea Treated"] },
    ],
    services: [],
    pricingLabel: "Price (GBP)",
    pricingTiers: [
      { key: "price_fixed", label: "Asking Price" },
    ],
    priceNote: "Enter 0 for 'Free to good home' or rehoming",
    contactFields: ["phone", "email"],
  },

  // ===================================================================
  // COMMUNITY
  // ===================================================================
  community: {
    name: "Community",
    icon: "🤝",
    accentColor: "sky",
    gradient: "from-sky-500 to-blue-600",
    titlePlaceholder: "e.g., Weekly Running Club – Regent's Park – All Levels Welcome",
    descriptionPlaceholder: "Describe your event, group, or notice...",
    descriptionLabel: "Details",
    fields: [
      { key: "location", label: "Location", type: "text", required: true, placeholder: "e.g., London, Manchester" },
      { key: "subcategory", label: "Type", type: "select", options: ["Local Event", "Public Notice", "Sports Partner", "Charity & Volunteer", "Bands & Musicians", "Social Group", "Other"] },
      { key: "eventDate", label: "Date (if event)", type: "text", placeholder: "e.g., Every Saturday, 15th March 2026" },
      { key: "openTo", label: "Open To", type: "checkboxes", options: ["Everyone", "Adults Only (18+)", "Families", "Seniors", "Students"] },
    ],
    services: [],
    pricingTiers: [],
    contactFields: ["email"],
  },
};

/**
 * Get category form config by slug.
 * Returns null for unknown categories.
 */
export function getCategoryFormConfig(slug) {
  return CATEGORY_FORM_CONFIG[slug] || null;
}

/**
 * Get all category slugs that have form config.
 */
export function getAvailableCategorySlugs() {
  return Object.keys(CATEGORY_FORM_CONFIG);
}
