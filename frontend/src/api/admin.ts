import api from "./client";

// ============ STATS ============
export interface AdminStats {
  ads: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  users: {
    total: number;
    active: number;
    suspended: number;
  };
  reports: {
    total: number;
    pending: number;
  };
  today: {
    signups: number;
    ads: number;
  };
  recentActivity: {
    _id: string;
    adminEmail: string;
    action: string;
    targetType: string;
    description: string;
    createdAt: string;
  }[];
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const res = await api.get<AdminStats>("/admin/stats");
  return res.data;
};

// ============ ADS ============
export interface AdminAd {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  price: number;
  images: string[];
  age?: number;
  ethnicity?: string;
  bodyType?: string;
  status: "pending" | "approved" | "rejected";
  userId?: { _id: string; name: string; email: string } | string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetAdminAdsResponse {
  ads: AdminAd[];
  total: number;
}

export const getAdminAds = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  q?: string;
}): Promise<GetAdminAdsResponse> => {
  const res = await api.get<GetAdminAdsResponse>("/admin/ads", { params });
  return res.data;
};

export const updateAdStatus = async (
  id: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<AdminAd> => {
  const res = await api.patch<AdminAd>(`/admin/ads/${id}/status`, { status, rejectionReason });
  return res.data;
};

export const deleteAdminAd = async (id: string): Promise<void> => {
  await api.delete(`/admin/ads/${id}`);
};

// ============ USERS ============
export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const getAdminUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}): Promise<GetUsersResponse> => {
  const res = await api.get<GetUsersResponse>("/admin/users", { params });
  return res.data;
};

export const updateUserStatus = async (
  id: string,
  status: "active" | "suspended"
): Promise<AdminUser> => {
  const res = await api.patch<AdminUser>(`/admin/users/${id}/status`, { status });
  return res.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};

// ============ REPORTS ============
export interface AdminReport {
  _id: string;
  adId: {
    _id: string;
    title: string;
    status?: string;
  } | string;
  reporterId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  reason: string;
  description?: string;
  status: "pending" | "reviewing" | "reviewed" | "dismissed";
  adminNotes?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetReportsResponse {
  reports: AdminReport[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const getAdminReports = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<GetReportsResponse> => {
  const res = await api.get<GetReportsResponse>("/admin/reports", { params });
  return res.data;
};

export const resolveReport = async (
  id: string,
  status: "reviewing" | "reviewed" | "dismissed",
  adminNotes?: string
): Promise<AdminReport> => {
  const res = await api.patch<AdminReport>(`/admin/reports/${id}/resolve`, { status, adminNotes });
  return res.data;
};

// ============ SETTINGS ============
export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  maintenanceMode: boolean;
  adsRequireApproval: boolean;
  maxImagesPerAd: number;
}

export const getSettings = async (): Promise<SiteSettings> => {
  const res = await api.get<SiteSettings>("/admin/settings");
  return res.data;
};

export const updateSettings = async (settings: Partial<SiteSettings>): Promise<SiteSettings> => {
  const res = await api.post<SiteSettings>("/admin/settings", settings);
  return res.data;
};

// ============ PRICING / PAYMENT SETTINGS ============
export type PricingSettings = Record<string, string>;

export const getPricingSettings = async (): Promise<PricingSettings> => {
  const res = await api.get<PricingSettings>("/admin/settings/pricing");
  return res.data;
};

export const updatePricingSettings = async (
  settings: Partial<PricingSettings>
): Promise<PricingSettings> => {
  const res = await api.post<PricingSettings>("/admin/settings/pricing", settings);
  return res.data;
};

// ============ ANALYTICS ============
export interface DailyDataPoint {
  date: string;
  count: number;
}

export interface AnalyticsData {
  period: { days: number; startDate: string };
  daily: {
    signups: DailyDataPoint[];
    ads: DailyDataPoint[];
    reports: DailyDataPoint[];
  };
  breakdowns: {
    adsByStatus: Record<string, number>;
    adsByTier: Record<string, number>;
    usersByStatus: Record<string, number>;
    usersByType: Record<string, number>;
    reportsByStatus: Record<string, number>;
  };
  adminActivity: Record<string, number>;
}

export const getAnalytics = async (days?: number): Promise<AnalyticsData> => {
  const res = await api.get<AnalyticsData>("/admin/analytics", {
    params: days ? { days } : undefined,
  });
  return res.data;
};

// ============ MODERATION ============

export interface ModerationAd {
  _id: string;
  title: string;
  images: string[];
  moderationStatus: string;
  moderationScore: number;
  moderationFlags: string[];
  moderationNote?: string;
  moderationReviewedAt?: string;
  moderationReviewedBy?: { name: string; email: string };
  status: string;
  phone?: string;
  location?: string;
  createdAt: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    riskScore?: number;
    riskLevel?: string;
    isUnderReview?: boolean;
    idVerificationStatus?: string;
  };
}

export interface ModerationQueueResponse {
  ads: ModerationAd[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  statusCounts: Record<string, number>;
}

export interface RiskUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  riskScore: number;
  riskLevel: string;
  isUnderReview: boolean;
  adsRejectedCount: number;
  totalAdsPosted: number;
  idVerificationStatus: string;
  isActive: boolean;
  createdAt: string;
}

export interface RiskUsersResponse {
  users: RiskUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  riskLevelCounts: Record<string, number>;
}

export interface ModerationStats {
  moderation: Record<string, { count: number; avgScore: number }>;
  riskLevels: Record<string, { count: number; avgRiskScore: number }>;
  recentActions: any[];
  queueSize: number;
}

export const getModerationQueue = async (params?: {
  page?: number; limit?: number; status?: string;
}): Promise<ModerationQueueResponse> => {
  const res = await api.get<ModerationQueueResponse>("/admin/moderation/queue", { params });
  return res.data;
};

export const moderateAd = async (
  id: string,
  data: { action: string; note?: string; rejectionReason?: string }
): Promise<{ success: boolean; moderationStatus: string; message: string }> => {
  const res = await api.patch(`/admin/moderation/${id}/moderate`, data);
  return res.data;
};

export const getRiskUsers = async (params?: {
  page?: number; limit?: number; level?: string;
}): Promise<RiskUsersResponse> => {
  const res = await api.get<RiskUsersResponse>("/admin/moderation/risk-users", { params });
  return res.data;
};

export const getModerationStats = async (): Promise<ModerationStats> => {
  const res = await api.get<ModerationStats>("/admin/moderation/stats");
  return res.data;
};

export const triggerPatternScan = async (): Promise<{ message: string; report: any }> => {
  const res = await api.post("/admin/moderation/scan");
  return res.data;
};

export const recalculateUserRisk = async (userId: string): Promise<any> => {
  const res = await api.post(`/admin/moderation/recalculate-risk/${userId}`);
  return res.data;
};

// ============ REVENUE ============

export interface RevenueOverview {
  period: string;
  current: {
    totalRevenue: number;
    totalTransactions: number;
    uniqueUsers: number;
    uniqueAds: number;
  };
  previous: {
    totalRevenue: number;
    totalTransactions: number;
  };
  percentChange: {
    revenue: string | number;
    transactions: string | number;
  };
  productBreakdown: {
    product: string;
    revenue: number;
    count: number;
    percentage: string | number;
  }[];
  recentPurchases: {
    id: string;
    product: string;
    price: number;
    date: string;
    user: string;
    adTitle: string;
  }[];
}

export interface RevenueTrend {
  period: string;
  totalRevenue: number;
  totalCount: number;
  products: { product: string; revenue: number; count: number }[];
}

export interface LocationRevenue {
  location: string;
  revenue: number;
  transactions: number;
  uniqueAds: number;
}

export interface InventoryLocation {
  location: string;
  featured: number;
  featuredCap: number;
  featuredFillRate: string;
  priorityPlus: number;
  priorityPlusCap: number;
  priorityPlusFillRate: string;
  total: number;
}

export const getRevenueOverview = async (period?: string): Promise<RevenueOverview> => {
  const res = await api.get<RevenueOverview>("/admin/revenue/overview", { params: { period } });
  return res.data;
};

export const getRevenueTrends = async (period?: string, groupBy?: string): Promise<{ trends: RevenueTrend[] }> => {
  const res = await api.get("/admin/revenue/trends", { params: { period, groupBy } });
  return res.data;
};

export const getRevenueByLocation = async (period?: string): Promise<{ locations: LocationRevenue[] }> => {
  const res = await api.get("/admin/revenue/by-location", { params: { period } });
  return res.data;
};

export const getRevenueInventory = async (): Promise<{ caps: any; locations: InventoryLocation[] }> => {
  const res = await api.get("/admin/revenue/inventory");
  return res.data;
};

export const getRevenueExpiring = async (hours?: number): Promise<{ count: number; ads: any[] }> => {
  const res = await api.get("/admin/revenue/expiring", { params: { hours } });
  return res.data;
};

// ============ NETWORK & INVESTIGATIONS ============

export const getNetworkStats = async (): Promise<any> => {
  const res = await api.get("/admin/network/stats");
  return res.data;
};

export const getNetworkClusters = async (): Promise<{ clusters: any[] }> => {
  const res = await api.get<{ clusters: any[] }>("/admin/network/clusters");
  return res.data;
};

export const getUserNetwork = async (userId: string): Promise<any> => {
  const res = await api.get(`/admin/network/user/${userId}`);
  return res.data;
};

export const getUserSignals = async (userId: string): Promise<any> => {
  const res = await api.get(`/admin/network/signals/${userId}`);
  return res.data;
};

export const triggerClusterScan = async (): Promise<any> => {
  const res = await api.post("/admin/network/scan");
  return res.data;
};

export const getInvestigationCases = async (params?: {
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}): Promise<{ cases: any[]; total: number }> => {
  const res = await api.get("/admin/network/cases", { params });
  return res.data;
};

export const getInvestigationCase = async (id: string): Promise<any> => {
  const res = await api.get(`/admin/network/cases/${id}`);
  return res.data;
};

export const updateInvestigationCase = async (id: string, data: any): Promise<any> => {
  const res = await api.patch(`/admin/network/cases/${id}`, data);
  return res.data;
};

export const createInvestigationCase = async (data: any): Promise<any> => {
  const res = await api.post("/admin/network/cases", data);
  return res.data;
};
