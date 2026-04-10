import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3001/api";
const LOCALTUNNEL_BYPASS_HEADERS = API_BASE_URL.includes(".loca.lt")
  ? { "bypass-tunnel-reminder": "true" }
  : {};

// --------------------
// Token storage helpers
// --------------------
// Access token stored in memory (not localStorage) — more secure against XSS
// Refresh token is in HttpOnly cookie (set by backend, never accessible to JS)
// Fallback to localStorage for backward compatibility during migration
const ACCESS_TOKEN_KEY = "accessToken";

/**
 * Validates token format to prevent injection attacks
 * JWT tokens should be in format: header.payload.signature
 */
const isValidToken = (token: string | null): token is string => {
  if (!token || typeof token !== "string") return false;
  // JWT format: three base64url encoded parts separated by dots
  const parts = token.split(".");
  return parts.length === 3 && parts.every(part => part.length > 0);
};

// In-memory access token (preferred, survives no page reload)
let inMemoryAccessToken: string | null = null;

export const getAccessToken = (): string | null => {
  // Prefer in-memory token, fall back to localStorage
  if (isValidToken(inMemoryAccessToken)) return inMemoryAccessToken;
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return isValidToken(token) ? token : null;
};

export const getRefreshToken = (): string | null => {
  // Refresh token is now in HttpOnly cookie — JS cannot read it
  // This function exists for backward compatibility only
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("refreshToken");
  return isValidToken(token) ? token : null;
};

export const setTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window === "undefined") return;
  
  // Validate tokens before storing
  if (!isValidToken(accessToken)) {
    return;
  }
  
  // Store access token in memory + localStorage (for page reloads)
  inMemoryAccessToken = accessToken;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  
  // Refresh token is now set as HttpOnly cookie by backend
  // Still store in localStorage for backward compat during migration
  if (refreshToken && isValidToken(refreshToken)) {
    localStorage.setItem("refreshToken", refreshToken);
  }
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  inMemoryAccessToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem("refreshToken");
};

// --------------------
// Axios instance
// --------------------
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,  // 30 second timeout prevents hanging requests
  headers: LOCALTUNNEL_BYPASS_HEADERS,
});

// --------------------
// Request interceptor
// --------------------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --------------------
// Refresh handling
// --------------------
let isRefreshing = false;
let pendingQueue: Array<(token?: string) => void> = [];

const processQueue = (newToken?: string) => {
  pendingQueue.forEach((resolve) => resolve(newToken));
  pendingQueue = [];
};

const refreshAccessToken = async (): Promise<string | null> => {
  // Refresh token is in HttpOnly cookie, sent automatically with withCredentials
  // Fall back to body-based refresh for backward compatibility
  const refreshToken = getRefreshToken();

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      refreshToken ? { refreshToken } : {},
      {
        withCredentials: true, // Ensures HttpOnly cookie is sent
        headers: LOCALTUNNEL_BYPASS_HEADERS,
      }
    );

    const newAccessToken = response.data.accessToken as string;
    if (newAccessToken) {
      setTokens(newAccessToken); // keep existing refresh token
      return newAccessToken;
    }
    return null;
  } catch (err) {
    clearTokens();
    return null;
  }
};

// --------------------
// Response interceptor
// --------------------
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    const status = error.response?.status;
    const url = originalRequest?.url as string | undefined;

    const isAuthEndpoint =
      url?.includes("/auth/login") || url?.includes("/auth/refresh");

    // If unauthorized and not already retried, try refresh
    if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue up this request until refresh is done
        return new Promise((resolve) => {
          pendingQueue.push((token?: string) => {
            if (token) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshAccessToken();
      isRefreshing = false;
      processQueue(newToken || undefined);

      if (!newToken) {
        clearTokens();
        // Optional: redirect to login
        // if (typeof window !== "undefined") {
        //   window.location.href = "/login";
        // }
        return Promise.reject(error);
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;