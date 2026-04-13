import api from "./client";

/**
 * Boost API Client
 * Handles all boost/tier purchase and status operations
 */

export interface BoostPricing {
  boostType: string;
  tier: string;
  location: string;
  basePriceGBP: number;
  demandMultiplier: number;
  durationFactor: number;
  finalPriceGBP: number;
  availableSlots: number;
  durations: number[];
}

export interface BoostPurchase {
  _id: string;
  userId: string;
  adId: string;
  boostType: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'refunded';
  purchasedAt: string;
  expiresAt: string;
  pricing: {
    basePriceGBP: number;
    demandMultiplier: number;
    durationFactor: number;
    finalPriceGBP: number;
  };
}

export interface BoostStatus {
  ad: {
    tier: string;
    tierUntil?: string;
    hasTapUp: boolean;
    tapUpUntil?: string;
    hasNewLabel: boolean;
    newLabelUntil?: string;
  };
  activeBoosts: BoostPurchase[];
}

/**
 * VIP Sold Out error response structure
 * Returned when VIP capacity is full for a location
 */
export interface VipSoldOutError {
  success: false;
  code: 'FEATURED_SOLD_OUT' | 'PRIORITY_PLUS_SOLD_OUT';
  error: string;
  featured?: {
    cap: number;
    active: number;
    remaining: number;
  };
  suggested: {
    tier: 'PRIORITY_PLUS' | 'PRIORITY';
    available: boolean;
    displayName: string;
  };
}

export interface HomeData {
  vip: any[];
  featured: any[];
  standard: any[];
  totalCount: number;
  seed: string;
  location: string;
  timestamp: number;
}

/**
 * Get pricing matrix for all boost types
 */
export const getBoostPricing = async (location: string = 'gb', durationDays: number = 7) => {
  const res = await api.get<{ pricing: BoostPricing[] }>('/boost/pricing', {
    params: { location, durationDays }
  });
  return res.data.pricing;
};

/**
 * Purchase a boost for an ad
 * 
 * @throws VipSoldOutError if VIP/PRIME capacity is full (409 response)
 *         - Check error.response.data.code === 'FEATURED_SOLD_OUT' or 'PRIORITY_PLUS_SOLD_OUT'
 *         - error.response.data.suggested contains fallback tier info
 */
export const purchaseBoost = async (
  adId: string, 
  boostType: 'FEATURED' | 'PRIORITY_PLUS' | 'PRIORITY' | 'STANDARD' | 'HIGHLIGHT' | 'EXTERNAL_LINK',
  durationDays: number = 7
) => {
  const res = await api.post<{ success: boolean; purchase: BoostPurchase; message: string }>('/boost/purchase', {
    adId,
    boostType,
    durationDays
  });
  return res.data;
};

/**
 * Get current user's active boosts
 */
export const getMyBoosts = async () => {
  const res = await api.get<{ boosts: BoostPurchase[] }>('/boost/my-boosts');
  return res.data.boosts;
};

/**
 * Get boost status for a specific ad
 */
export const getBoostStatus = async (adId: string) => {
  const res = await api.get<BoostStatus>(`/boost/status/${adId}`);
  return res.data;
};

/**
 * Get boost purchase history
 */
export const getBoostHistory = async (limit: number = 20) => {
  const res = await api.get<{ purchases: BoostPurchase[]; total: number }>('/boost/history', {
    params: { limit }
  });
  return res.data;
};

/**
 * Get home page data with tiered listings
 */
export const getHomeData = async (location: string = '', limit: number = 50, category?: string) => {
  const params: Record<string, any> = { location, limit };
  if (category) params.category = category;
  const res = await api.get<HomeData>('/home', { params, timeout: 45000 });
  return res.data;
};

/**
 * Get VIP spotlight listings only
 */
export const getVIPListings = async (location: string = '', limit: number = 12) => {
  const res = await api.get<{ ads: any[]; total: number }>('/home/vip', {
    params: { location, limit }
  });
  return res.data;
};

/**
 * Get Featured listings only
 */
export const getFeaturedListings = async (location: string = '', limit: number = 16) => {
  const res = await api.get<{ ads: any[]; total: number }>('/home/featured', {
    params: { location, limit }
  });
  return res.data;
};

/**
 * Get standard feed listings (with pagination)
 */
export const getFeedListings = async (location: string = '', page: number = 1, limit: number = 20) => {
  const res = await api.get<{ ads: any[]; total: number; page: number; hasMore: boolean }>('/home/feed', {
    params: { location, page, limit }
  });
  return res.data;
};

/**
 * Trigger manual Tumble Up (bump)
 */
export const tumbleUp = async (adId: string) => {
  const res = await api.post<{ 
    success: boolean; 
    message: string; 
    lastPulsedAt?: string;
    cooldownUntil?: string;
    upgradeRequired?: boolean;
  }>(`/ads/${adId}/tumble-up`);
  return res.data;
};

/**
 * Activate Tap Up auto-bump
 */
export const activateTapUp = async (adId: string, intervalHours: number = 12, durationDays: number = 7) => {
  const res = await api.post<{ 
    success: boolean; 
    message: string; 
    hasTapUp: boolean;
    tapUpUntil: string;
    nextTapUpAt: string;
  }>(`/ads/${adId}/tap-up/activate`, {
    intervalHours,
    durationDays
  });
  return res.data;
};

/**
 * Deactivate Tap Up auto-bump
 */
export const deactivateTapUp = async (adId: string) => {
  const res = await api.post<{ success: boolean; message: string }>(`/ads/${adId}/tap-up/deactivate`);
  return res.data;
};

/**
 * Get bump status for an ad
 */
export const getBumpStatus = async (adId: string) => {
  const res = await api.get<{
    lastPulsedAt: string;
    pulseCooldownUntil?: string;
    canTumbleUp: boolean;
    hasTapUp: boolean;
    tapUpUntil?: string;
    tapUpIntervalHours: number;
    nextTapUpAt?: string;
    tier: string;
    tierUntil?: string;
    isNewArrival: boolean;
    qualityScore: number;
  }>(`/ads/${adId}/bump-status`);
  return res.data;
};
