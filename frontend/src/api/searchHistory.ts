import api from "./client";

export interface SearchHistoryEntry {
  _id: string;
  keyword?: string;
  location?: string;
  category?: string;
  distance?: number;
  ageRange?: { min?: number; max?: number };
  sortBy?: string;
  createdAt: string;
}

/** Get recent search history (last 20) */
export const getSearchHistory = async (): Promise<SearchHistoryEntry[]> => {
  const res = await api.get<SearchHistoryEntry[]>("/search-history");
  return res.data;
};

/** Save a search to history */
export const saveSearch = async (params: {
  keyword?: string;
  location?: string;
  category?: string;
  distance?: number;
  ageRange?: { min?: number; max?: number };
  sortBy?: string;
}): Promise<void> => {
  await api.post("/search-history", params);
};

/** Clear all search history */
export const clearSearchHistory = async (): Promise<void> => {
  await api.delete("/search-history");
};
