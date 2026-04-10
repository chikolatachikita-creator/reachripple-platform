import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCategoryBySlug } from "../config/categories";
import * as LucideIcons from "lucide-react";
import Footer from "../components/Footer";
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
    api.get("/ads", { params })
      .then((res) => {
        setListings(res.data.ads || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [category, selectedSub, page]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Category Not Found</h1>
          <p className="text-gray-500 mb-6">The category you're looking for doesn't exist.</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className={`bg-gradient-to-r ${category.bgGradient} text-white`}>
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center gap-4 mb-4">
            <IconComponent className="w-10 h-10" />
            <h1 className="text-4xl font-bold">{category.name}</h1>
          </div>
          <p className="text-lg opacity-90 max-w-2xl">{category.description}</p>
          {!category.monetized && (
            <span className="mt-4 inline-block bg-white/20 backdrop-blur-sm text-sm px-3 py-1 rounded-full">
              Free Community Section
            </span>
          )}
        </div>
      </div>

      {/* Subcategory Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => {
                setSelectedSub(sub);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedSub === sub
                  ? `bg-gradient-to-r ${category.bgGradient} text-white shadow-md`
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
                <div className="bg-gray-200 h-48 rounded-lg mb-4" />
                <div className="bg-gray-200 h-4 rounded w-3/4 mb-2" />
                <div className="bg-gray-200 h-4 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <IconComponent className={`w-16 h-16 mx-auto mb-4 ${category.color} opacity-40`} />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No listings yet</h3>
            <p className="text-gray-400">Be the first to post in {category.name}!</p>
            <Link
              to={`/create-ad/${category.slug}`}
              className={`mt-6 inline-block px-6 py-3 bg-gradient-to-r ${category.bgGradient} text-white rounded-lg hover:shadow-lg transition-all font-medium`}
            >
              Post a Listing
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {listings.map((ad) => (
                <Link
                  key={ad._id}
                  to={`/profile/${ad._id}`}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all group overflow-hidden"
                >
                  {ad.images && ad.images[0] ? (
                    <img
                      src={ad.images[0]}
                      alt={ad.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-full h-48 bg-gradient-to-br ${category.bgGradient} opacity-20 flex items-center justify-center`}>
                      <IconComponent className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 truncate group-hover:text-pink-600 transition-colors">
                      {ad.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{ad.location}</p>
                    {ad.price > 0 && (
                      <p className="text-lg font-bold text-gray-900 mt-2">£{ad.price}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
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
