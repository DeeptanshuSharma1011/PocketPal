import React, { createContext, useContext, useState, useEffect } from "react";
import axios, { AxiosInstance } from "axios";
import { supabase } from "../supabaseClient.js";

export interface User {
  id: number;
  email: string;
  name: string;
  monthly_income: number;
  currency: string;
  profile_picture: string | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isDbConnected: boolean;
  dbStatusMessage: string;
  loading: boolean;
  api: AxiosInstance;
  login: (userData: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  checkServerStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Base API setup
const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [dbStatusMessage, setDbStatusMessage] = useState<string>("Checking connectivity...");
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state from Supabase on boot
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const suUser = session.user;
          const mappedUser = {
            id: suUser.id as any,
            email: suUser.email || "",
            name: suUser.user_metadata?.name || suUser.email?.split("@")[0] || "User",
            monthly_income: suUser.user_metadata?.monthly_income || 0,
            currency: suUser.user_metadata?.currency || "USD",
            profile_picture: suUser.user_metadata?.profile_picture || null,
          };
          setUser(mappedUser);
          setAccessToken(session.access_token);
          api.defaults.headers.common["Authorization"] = `Bearer ${session.access_token}`;
          localStorage.setItem("pocketpal_user", JSON.stringify(mappedUser));
          localStorage.setItem("pocketpal_access_token", session.access_token);
          if (session.refresh_token) {
            localStorage.setItem("pocketpal_refresh_token", session.refresh_token);
          }
        } else {
          localLogout();
        }
      } catch (err) {
        console.error("Failed to fetch Supabase session on boot:", err);
        localLogout();
      } finally {
        checkServerStatus().finally(() => {
          setLoading(false);
        });
      }
    };

    // Listen to Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const suUser = session.user;
        const mappedUser = {
          id: suUser.id as any,
          email: suUser.email || "",
          name: suUser.user_metadata?.name || suUser.email?.split("@")[0] || "User",
          monthly_income: suUser.user_metadata?.monthly_income || 0,
          currency: suUser.user_metadata?.currency || "USD",
          profile_picture: suUser.user_metadata?.profile_picture || null,
        };
        setUser(mappedUser);
        setAccessToken(session.access_token);
        api.defaults.headers.common["Authorization"] = `Bearer ${session.access_token}`;
        localStorage.setItem("pocketpal_user", JSON.stringify(mappedUser));
        localStorage.setItem("pocketpal_access_token", session.access_token);
        if (session.refresh_token) {
          localStorage.setItem("pocketpal_refresh_token", session.refresh_token);
        }
      } else if (event === "SIGNED_OUT") {
        localLogout();
      }
    });

    initAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);


  // Axios token refresh interceptor setup
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("pocketpal_access_token");
        if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If unauthorized and has not retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem("pocketpal_refresh_token");
          const isValidRefreshToken = refreshToken && refreshToken !== "null" && refreshToken !== "undefined" && refreshToken.trim() !== "";
          
          if (isValidRefreshToken) {
            try {
              // Attempt token refresh
              const res = await axios.post("/api/v1/auth/refresh", { refreshToken });
              if (res.data.success && res.data.data.accessToken) {
                const newAccessToken = res.data.data.accessToken;
                
                // Save new access token
                localStorage.setItem("pocketpal_access_token", newAccessToken);
                setAccessToken(newAccessToken);
                
                // Update default headers
                api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
                originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
                
                return api(originalRequest);
              }
            } catch (refreshError) {
              console.error("[Auth Context] Auto refresh failed:", refreshError);
              // Revoke authentication on refresh failure
              localLogout();
            }
          } else {
            localLogout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await api.get("/auth/status").catch(() => null);
      if (res && res.data && res.data.success) {
        setIsDbConnected(res.data.database.connected);
        setDbStatusMessage(res.data.database.message);
        if (res.data.user && !user) {
          setUser(res.data.user);
        }
      } else {
        // Simple health status check as secondary fallback
        const health = await axios.get("/api/v1/health").catch(() => null);
        if (health) {
          setIsDbConnected(false);
          setDbStatusMessage("Running in Sandboxed/Local Memory Mode.");
        } else {
          setIsDbConnected(false);
          setDbStatusMessage("Server connection pending.");
        }
      }
    } catch {
      setIsDbConnected(false);
      setDbStatusMessage("Running in Offline/Sandboxed Mode.");
    }
  };

  const login = (userData: User, token: string, refresh: string) => {
    localStorage.setItem("pocketpal_user", JSON.stringify(userData));
    localStorage.setItem("pocketpal_access_token", token);
    localStorage.setItem("pocketpal_refresh_token", refresh);
    
    setUser(userData);
    setAccessToken(token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const localLogout = () => {
    localStorage.removeItem("pocketpal_user");
    localStorage.removeItem("pocketpal_access_token");
    localStorage.removeItem("pocketpal_refresh_token");
    
    setUser(null);
    setAccessToken(null);
    delete api.defaults.headers.common["Authorization"];
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out of Supabase:", err);
    }
    const refreshToken = localStorage.getItem("pocketpal_refresh_token");
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken }).catch(() => null);
    }
    localLogout();
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem("pocketpal_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isDbConnected,
        dbStatusMessage,
        loading,
        api,
        login,
        logout,
        updateUser,
        checkServerStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
