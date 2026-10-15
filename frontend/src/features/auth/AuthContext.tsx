"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole } from "@/types/user";
import { apiClient, ApiError } from "@/lib/api/client";

interface BackendUser {
  id: string;
  email?: string;
  username?: string;
  mobile?: string;
  role: UserRole;
  status: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "DELETED";
  displayName?: string;
  profileId?: string;
  createdAt: string;
}

function mapBackendUser(u: BackendUser): User {
  return {
    id: u.id,
    name: u.displayName || u.email || u.username || u.mobile || "User",
    email: u.email,
    username: u.username,
    phone: u.mobile,
    role: u.role,
    createdAt: u.createdAt,
  };
}

interface RegisterPayload {
  email?: string;
  phone?: string;
  password: string;
  role: UserRole;
  displayName: string;
  firstName?: string;
  lastName?: string;
}

interface PendingVerification {
  identifier: string;
  channel: "EMAIL" | "MOBILE";
  intendedRole: UserRole;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingVerification: PendingVerification | null;
  /** Logs in with an email, mobile number, or username (admins use username). */
  login: (identifier: string, password: string) => Promise<User>;
  /** Signs in / up with a Google ID token or Facebook access token. `role` is only needed for a brand-new account. */
  socialLogin: (provider: "google" | "facebook", token: string, role?: UserRole) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyCode: (code: string) => Promise<User>;
  resendCode: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);

  // The session lives in an HttpOnly cookie that JavaScript cannot read, so the
  // only way to know who is signed in is to ask the backend.
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<BackendUser>("/auth/me")
      .then((me) => {
        if (!cancelled) setUser(mapBackendUser(me));
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await apiClient.post<{ user: BackendUser }>("/auth/login", { identifier, password });
    const mapped = mapBackendUser(res.user);
    setUser(mapped);
    return mapped;
  }, []);

  const socialLogin = useCallback(async (provider: "google" | "facebook", token: string, role?: UserRole) => {
    const res = await apiClient.post<{ user: BackendUser }>("/auth/social", { provider, token, role });
    const mapped = mapBackendUser(res.user);
    setUser(mapped);
    return mapped;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await apiClient.post<{
      pendingVerification: boolean;
      verificationChannel: "EMAIL" | "MOBILE";
      identifier: string;
    }>("/auth/register", payload);

    setPendingVerification({
      identifier: res.identifier,
      channel: res.verificationChannel,
      intendedRole: payload.role,
    });
  }, []);

  const verifyCode = useCallback(
    async (code: string) => {
      if (!pendingVerification) {
        throw new ApiError("No verification pending", 400, null);
      }
      const res = await apiClient.post<{ user: BackendUser }>("/auth/verify-code", {
        identifier: pendingVerification.identifier,
        code,
      });
      const mapped = mapBackendUser(res.user);
      setUser(mapped);
      setPendingVerification(null);
      return mapped;
    },
    [pendingVerification]
  );

  const resendCode = useCallback(async () => {
    if (!pendingVerification) return;
    await apiClient.post("/auth/resend-code", { identifier: pendingVerification.identifier });
  }, [pendingVerification]);

  const logout = useCallback(() => {
    // Ask the backend to clear the HttpOnly cookie, then do a full navigation so
    // every portal's in-memory state (dashboards, cart) is discarded and the
    // middleware re-evaluates the (now absent) session.
    const finish = () => {
      setUser(null);
      setPendingVerification(null);
      if (typeof window !== "undefined") {
        document.cookie = "ls_guest=; path=/; max-age=0";
        window.location.assign("/login");
      }
    };
    apiClient.post("/auth/logout").then(finish, finish);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? "PUBLIC",
        isAuthenticated: !!user,
        isLoading,
        pendingVerification,
        login,
        socialLogin,
        register,
        verifyCode,
        resendCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
