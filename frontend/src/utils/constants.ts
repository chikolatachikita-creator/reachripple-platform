/**
 * Global constants for the ReachRipple platform
 * These are used across multiple pages to maintain consistency
 */

// Service categories (escort types)
export const CATEGORIES = [
  "Escort",
  "Male Escort",
  "Trans",
  "Massage",
  "BDSM",
  "Other",
];

// UK locations
export const LOCATIONS = [
  "London",
  "Manchester",
  "Birmingham",
  "Leeds",
  "Liverpool",
  "Bristol",
  "Edinburgh",
  "Glasgow",
  "Cardiff",
  "Belfast",
];

// Extended locations (for search filters)
export const EXTENDED_LOCATIONS = {
  "North London": {
    aliases: ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9", "N10"],
    region: "London",
  },
  "East London": {
    aliases: ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10"],
    region: "London",
  },
  "South London": {
    aliases: ["SE1", "SE2", "SE3", "SE4", "SE5", "SE6", "SE7", "SE8"],
    region: "London",
  },
  "West London": {
    aliases: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"],
    region: "London",
  },
  "Central London": {
    aliases: ["WC1", "WC2", "EC1", "EC2"],
    region: "London",
  },
};

// Ethnicity options
export const ETHNICITIES = [
  "White",
  "Black",
  "Asian",
  "Latina",
  "Mixed",
  "Middle Eastern",
  "Other",
];

// Services offered by providers
export const SERVICES = [
  "Incall",
  "Outcall",
  "24/7",
  "Overnight",
  "GFE",
  "OWO",
  "Massage",
  "BDSM",
  "Couples",
  "Duo",
];

// Price ranges for filtering
export const PRICE_RANGES = [
  { min: 0, max: 100, label: "Under £100/hr" },
  { min: 100, max: 150, label: "£100-150/hr" },
  { min: 150, max: 200, label: "£150-200/hr" },
  { min: 200, max: 300, label: "£200-300/hr" },
  { min: 300, max: Infinity, label: "£300+/hr" },
];

// Age ranges for filtering
export const AGE_RANGES = [
  { min: 18, max: 22, label: "18-22" },
  { min: 23, max: 27, label: "23-27" },
  { min: 28, max: 32, label: "28-32" },
  { min: 33, max: 40, label: "33-40" },
  { min: 40, max: Infinity, label: "40+" },
];

// Body types
export const BODY_TYPES = [
  "Slim",
  "Athletic",
  "Curvy",
  "BBW",
  "Petite",
  "Tall",
  "Other",
];

// Distance options (in miles)
export const DISTANCE_OPTIONS = [1, 5, 10, 15, 20, 25, 30, 50, 100];

// Sort options for home page
export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "distance", label: "Closest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

// Admin panel settings
export const ADMIN_SETTINGS = {
  adsRequireApproval: true,
  maxImagesPerAd: 10,
  maxDescriptionLength: 2000,
  sessionTimeoutMinutes: 30,
};
