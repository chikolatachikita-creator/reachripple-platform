import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCategoryBySlug } from "../config/categories";
import { getAssetUrl } from "../config/api";
import * as LucideIcons from "lucide-react";
import Footer from "../components/Footer";
import ThemeToggle from "../components/ThemeToggle";
import api from "../api/client";

/**
 * CategoryPage — Generic page for non-escort categories.
 * Shows hero banner, subcategory filter buttons, listing grid with pagination.
 * Escorts have their own dedicated page (EscortsHomePage).
 */
export default function CategoryPage() {
  const { categorySlug } = useParams();
  const category = getCategoryBySlug(categorySlug);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    const params = {
      category: category.name,
      page,
      limit: 20,
    };
    if (selectedSub !== "All") {
      params.subcategory = selectedSub;
    }
    if (sortBy) {
      params.sortBy = sortBy;
    }
    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }
    api.get("/ads", { params })
      .then((res) => {
        setListings(res.data.ads || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [category, selectedSub, page, sortBy, searchQuery]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Category Not Found</h1>
          <p className="text-gray-500 dark:text-zinc-400 mb-6">The category you're looking for doesn't exist.</p>
          <Link to="/" className="text-pink-600 hover:underline font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Dynamically get the Lucide icon component
  const IconComponent = LucideIcons[category.icon] || LucideIcons.Circle;
  const subcategories = ["All", ...(category.subcategories || [])];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Breadcrumbs */}
      <nav className="max-w-7xl mx-auto px-4 py-3 text-sm flex items-center justify-between" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <li><Link to="/" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">Home</Link></li>
          <li className="text-zinc-300 dark:text-zinc-600">/</li>
          <li className="text-zinc-800 dark:text-white font-medium">{category.name}</li>
        </ol>
        <ThemeToggle />
      </nav>

      {/* Hero Section */}
      <div className={`bg-gradient-to-r ${category.bgGradient} text-white`}>
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 md:py-16">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <IconComponent className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{category.name}</h1>
          </div>
          <p className="text-sm sm:text-base md:text-lg opacity-90 max-w-2xl">{category.description}</p>
          {!category.monetized && (
            <span className="mt-4 inline-block bg-white/20 backdrop-blur-sm text-sm px-3 py-1 rounded-full">
              Free Community Section
            </span>
          )}
        </div>
      </div>

      {/* Subcategory Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-wrap gap-2 overflow-x-auto hide-scrollbar scroll-momentum pb-1">
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => {
                setSelectedSub(sub);
                setPage(1);
              }}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap touch-target flex items-center justify-center ${
                selectedSub === sub
                  ? `bg-gradient-to-r ${category.bgGradient} text-white shadow-md`
                  : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={`Search ${category.name}...`}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full h-11 sm:h-10 border border-gray-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 bg-white dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="h-11 sm:h-10 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 text-sm outline-none focus:border-pink-400 bg-white dark:bg-zinc-800 dark:text-white cursor-pointer"
          >
            <option value="">Sort: Default</option>
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-3 sm:p-4 animate-pulse">
                <div className="bg-gray-200 dark:bg-zinc-700 h-36 sm:h-44 md:h-48 rounded-lg mb-3 sm:mb-4" />
                <div className="bg-gray-200 dark:bg-zinc-700 h-4 rounded w-3/4 mb-2" />
                <div className="bg-gray-200 dark:bg-zinc-700 h-4 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <IconComponent className={`w-16 h-16 mx-auto mb-4 ${category.color} opacity-40`} />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-zinc-400 mb-2">No listings yet</h3>
            <p className="text-gray-400 dark:text-zinc-500">Be the first to post in {category.name}!</p>
            <Link
              to={`/create-ad/${category.slug}`}
              className={`mt-6 inline-block px-6 py-3 bg-gradient-to-r ${category.bgGradient} text-white rounded-lg hover:shadow-lg transition-all font-medium`}
            >
              Post a Listing
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {listings.map((ad) => (
                <Link
                  key={ad._id}
                  to={`/profile/${ad._id}`}
                  className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-all group overflow-hidden"
                >
                  {ad.images && ad.images[0] ? (
                    <img
                      src={getAssetUrl(ad.images[0])}
                      alt={ad.title}
                      loading="lazy"
                      className="w-full h-36 sm:h-44 md:h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-full h-36 sm:h-44 md:h-48 bg-gradient-to-br ${category.bgGradient} opacity-20 flex items-center justify-center`}>
                      <IconComponent className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                      {ad.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{ad.location}</p>
                    {ad.price > 0 && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">£{ad.price}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 sm:gap-3 mt-8 sm:mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 sm:px-4 py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm touch-target"
                >
                  Previous
                </button>
                <span className="px-3 sm:px-4 py-2.5 text-gray-600 dark:text-zinc-400 text-sm">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 sm:px-4 py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm touch-target"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
