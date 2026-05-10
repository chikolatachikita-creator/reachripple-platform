import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import ThemeToggle from "../components/ThemeToggle";
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
  const [keyword, setKeyword] = useState("");
  const { isLoggedIn, logout } = useAuth();
  const [region, setRegion] = useState("gb");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  // Latest listings + live stats
  const [latestListings, setLatestListings] = useState([]);
  const [liveStats, setLiveStats] = useState({ totalAds: 0, postedThisWeek: 0 });

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
    // Fetch latest 8 non-adult listings + counts
    import("../api/client").then(({ default: api }) => {
      api.get("/ads", { params: { limit: 12, sortBy: "newest" } })
        .then((res) => {
          const ADULT = new Set(["escorts","escort","trans-escorts","gay-escorts","adult-entertainment","adult-dating","free-personals"]);
          const filtered = (res.data.ads || [])
            .filter((a) => !ADULT.has((a.categorySlug || "").toLowerCase().trim()))
            .slice(0, 8);
          setLatestListings(filtered);
          const total = res.data.total || res.data.totalAds || filtered.length;
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const week = (res.data.ads || []).filter((a) => new Date(a.createdAt).getTime() > oneWeekAgo).length;
          setLiveStats({ totalAds: total, postedThisWeek: week });
        })
        .catch(() => {});
    });
  }, []);

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    const ESCORT_SLUGS = new Set(["escorts", "trans-escorts", "gay-escorts"]);
    const location = region || "gb";
    const qs = keyword.trim() ? `?q=${encodeURIComponent(keyword.trim())}` : ``;

    if (category) {
      if (ESCORT_SLUGS.has(category)) {
        navigate(`/escort/${location}${qs}`);
        return;
      }
      const platformCat = PLATFORM_CATEGORIES.find((c) => c.slug === category);
      if (platformCat) {
        if (platformCat.slug === "escorts") {
          navigate(`/escort/${location}${qs}`);
        } else {
          navigate(`/category/${platformCat.slug}${qs}`);
        }
        return;
      }
      for (const cat of CATEGORIES) {
        const sub = cat.subs.find((s) => s.slug === category);
        if (sub) {
          if (cat.id === "free-personals") {
            navigate(`/escort/${location}${qs}`);
          } else {
            const mapped = PLATFORM_CATEGORIES.find((c) => c.slug === cat.id);
            navigate(`/category/${mapped ? mapped.slug : cat.id}${qs}`);
          }
          return;
        }
      }
    }

    // If keyword only (no category), use the general search page (NOT escort)
    if (keyword.trim()) {
      navigate(`/search?q=${encodeURIComponent(keyword.trim())}`);
      return;
    }
    // Nothing entered — fall back to all-listings escort view
    navigate(`/escort/${location}${qs}`);
  };

  // Build category options for select
  const categoryOptions = CATEGORIES.flatMap((cat) => [
    { value: `__group_${cat.id}`, label: `── ${cat.title} ──`, disabled: true },
    ...cat.subs.map((sub) => ({ value: sub.slug, label: sub.name })),
  ]);

  return (
    <div className={`min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-all duration-500 ${fadeIn ? "opacity-100" : "opacity-0 translate-y-2"}`}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logomark.png" alt="ReachRipple" className="w-10 h-10 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow" />
            <div>
              <div className="text-sm font-bold leading-tight"><span className="text-blue-500">Reach</span><span className="text-purple-600">Ripple</span></div>
              <div className="text-xs text-zinc-400 dark:text-zinc-500 leading-tight">Premium Classifieds & Services</div>
            </div>
          </Link>
          
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            <ThemeToggle />
            <Link to="/saved" className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all whitespace-nowrap">
              <span>⭐</span> Saved
            </Link>
            {isLoggedIn ? (
              <>
                <Link to="/my-ads" className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all whitespace-nowrap">
                  My Ads
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all whitespace-nowrap">
                  Login
                </Link>
                <Link to="/signup" className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap">
                  Sign Up
                </Link>
              </>
            )}
            <button
              onClick={() => navigate(isLoggedIn ? '/create-ad' : '/login')}
              className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl
                         bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-xs sm:text-sm
                         shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
            >
              + Post Ad
            </button>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ===== BROWSE CATEGORIES ===== */}
        <section
          id="categories"
          className="relative bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 sticky top-[65px] z-30"
          onMouseLeave={() => setActiveTab(null)}
        >
          <div className="max-w-6xl mx-auto px-4">
            {/* Category Tabs */}
            <div className="relative">
              <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
                <div className="flex gap-0 min-w-max">
                {CATEGORIES.map((cat) => {
                  const isAdultCat = cat.id === "free-personals";
                  const activeColor = isAdultCat
                    ? "text-violet-700 dark:text-violet-300"
                    : "text-blue-600 dark:text-blue-400";
                  const indicatorGradient = isAdultCat
                    ? "from-violet-500 to-violet-700"
                    : "from-blue-500 to-blue-700";
                  return (
                  <button
                    key={cat.id}
                    onMouseEnter={() => setActiveTab(cat.id)}
                    onClick={() => setActiveTab(activeTab === cat.id ? null : cat.id)}
                    className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all cursor-pointer
                      ${activeTab === cat.id
                        ? activeColor
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span>{cat.title}</span>
                    </span>
                    {activeTab === cat.id && (
                      <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${indicatorGradient} rounded-t`} />
                    )}
                  </button>
                  );
                })}
                </div>
              </div>
              {/* Right-edge fade indicator */}
              <div className="pointer-events-none absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent" />
            </div>
          </div>

          {/* Subcategories Dropdown — absolutely positioned overlay so it doesn't push content */}
          {activeTab && (() => {
            const activeCat = CATEGORIES.find((c) => c.id === activeTab);
            if (!activeCat) return null;
            const subs = activeCat.subs;
            const isPersonals = activeCat.id === "free-personals";
            // Adult-services section gets a contained plum tint per palette guidance
            const dropdownBg = isPersonals
              ? "bg-violet-50/80 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900"
              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700";
            const headingColor = isPersonals
              ? "text-violet-700 dark:text-violet-300"
              : "text-zinc-400 dark:text-zinc-500";
            const linkHoverColor = isPersonals
              ? "hover:text-violet-700 dark:hover:text-violet-300"
              : "hover:text-blue-600 dark:hover:text-blue-400";
            const chevronHoverColor = isPersonals
              ? "group-hover:text-violet-500"
              : "group-hover:text-blue-400";
            return (
              <div className={`absolute left-0 right-0 top-full border-b shadow-xl z-40 ${dropdownBg}`}>
                <div className="max-w-6xl mx-auto px-4 py-5 sm:py-6">
                  <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${headingColor}`}>
                    {activeCat.icon} {activeCat.title}
                    {isPersonals && (
                      <span className="ml-2 text-[10px] font-semibold normal-case tracking-normal text-violet-600/80 dark:text-violet-400/80">
                        18+ · Adult services
                      </span>
                    )}
                  </h3>
                  <div className={`grid gap-x-8 gap-y-1.5 grid-cols-1 sm:grid-cols-2 ${subs.length > 8 ? 'md:grid-cols-4' : subs.length > 4 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {subs.map((sub) => (
                      <Link
                        key={sub.slug}
                        to={sub.link || (isPersonals ? `/escorts` : `/category/${activeCat.id}`)}
                        onClick={() => setActiveTab(null)}
                        className={`text-sm text-zinc-700 dark:text-zinc-300 transition-colors py-1 flex items-center gap-1.5 group ${linkHoverColor}`}
                      >
                        <span className={`text-zinc-300 dark:text-zinc-600 transition-colors ${chevronHoverColor}`}>›</span>
                        {sub.name}
                        {sub.popular && <span className="ml-auto text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">HOT</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* ===== HERO SECTION ===== */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-zinc-900/50" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-24">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-xs font-medium mb-5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Free boosted listings for early users
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                  Get More Replies on Your Ads
                  <span className="block mt-1">
                    <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-200 bg-clip-text text-transparent">— Faster &amp; Safer</span>
                  </span>
                </h1>

                <p className="mt-5 text-white/70 text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Free boosted listings for early users. No spam. No wasted time.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                  <button
                    onClick={() => navigate(isLoggedIn ? '/create-ad' : '/login')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                               bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base
                               shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>⚡</span> Post Your Ad in 60 Seconds
                  </button>
                  <button
                    onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                               bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold text-base
                               hover:bg-white/20 active:scale-[0.98] transition-all"
                  >
                    Browse Active Listings
                  </button>
                </div>
              </div>

              {/* Right: Search Card */}
              <div>
                <div className={`bg-white dark:bg-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/20 border border-white/20 dark:border-zinc-700 transition-all duration-300 ${searchFocused ? 'ring-2 ring-orange-400/50 shadow-orange-500/20' : ''}`}>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Find what you need</h2>
                  <form onSubmit={handleSearch} className="grid gap-4">
                    {/* Keyword input */}
                    <div>
                      <label htmlFor="kw" className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 tracking-wide mb-2">What are you looking for?</label>
                      <div className="relative">
                        <input
                          id="kw"
                          type="text"
                          placeholder="e.g. PS5, plumber, room to rent…"
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setSearchFocused(false)}
                          className="w-full h-12 border border-zinc-200 dark:border-zinc-600 rounded-xl pl-10 pr-4 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900 bg-zinc-50 dark:bg-zinc-700 hover:bg-white dark:hover:bg-zinc-600 transition-all"
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="cat" className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 tracking-wide mb-2">Category</label>
                      <select
                        id="cat"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full h-12 border border-zinc-200 dark:border-zinc-600 rounded-xl px-4 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900 bg-zinc-50 dark:bg-zinc-700 hover:bg-white dark:hover:bg-zinc-600 transition-all cursor-pointer"
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
                      <label htmlFor="geo" className="block text-xs font-bold text-zinc-600 dark:text-zinc-400 tracking-wide mb-2">Location</label>
                      <select
                        id="geo"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full h-12 border border-zinc-200 dark:border-zinc-600 rounded-xl px-4 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900 bg-zinc-50 dark:bg-zinc-700 hover:bg-white dark:hover:bg-zinc-600 transition-all cursor-pointer"
                      >
                        {UK_REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/30
                                 hover:shadow-orange-500/50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUST BAR ===== */}
        <section className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-5">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                { icon: "✅", text: "Verified users" },
                { icon: "⚡", text: "Fast responses" },
                { icon: "🛡️", text: "No spam / moderated listings" },
                { icon: "🇬🇧", text: "UK-based platform" },
              ].map((item) => (
                <span key={item.text} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <span className="text-base">{item.icon}</span> {item.text}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== LIVE STATS ===== */}
        {liveStats.totalAds > 0 && (
          <section className="bg-gradient-to-r from-amber-50 via-blue-50 to-blue-100 dark:from-orange-950/20 dark:via-blue-950/20 dark:to-purple-950/20 border-b border-zinc-100 dark:border-zinc-800">
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">📊</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  <span className="font-black text-blue-600 dark:text-blue-400">{liveStats.totalAds.toLocaleString()}</span> live listings
                </span>
              </div>
              {liveStats.postedThisWeek > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    <span className="font-black text-purple-600 dark:text-purple-400">{liveStats.postedThisWeek.toLocaleString()}</span> posted this week
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== LATEST LISTINGS ===== */}
        {latestListings.length > 0 && (
          <section className="py-10 sm:py-14 bg-white dark:bg-zinc-950">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">Latest Listings</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Fresh listings from across the platform</p>
                </div>
                <Link to="/search" className="hidden sm:inline-block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">View all →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {latestListings.map((ad) => {
                  const ICON_BY_SLUG = { vehicles:"🚗", property:"🏠", "buy-sell":"🛒", jobs:"💼", services:"🔧", community:"🤝", pets:"🐾", farming:"🌾" };
                  const slug = (ad.categorySlug || "").toLowerCase();
                  const img = ad.images?.[0];
                  return (
                    <Link
                      key={ad._id}
                      to={`/listing/${ad._id}`}
                      className="group rounded-2xl overflow-hidden bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center overflow-hidden">
                        {img ? (
                          <img src={img.startsWith("http") ? img : `${process.env.REACT_APP_API_URL || ""}${img}`} alt={ad.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <span className="text-5xl opacity-50">{ICON_BY_SLUG[slug] || "📦"}</span>
                        )}
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">{ad.category}</span>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-2 mb-1">{ad.title}</h3>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 dark:text-zinc-400 truncate">{ad.location}</span>
                          {ad.price > 0 && (
                            <span className="font-bold text-blue-600 dark:text-blue-400 ml-2 whitespace-nowrap">£{Number(ad.price).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===== VALUE SECTION — Why Choose Us ===== */}
        <section className="py-12 sm:py-16 bg-zinc-50 dark:bg-zinc-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">Why Choose Us</h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Everything you need to sell faster and buy smarter</p>
            </div>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              {[
                { icon: "🚀", title: "Your ad gets seen", desc: "We boost new listings so you get maximum visibility from day one." },
                { icon: "✨", title: "Cleaner, easier-to-use platform", desc: "No clutter, no confusion — just a fast, modern experience." },
                { icon: "🛡️", title: "Safer interactions with real users", desc: "Verified accounts and active moderation keep you protected." },
                { icon: "⚡", title: "Faster replies — no dead listings", desc: "Active community means real people responding to your ads." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 bg-white dark:bg-zinc-800 rounded-2xl p-5 sm:p-6 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-3xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== OFFER SECTION ===== */}
        <section className="relative overflow-hidden py-12 sm:py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              Post Now — Get Featured for Free
            </h2>
            <p className="mt-4 text-base sm:text-lg text-white/90 max-w-xl mx-auto leading-relaxed">
              We're promoting early users heavily. Your ad will appear at the top of listings for maximum visibility.
            </p>
            <button
              onClick={() => navigate(isLoggedIn ? '/create-ad' : '/login')}
              className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-zinc-900 font-bold text-base
                         shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>🔥</span> Post Free Ad Now
            </button>
          </div>
        </section>

        {/* ===== SPEED HOOK ===== */}
        <section className="py-12 sm:py-16 bg-white dark:bg-zinc-950">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm font-semibold mb-6">
              <span>⚡</span> Speed Guarantee
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900 dark:text-white leading-tight">
              Get Replies Within 24 Hours<br className="hidden sm:block" /> — Or We Boost Your Ad Again
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
              Our guarantee system ensures your listing stays visible until you get the results you need.
            </p>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-12 sm:py-16 bg-zinc-50 dark:bg-zinc-900">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">How It Works</h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Three simple steps to start getting replies</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { step: "1", icon: "📝", title: "Post your ad", desc: "Takes just 60 seconds. Add photos, description, and location." },
                { step: "2", icon: "🚀", title: "We boost it automatically", desc: "Your listing gets premium placement so buyers find it first." },
                { step: "3", icon: "💬", title: "Start getting replies", desc: "Real users reach out to you. Faster and safer than ever." },
              ].map((item) => (
                <div key={item.step} className="relative bg-white dark:bg-zinc-800 rounded-2xl p-6 sm:p-8 border border-zinc-100 dark:border-zinc-700 shadow-sm text-center hover:shadow-md transition-shadow">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-black shadow-lg">
                    {item.step}
                  </div>
                  <span className="text-4xl block mt-2 mb-4">{item.icon}</span>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SAFETY SECTION ===== */}
        <section className="py-12 sm:py-16 bg-white dark:bg-zinc-950">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 text-sm font-semibold mb-4">
                  <span>🔒</span> Your Safety First
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900 dark:text-white leading-tight">
                  Built for Safer Buying &amp; Selling
                </h2>
                <p className="mt-3 text-sm sm:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  We take safety seriously so you can focus on what matters — connecting with real people.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-1">
                {[
                  { icon: "🚨", title: "Report users instantly", desc: "One-tap reporting with our moderation team reviewing within hours." },
                  { icon: "✅", title: "Verified accounts", desc: "Email and identity verification builds trust between users." },
                  { icon: "👁️", title: "Active moderation", desc: "Our team monitors listings around the clock to remove bad actors." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 border border-zinc-100 dark:border-zinc-700">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{item.title}</h3>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-12 sm:py-16 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              Join early users getting more replies today
            </h2>
            <p className="mt-4 text-base text-white/60 max-w-lg mx-auto">
              Don't miss your chance to get featured listings for free. Start posting now.
            </p>
            <button
              onClick={() => navigate(isLoggedIn ? '/create-ad' : '/login')}
              className="mt-8 inline-flex items-center gap-2 px-10 py-4 rounded-xl
                         bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base
                         shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>🚀</span> Post Your Ad Now
            </button>
          </div>
        </section>

        {/* Testimonials / Trust Section */}
        <section className="py-16 bg-zinc-50 dark:bg-zinc-900">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white text-center mb-2">Trusted by Advertisers Across the UK</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-10">See what our users are saying</p>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { name: "Sarah T.", role: "Independent Advertiser", text: "ReachRipple doubled my profile visibility within the first week. The boost system actually works.", rating: 5 },
                { name: "James R.", role: "Agency Manager", text: "Finally a platform that takes safety seriously. Verification and reporting tools are top-notch.", rating: 5 },
                { name: "Mia K.", role: "Premium Advertiser", text: "The analytics dashboard helps me understand my audience. I can see exactly which listings perform best.", rating: 4 },
              ].map((t, i) => (
                <div key={i} className="bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-700 hover:shadow-md transition-shadow">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: 5 }, (_, s) => (
                      <svg key={s} className={`w-4 h-4 ${s < t.rating ? 'text-amber-400' : 'text-zinc-200'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4 leading-relaxed">"{t.text}"</p>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">{t.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRICING / PLANS ===== */}
        <section id="pricing" className="py-12 sm:py-16 bg-white dark:bg-zinc-950">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400 text-sm font-semibold mb-4">
                <span>💎</span> Simple Pricing
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">Choose Your Plan</h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Start free. Upgrade when you need more visibility.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: "Free",
                  price: "£0",
                  period: "forever",
                  bestFor: "Getting started",
                  features: ["1 active ad", "5 images per ad", "Standard placement", "Basic support"],
                  cta: "Start Free",
                  highlighted: false,
                  gradient: "from-zinc-500 to-zinc-600",
                },
                {
                  name: "Standard",
                  price: "£9.99",
                  period: "/month",
                  bestFor: "Regular advertisers",
                  features: ["3 active ads", "10 images per ad", "1 video per ad", "2h bump cooldown", "Email support"],
                  cta: "Upgrade",
                  highlighted: false,
                  gradient: "from-blue-500 to-indigo-600",
                },
                {
                  name: "Prime",
                  price: "£24.99",
                  period: "/month",
                  bestFor: "Power sellers",
                  features: ["5 active ads", "15 images per ad", "3 videos per ad", "1h bump cooldown", "10% boost discount", "Priority support"],
                  cta: "Go Prime",
                  highlighted: true,
                  gradient: "from-amber-500 to-orange-500",
                },
                {
                  name: "Spotlight",
                  price: "£49.99",
                  period: "/month",
                  bestFor: "Top performers",
                  features: ["10 active ads", "20 images per ad", "5 videos per ad", "30min bump cooldown", "20% boost discount", "Priority placement", "Dedicated support"],
                  cta: "Go Spotlight",
                  highlighted: false,
                  gradient: "from-amber-500 to-orange-600",
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-6 border transition-all hover:shadow-lg ${
                    plan.highlighted
                      ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-orange-950/30 dark:to-blue-950/30 border-orange-200 dark:border-orange-800 shadow-md ring-2 ring-orange-400/30"
                      : "bg-white dark:bg-zinc-800/60 border-zinc-100 dark:border-zinc-700 shadow-sm"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg">
                      Most Popular
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-white text-sm font-black shadow-lg mb-4`}>
                    {plan.name[0]}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Best for: {plan.bestFor}</p>
                  <div className="mt-3 mb-4">
                    <span className="text-3xl font-black text-zinc-900 dark:text-white">{plan.price}</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate(isLoggedIn ? '/dashboard' : '/signup')}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FAQ SECTION ===== */}
        <section className="py-12 sm:py-16 bg-zinc-50 dark:bg-zinc-900">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-zinc-900 dark:text-white">Frequently Asked Questions</h2>
              <p className="mt-2 text-sm sm:text-base text-zinc-500 dark:text-zinc-400">Everything you need to know before posting</p>
            </div>
            <div className="space-y-3">
              {[
                {
                  q: "Is it really free to post an ad?",
                  a: "Yes! The Free plan lets you post 1 ad with up to 5 images at no cost. You only pay if you want more ads, premium placement, or boost features.",
                },
                {
                  q: "How quickly will I get replies?",
                  a: "Most advertisers receive their first reply within 24 hours. Our boost system automatically increases your ad's visibility if it's not getting traction.",
                },
                {
                  q: "Is it safe to use ReachRipple?",
                  a: "Absolutely. We require email verification for all accounts, offer one-tap user reporting, and our moderation team reviews flagged content within hours. Your personal data is never shared.",
                },
                {
                  q: "How do boosts work?",
                  a: "Boosts push your ad to the top of search results and category pages for a set period. You can purchase boosts individually or get automatic discounts with Standard plan and above.",
                },
                {
                  q: "Can I manage multiple ads?",
                  a: "The Free plan allows 1 active ad. Standard supports 3, Prime supports 5, and Spotlight gives you up to 10 active ads simultaneously.",
                },
                {
                  q: "What categories can I post in?",
                  a: "We support Escorts, Massage & Wellness, Dating & Personals, Jobs & Services, Entertainment, Alternative Lifestyle, Buy & Sell, Vehicles, Property, and Adult Services.",
                },
              ].map((item, i) => (
                <details
                  key={i}
                  className="group bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">{item.q}</span>
                    <svg className="w-5 h-5 text-zinc-400 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile bottom navigation is mounted globally in App.jsx (MobileBottomBar). */}
      </main>

      <Footer />
    </div>
  );
}
