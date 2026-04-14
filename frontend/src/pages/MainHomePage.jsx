import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { PLATFORM_CATEGORIES } from "../config/categories";

/**
 * MainHomePage - VivaStreet-style landing page
 * All categories with search by Category + Area
 * Links to specific category pages (e.g., Escorts → EscortsHomePage)
 * 
 * Design: Clean, modern, professional with smooth animations
 */

// Category data with subcategories - Full VivaStreet-style categories
const CATEGORIES = [
  {
    id: "free-personals",
    title: "Free Personals",
    icon: "💝",
    description: "Escorts, dating, relationships and adult connections.",
    count: 9,
    subs: [
      { name: "Escorts and Massages", slug: "escorts", popular: true, link: "/escorts" },
      { name: "Adult Entertainment", slug: "adult-entertainment", popular: true },
      { name: "Trans Escorts", slug: "trans-escorts" },
      { name: "Gay Escorts", slug: "gay-escorts" },
      { name: "Adult Dating", slug: "adult-dating", popular: true },
      { name: "Swingers", slug: "swingers" },
      { name: "Straight Relationships", slug: "straight-relationships" },
      { name: "Gay and Lesbian", slug: "gay-and-lesbian" },
      { name: "Friendship – Friends", slug: "friendship" },
    ],
  },
  {
    id: "buy-sell",
    title: "Buy & Sell",
    icon: "🛒",
    description: "Electronics, furniture, fashion, collectibles and more.",
    count: 14,
    subs: [
      { name: "Electronics", slug: "electronics", popular: true },
      { name: "Mobile Phones & Tablets", slug: "phones-tablets", popular: true },
      { name: "Computers & Laptops", slug: "computers", popular: true },
      { name: "Furniture & Homeware", slug: "furniture" },
      { name: "Fashion & Clothing", slug: "fashion" },
      { name: "Sports & Fitness", slug: "sports" },
      { name: "Baby & Kids Items", slug: "baby-kids" },
      { name: "Books, Music & Games", slug: "books-music-games" },
      { name: "Collectibles & Art", slug: "collectibles" },
      { name: "Garden & DIY", slug: "garden-diy" },
      { name: "Health & Beauty", slug: "health-beauty" },
      { name: "Jewellery & Watches", slug: "jewellery" },
      { name: "Free Stuff", slug: "free-stuff", popular: true },
      { name: "Other Items", slug: "other-items" },
    ],
  },
  {
    id: "vehicles",
    title: "Vehicles",
    icon: "🚗",
    description: "Cars, motorbikes, vans, caravans and parts.",
    count: 8,
    subs: [
      { name: "Cars for Sale", slug: "cars", popular: true },
      { name: "Motorbikes & Scooters", slug: "motorbikes", popular: true },
      { name: "Vans & Commercial", slug: "vans" },
      { name: "Caravans & Campervans", slug: "caravans" },
      { name: "Trucks & Trailers", slug: "trucks" },
      { name: "Car Parts & Accessories", slug: "car-parts" },
      { name: "Wanted Vehicles", slug: "wanted-vehicles" },
      { name: "Other Vehicles", slug: "other-vehicles" },
    ],
  },
  {
    id: "property",
    title: "Property",
    icon: "🏠",
    description: "Houses, flats, rooms, commercial and holiday lets.",
    count: 10,
    subs: [
      { name: "Houses for Rent", slug: "houses-rent", popular: true },
      { name: "Flats & Apartments", slug: "flats-rent", popular: true },
      { name: "Rooms to Rent", slug: "rooms-rent", popular: true },
      { name: "Houses for Sale", slug: "houses-sale" },
      { name: "Flats for Sale", slug: "flats-sale" },
      { name: "Commercial Property", slug: "commercial" },
      { name: "Parking & Garages", slug: "parking" },
      { name: "Holiday Lets", slug: "holiday-lets" },
      { name: "Houseswap", slug: "houseswap" },
      { name: "Property Wanted", slug: "property-wanted" },
    ],
  },
  {
    id: "jobs",
    title: "Jobs",
    icon: "💼",
    description: "Job vacancies, CVs, part-time and freelance work.",
    count: 8,
    subs: [
      { name: "Full Time Jobs", slug: "full-time-jobs", popular: true },
      { name: "Part Time Jobs", slug: "part-time-jobs", popular: true },
      { name: "Temporary Jobs", slug: "temp-jobs" },
      { name: "Freelance & Contract", slug: "freelance" },
      { name: "Small & Student Jobs", slug: "student-jobs", popular: true },
      { name: "Work Experience", slug: "work-experience" },
      { name: "Job Seekers – CVs", slug: "job-seekers" },
      { name: "Volunteer Work", slug: "volunteer" },
    ],
  },
  {
    id: "services",
    title: "Services",
    icon: "🔧",
    description: "Tradesmen, tutors, beauty, events and business services.",
    count: 12,
    subs: [
      { name: "Building & Trades", slug: "building-trades", popular: true },
      { name: "Tutoring & Lessons", slug: "tutoring", popular: true },
      { name: "Beauty & Wellness", slug: "beauty-wellness", popular: true },
      { name: "Cleaning Services", slug: "cleaning" },
      { name: "Photography & Video", slug: "photography" },
      { name: "Computing & IT", slug: "computing-it" },
      { name: "Event Services", slug: "event-services" },
      { name: "Health & Fitness", slug: "health-fitness" },
      { name: "Legal & Finance", slug: "legal-finance" },
      { name: "Movers & Storage", slug: "movers" },
      { name: "Pet Services", slug: "pet-services" },
      { name: "Other Services", slug: "other-services" },
    ],
  },
  {
    id: "domestic",
    title: "Domestic Help",
    icon: "🏡",
    description: "Childcare, housekeeping, eldercare and home help.",
    count: 6,
    subs: [
      { name: "Babysitting & Nannies", slug: "babysitting", popular: true },
      { name: "Housekeeping & Cleaning", slug: "housekeeping", popular: true },
      { name: "Au Pairs", slug: "au-pairs" },
      { name: "Elderly Care", slug: "elderly-care" },
      { name: "Pet Sitting", slug: "pet-sitting" },
      { name: "Work from Home", slug: "work-from-home" },
    ],
  },
  {
    id: "classes",
    title: "Classes & Lessons",
    icon: "📚",
    description: "Tutoring, music, languages, driving and sports coaching.",
    count: 8,
    subs: [
      { name: "Academic Tutoring", slug: "academic-tutoring", popular: true },
      { name: "Music Lessons", slug: "music-lessons", popular: true },
      { name: "Language Courses", slug: "language-courses", popular: true },
      { name: "Driving Lessons", slug: "driving-lessons" },
      { name: "Art & Dance", slug: "art-dance" },
      { name: "Sports Coaching", slug: "sports-coaching" },
      { name: "IT & Computer Training", slug: "it-training" },
      { name: "Other Classes", slug: "other-classes" },
    ],
  },
  {
    id: "pets",
    title: "Pets & Animals",
    icon: "🐾",
    description: "Dogs, cats, birds, fish, horses and pet supplies.",
    count: 10,
    subs: [
      { name: "Dogs for Sale", slug: "dogs", popular: true },
      { name: "Cats & Kittens", slug: "cats", popular: true },
      { name: "Birds", slug: "birds" },
      { name: "Fish & Aquariums", slug: "fish" },
      { name: "Horses & Ponies", slug: "horses" },
      { name: "Rabbits & Small Pets", slug: "small-pets" },
      { name: "Reptiles", slug: "reptiles" },
      { name: "Pet Accessories", slug: "pet-accessories" },
      { name: "Pets Wanted", slug: "pets-wanted" },
      { name: "Missing & Found Pets", slug: "missing-pets" },
    ],
  },
  {
    id: "holidays",
    title: "Holidays & Travel",
    icon: "✈️",
    description: "Holiday homes, flights, hotels and travel experiences.",
    count: 6,
    subs: [
      { name: "Holiday Accommodation", slug: "holiday-accommodation", popular: true },
      { name: "Flights & Tickets", slug: "flights", popular: true },
      { name: "Hotels & Resorts", slug: "hotels" },
      { name: "Caravan Holidays", slug: "caravan-holidays" },
      { name: "Travel Tours", slug: "travel-tours" },
      { name: "Travel Partners", slug: "travel-partners" },
    ],
  },
  {
    id: "community",
    title: "Community",
    icon: "🤝",
    description: "Local events, notices, volunteering and social groups.",
    count: 8,
    subs: [
      { name: "Local Events", slug: "events", popular: true },
      { name: "Public Notices", slug: "public-notice", popular: true },
      { name: "Bands & Musicians", slug: "artists" },
      { name: "Sports Partners", slug: "sports-partners" },
      { name: "Pubs, Restaurants & Takeaways", slug: "eat" },
      { name: "Other Activities", slug: "activities" },
      { name: "Charity & Volunteer", slug: "charity" },
      { name: "Missing People – Connections", slug: "missing" },
    ],
  },
  {
    id: "farming",
    title: "Farming & Agriculture",
    icon: "🚜",
    description: "Farm equipment, livestock, land and agricultural services.",
    count: 6,
    subs: [
      { name: "Farm Machinery", slug: "farm-machinery", popular: true },
      { name: "Livestock", slug: "livestock", popular: true },
      { name: "Agricultural Land", slug: "agricultural-land" },
      { name: "Farm Supplies", slug: "farm-supplies" },
      { name: "Rural Services", slug: "rural-services" },
      { name: "Farm Jobs", slug: "farm-jobs" },
    ],
  },
];

// UK Regions
const UK_REGIONS = [
  { value: "gb", label: "All UK" },
  { value: "east-anglia", label: "East Anglia" },
  { value: "east-midlands", label: "East Midlands" },
  { value: "london", label: "London" },
  { value: "north-east", label: "North East" },
  { value: "north-west", label: "North West" },
  { value: "northern-ireland", label: "Northern Ireland" },
  { value: "scotland", label: "Scotland" },
  { value: "south-east", label: "South East" },
  { value: "south-west", label: "South West" },
  { value: "wales", label: "Wales" },
  { value: "west-midlands", label: "West Midlands" },
  { value: "yorkshire", label: "Yorkshire and the Humber" },
];

// Category Group Component
// eslint-disable-next-line no-unused-vars
function CategoryGroup({ category, index }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={`group relative border border-zinc-100 rounded-2xl bg-white p-5 
                  shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]
                  transition-all duration-300 ease-out
                  ${isOpen ? "ring-2 ring-orange-400/30 shadow-[0_8px_30px_rgba(251,146,60,0.12)]" : "hover:-translate-y-0.5"}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{category.icon || "📦"}</span>
          <div>
            <h3 className="font-bold text-base text-zinc-900 group-hover:text-orange-600 transition-colors">
              {category.title}
            </h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`border rounded-full px-3.5 py-1.5 text-xs font-semibold
                       transition-all duration-200 active:scale-95
                       ${isOpen 
                         ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/25" 
                         : "bg-white border-zinc-200 text-zinc-600 hover:border-orange-300 hover:text-orange-600"}`}
            aria-expanded={isOpen}
          >
            {isOpen ? "Close" : "Expand ▾"}
          </button>
          <span className="text-xs font-medium text-zinc-400 bg-zinc-50 rounded-full px-2.5 py-1">
            {category.count}
          </span>
        </div>
      </div>

      <div className={`grid overflow-hidden transition-all duration-300 ease-out
                       ${isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
        <div className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-zinc-100">
            {category.subs.map((sub, subIndex) => (
              <Link
                key={sub.slug}
                to={sub.link || (category.id === "free-personals" ? `/escort/gb` : `/category/${category.id}`)}
                className={`group/sub flex items-center gap-2 border border-zinc-100 rounded-xl px-3 py-2.5 
                           text-sm bg-white hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50
                           hover:border-orange-200 active:scale-[0.98] transition-all duration-200
                           ${sub.popular ? "font-semibold text-zinc-800" : "text-zinc-500 hover:text-zinc-700"}`}
                style={{ animationDelay: `${subIndex * 30}ms` }}
              >
                <span className="group-hover/sub:translate-x-0.5 transition-transform">→</span>
                {sub.name}
                {sub.popular && (
                  <span className="ml-auto text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
                    HOT
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MainHomePage() {
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(false);

  const [category, setCategory] = useState("");
  const { isLoggedIn, logout } = useAuth();
  const [region, setRegion] = useState("gb");
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    // Map category slugs to their target routes
    const ESCORT_SLUGS = new Set([
      "escorts", "trans-escorts", "gay-escorts",
    ]);
    // Non-escort categories route to /category/:slug
    const CATEGORY_SLUGS = new Set([
      "massage", "dating", "jobs", "entertainment", "alternative",
    ]);

    const location = region || "gb";

    if (category) {
      if (ESCORT_SLUGS.has(category)) {
        navigate(`/escort/${location}`);
        return;
      }
      if (CATEGORY_SLUGS.has(category)) {
        navigate(`/category/${category}`);
        return;
      }
      // Subcategory slugs — find which parent they belong to
      for (const cat of CATEGORIES) {
        const sub = cat.subs.find((s) => s.slug === category);
        if (sub) {
          if (cat.id === "adult-services") {
            navigate(`/escort/${location}`);
          } else {
            navigate(`/category/${cat.id}`);
          }
          return;
        }
      }
    }

    // Default: go to escort search with selected region
    navigate(`/escort/${location}`);
  };

  // Build category options for select
  const categoryOptions = CATEGORIES.flatMap((cat) => [
    { value: `__group_${cat.id}`, label: `── ${cat.title} ──`, disabled: true },
    ...cat.subs.map((sub) => ({ value: sub.slug, label: sub.name })),
  ]);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0 translate-y-2"}`}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <div>
              <div className="text-sm font-bold leading-tight"><span className="text-pink-500">Reach</span><span className="text-purple-600">Ripple</span></div>
              <div className="text-xs text-zinc-400 leading-tight">Premium Classifieds & Services</div>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link to="/saved" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all">
              <span>⭐</span> Saved
            </Link>
            {isLoggedIn ? (
              <>
                <Link to="/my-ads" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all">
                  My Ads
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-all">
                  Login
                </Link>
                <Link to="/signup" className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Sign Up
                </Link>
              </>
            )}
            <Link
              to="/create-ad"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                         bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold text-sm
                         shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>+</span> Post Ad
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-zinc-900/50" />
          
          {/* Animated gradient orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              {/* Left: Title + Search */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium mb-4">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  120,000+ active listings
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  Welcome to
                  <span className="block">
                    <span className="text-pink-400">Reach</span><span className="bg-gradient-to-r from-purple-400 to-blue-600 bg-clip-text text-transparent">Ripple</span>
                  </span>
                </h1>
                
                <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                  The UK's premier classifieds platform. Buy, sell, hire and connect locally.
                </p>

                {/* Search Card */}
                <div className={`mt-8 bg-white rounded-2xl p-5 shadow-2xl shadow-black/20 border border-white/20 transition-all duration-300 ${searchFocused ? 'ring-2 ring-orange-400/50 shadow-orange-500/20' : ''}`}>
                  <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <label htmlFor="cat" className="block text-xs font-bold text-zinc-600 tracking-wide mb-2">
                        Pick a category
                      </label>
                      <select
                        id="cat"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full h-12 border border-zinc-200 rounded-xl px-4 text-sm font-medium
                                   outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-zinc-50 hover:bg-white transition-all cursor-pointer"
                      >
                        <option value="">All categories</option>
                        {categoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value} disabled={opt.disabled} className={opt.disabled ? 'font-bold text-zinc-400' : ''}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="geo" className="block text-xs font-bold text-zinc-600 tracking-wide mb-2">
                        Pick a location
                      </label>
                      <select
                        id="geo"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full h-12 border border-zinc-200 rounded-xl px-4 text-sm font-medium
                                   outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-zinc-50 hover:bg-white transition-all cursor-pointer"
                      >
                        {UK_REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full md:w-auto h-12 px-8 bg-gradient-to-r from-orange-500 to-pink-600 text-white
                                   font-bold text-sm rounded-xl shadow-lg shadow-orange-500/30
                                   hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all
                                   flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search
                      </button>
                    </div>
                  </form>

                  {/* Trust chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-100">
                    {[
                      { icon: "✓", text: "Verified posters" },
                      { icon: "🔒", text: "Secure" },
                      { icon: "⚡", text: "Updated live" },
                    ].map((chip) => (
                      <span key={chip.text} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                        <span>{chip.icon}</span> {chip.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Decorative Info Panel */}
              <div className="hidden lg:block relative">
                <div className="relative w-full h-[420px] rounded-3xl overflow-hidden shadow-2xl"
                     style={{
                       background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
                     }}>
                  {/* Gradient overlays */}
                  <div className="absolute inset-0 pointer-events-none"
                       style={{
                         background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,.12), transparent 50%),
                                      radial-gradient(circle at 80% 70%, rgba(168,85,247,.20), transparent 50%)`,
                       }} />
                  
                  {/* Floating orbs */}
                  <div className="absolute top-10 right-10 w-20 h-20 bg-gradient-to-br from-pink-400/30 to-purple-500/30 rounded-full blur-xl animate-pulse" />
                  <div className="absolute bottom-20 left-8 w-16 h-16 bg-gradient-to-br from-orange-400/30 to-pink-500/30 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />

                  {/* Top Float Card */}
                  <div className="absolute left-5 top-6 right-5 bg-white/95 text-zinc-900 rounded-2xl p-4 shadow-xl backdrop-blur-md border border-white/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                        <span className="text-white text-lg">⚡</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-zinc-900">Post in under 60 seconds</div>
                        <div className="text-xs text-zinc-500">Photos, title, price, location — done.</div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Stats */}
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 right-5">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "120K+", label: "Active ads" },
                        { value: "50K+", label: "Users" },
                        { value: "12", label: "Categories" },
                        { value: "24/7", label: "Support" },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                          <div className="text-xl font-black text-white">{stat.value}</div>
                          <div className="text-xs text-white/60">{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Float Card */}
                  <div className="absolute left-5 bottom-6 right-5 bg-white/95 text-zinc-900 rounded-2xl p-4 shadow-xl backdrop-blur-md border border-white/50">
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trending now</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["🎯 Jobs", "🏠 Property", "🚗 Vehicles", "💝 Dating"].map((tag) => (
                        <span key={tag} className="bg-zinc-100 rounded-full px-3 py-1 text-xs font-medium text-zinc-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* All Categories Section */}
        <section className="py-10 pb-32 md:pb-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 mb-2">Browse Categories</h2>
            <p className="text-sm text-zinc-500 mb-6">Discover listings across all our categories</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={cat.slug === "escorts" ? "/escorts" : `/category/${cat.slug}`}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${cat.bgGradient} p-6 text-white
                              hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all group`}
                >
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-1">{cat.name}</h3>
                    <p className="text-sm opacity-80">{cat.description}</p>
                    {cat.monetized && (
                      <span className="mt-3 inline-block text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                    )}
                  </div>
                  <div className="absolute right-4 bottom-4 text-4xl opacity-20 group-hover:opacity-40 transition-opacity font-bold">
                    →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile Bottom Bar */}
        <nav className="fixed left-1/2 -translate-x-1/2 bottom-4 w-[min(400px,calc(100%-32px))]
                        rounded-2xl bg-white/90 p-1.5 shadow-2xl shadow-black/15 backdrop-blur-xl border border-zinc-200/80
                        flex gap-1.5 md:hidden z-50">
          <a
            href="#search"
            className="flex-1 rounded-xl px-3 py-3 text-center font-semibold text-sm
                       bg-zinc-50 text-zinc-700 hover:bg-zinc-100
                       active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </a>
          <Link
            to="/create-ad"
            className="flex-1 rounded-xl px-3 py-3 text-center font-semibold text-sm
                       bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/25
                       active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>+</span> Post
          </Link>
          <Link
            to="/saved"
            className="flex-1 rounded-xl px-3 py-3 text-center font-semibold text-sm
                       bg-zinc-50 text-zinc-700 hover:bg-zinc-100
                       active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>⭐</span> Saved
          </Link>
        </nav>
      </main>

      <Footer />
    </div>
  );
}
