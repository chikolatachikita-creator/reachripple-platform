import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getMe, logout as logoutAPI, adminLogout as adminLogoutAPI } from "../api/auth";
import { clearTokens } from "../api/client";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: string;
  createdAt?: string;
  accountType?: "independent" | "agency";
  postingPlan?: "free" | "basic" | "premium";
  verificationStatus?: string;
  idVerificationStatus?: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isAgency: boolean;
  isLoading: boolean;
  error: string | null;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize user from API on mount
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const currentUser = await getMe();
        if (currentUser) {
          setUser(currentUser as User);
          setError(null);
        } else {
          // Token existed but /auth/me failed (e.g. 401). Clear stale
          // session so the UI doesn't render a logged-in shell.
          clearTokens();
          localStorage.removeItem("userId");
          localStorage.removeItem("userName");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userRole");
          setUser(null);
        }
      } catch (err) {
        console.error("Failed to initialize user:", err);
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (token) {
      initializeUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Periodically check if session is still valid (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const sessionCheckInterval = setInterval(async () => {
      try {
        const currentUser = await getMe();
        if (!currentUser) {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err: any) {
        // Only logout on auth errors (401/403), not network issues or server errors
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          handleLogout();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes (reduced from 60s)

    return () => clearInterval(sessionCheckInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setError(null);
  };

  const handleLogout = () => {
    const isAdmin = user?.role === "admin";
    setUser(null);
    if (isAdmin) {
      adminLogoutAPI();
    } else {
      logoutAPI();
    }
    // Clear all user data from localStorage
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
  };

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getMe();
      if (currentUser) {
        setUser(currentUser as User);
        setError(null);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to refresh user";
      setError(message);
      console.error("Failed to refresh user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    isAdmin: user?.role === "admin",
    isAgency: user?.accountType === "agency",
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
