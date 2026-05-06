import api, { setTokens, clearTokens } from "./client";

interface AuthResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
}

interface GetMeResponse {
  user: User;
}

export const register = async (name: string, email: string, password: string) => {
  const res = await api.post<AuthResponse>("/auth/register", { name, email, password });
  const { accessToken, refreshToken, user } = res.data;

  setTokens(accessToken, refreshToken);
  return user;
};

export const login = async (email: string, password: string) => {
  const res = await api.post<AuthResponse>("/auth/login", { email, password });
  const { accessToken, refreshToken, user } = res.data;

  setTokens(accessToken, refreshToken);
  return user;
};

export const getMe = async (): Promise<User | null> => {
  try {
    const res = await api.get<GetMeResponse>("/auth/me");
    return res.data.user;
  } catch (err) {
    console.error("Failed to fetch current user", err);
    return null;
  }
};

export const logout = async () => {
  try {
    // SECURITY: Call backend logout endpoint to clear server-side session
    await api.post("/auth/logout");
  } catch (err) {
    console.error("Logout API call failed", err);
    // Continue with local logout even if API call fails
  }
  // Clear local tokens regardless of API response
  clearTokens();
};

export const adminLogin = async (email: string, password: string) => {
  const res = await api.post<AuthResponse>("/admin/auth/login", { email, password });
  const { accessToken, refreshToken, user } = res.data;

  setTokens(accessToken, refreshToken);
  return user;
};

export const adminLogout = async () => {
  try {
    await api.post("/admin/auth/logout");
  } catch (err) {
    console.error("Admin logout API call failed", err);
  }
  clearTokens();
};

export const forgotPassword = async (email: string) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

// ============ OAuth ============

export type OAuthProvider = "google" | "github" | "facebook" | "apple";

export interface OAuthConfig {
  google:   { enabled: boolean; clientId: string | null; redirectUri: string };
  github:   { enabled: boolean; clientId: string | null };
  facebook: { enabled: boolean; clientId: string | null; redirectUri: string };
  apple:    { enabled: boolean; clientId: string | null; redirectUri: string };
}

export const getOAuthConfig = async (): Promise<OAuthConfig> => {
  const res = await api.get<OAuthConfig>("/auth/oauth/config");
  return res.data;
};

export const oauthLogin = async (
  provider: OAuthProvider,
  code: string,
  extra?: { user?: { name?: { firstName?: string; lastName?: string } } }
) => {
  const body: any = { code };
  if (provider === "apple" && extra?.user) body.user = extra.user;
  const res = await api.post<AuthResponse>(`/auth/oauth/${provider}`, body);
  const { accessToken, refreshToken, user } = res.data;

  setTokens(accessToken, refreshToken);
  return user;
};
