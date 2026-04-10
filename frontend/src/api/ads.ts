import api from "./client";

// Get current user's ads
export const getMyAds = async () => {
  const res = await api.get<GetAdsResponse>("/ads/my");
  return res.data;
};

// Delete an ad by ID (User Action)
export const deleteMyAd = async (adId: string) => {
  const res = await api.delete<{ message: string }>(`/ads/${adId}/user`);
  return res.data;
};

export interface PricingTier {
  price_15min?: string | number;
  price_30min?: string | number;
  price_1hour?: string | number;
  price_2hours?: string | number;
  price_3hours?: string | number;
  price_overnight?: string | number;
}

export interface ProfileFields {
  location?: string;
  type?: "Independent" | "Agency";
  gender?: string;
  age?: number;
  ethnicity?: string;
  languages?: string[];
  serviceFor?: string[];
}

export interface Video {
  url: string;
  uploadedAt: string;
  duration?: number;
}

export interface Ad {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  price: number;
  images: string[];
  status: "draft" | "pending" | "approved" | "rejected" | "hidden";
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  phone?: string;
  email?: string;
  services?: string[];
  age?: number;
  ethnicity?: string;
  bodyType?: string;
  pricing?: PricingTier;
  selectedServices?: string[];
  profileFields?: ProfileFields;
  videos?: Video[];
  views?: number;
  clicks?: number;
  tier?: "FEATURED" | "PRIORITY_PLUS" | "PRIORITY" | "STANDARD";
  tierUntil?: string;
  lastPulsedAt?: string;
  hasTapUp?: boolean;
  tapUpUntil?: string;
  websiteUrl?: string;
  hasNewLabel?: boolean;
  lastActive?: string;
  isOnline?: boolean;
}

export interface GetAdsResponse {
  ads: Ad[];
  total: number;
}

export interface GetAdsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  status?: string;
  // VivaStreet-style location filters
  locType?: "outcode" | "postcode" | "district";
  outcode?: string;
  district?: string;
  postcode?: string;
  d?: number;           // Distance in miles (VivaStreet-style, preferred)
  maxDistance?: number; // Legacy alias for 'd'
  // Age filters
  minAge?: number;
  maxAge?: number;
  // Price filters
  minPrice?: number;
  maxPrice?: number;
  // Profile filters
  ethnicity?: string;
  bodyType?: string;
  gender?: string;
  // Boolean filters (passed as "1" string)
  verified?: string;
  available?: string;
  independent?: string;
  // Services (comma-separated)
  services?: string;
  // Sorting
  sortBy?: string;
}

export const getAds = async (params?: GetAdsParams) => {
  const res = await api.get<GetAdsResponse>("/ads", { params });
  return res.data;
};

// Get single ad by ID (Public)
export const getAd = async (id: string) => {
  const res = await api.get<Ad>(`/ads/${id}`);
  return res.data;
};

export const createAd = async (payload: Partial<Ad>) => {
  const res = await api.post<Ad>("/ads", payload);
  return res.data;
};

// Update my own ad (User Action)
export const updateMyAd = async (id: string, payload: Partial<Ad> | FormData) => {
  const res = await api.put<Ad>(`/ads/${id}/user`, payload);
  return res.data;
};

// Admin update (Any Ad)
export const updateAd = async (id: string, payload: Partial<Ad>) => {
  const res = await api.put<Ad>(`/ads/${id}`, payload);
  return res.data;
};

export const approveAd = async (id: string) => {
  const res = await api.put<Ad>(`/ads/${id}/approve`);
  return res.data;
};

export const rejectAd = async (id: string) => {
  const res = await api.put<Ad>(`/ads/${id}/reject`);
  return res.data;
};

export const deleteAd = async (id: string) => {
  const res = await api.delete<{ message: string }>(`/ads/${id}`);
  return res.data;
};