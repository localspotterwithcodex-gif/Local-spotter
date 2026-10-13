"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, UserRole } from "@/types/user";
import { apiClient, setToken, getToken, ApiError } from "@/lib/api/client";

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

  const hydrate = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await apiClient.get<BackendUser>("/auth/me");
      setUser(mapBackendUser(me));
      // Re-write the middleware cookie alongside the confirmed-valid token.
      // The cookie (read by middleware.ts at the edge) and the localStorage
      // token (read here, client-side) are two separate copies of the same
      // fact; if they ever drift — e.g. the cookie's max-age lapsed, or it
      // was cleared by the browser while localStorage wasn't — the user
      // ends up in the exact state seen in these screenshots: the app
      // renders as fully logged in (this hydrate call succeeded) while
      // middleware still bounces every navigation to /login because *it*
      // sees no cookie. Refreshing the cookie here every time hydrate
      // succeeds self-heals that drift instead of letting it persist for
      // the rest of the session.
      setToken(token);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await apiClient.post<{ accessToken: string; user: BackendUser }>(
      "/auth/login",
      { identifier, password },
      { auth: false }
    );
    setToken(res.accessToken);
    const mapped = mapBackendUser(res.user);
    setUser(mapped);
    return mapped;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await apiClient.post<{
      pendingVerification: boolean;
      verificationChannel: "EMAIL" | "MOBILE";
      identifier: string;
    }>("/auth/register", payload, { auth: false });

    setPendingVerification({
      identifier: res.identifier,
      channel: res.verificationChannel,
      intendedRole: payload.role,
    });
  }, []);

  const verifyCode = useCallback(
    async (code: string) => {
      if (!pendingVerification) {
        throw new ApiError("Geen verificatie in behandeling", 400, null);
      }
      const res = await apiClient.post<{ accessToken: string; user: BackendUser }>(
        "/auth/verify-code",
        { identifier: pendingVerification.identifier, code },
        { auth: false }
      );
      setToken(res.accessToken);
      const mapped = mapBackendUser(res.user);
      setUser(mapped);
      setPendingVerification(null);
      return mapped;
    },
    [pendingVerification]
  );

  const resendCode = useCallback(async () => {
    if (!pendingVerification) return;
    await apiClient.post("/auth/resend-code", { identifier: pendingVerification.identifier }, { auth: false });
  }, [pendingVerification]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPendingVerification(null);
    // A full navigation (not router.push) guarantees every portal's
    // in-memory state (owner/admin dashboards, cart, etc.) is discarded
    // and the middleware re-evaluates auth on the way to /login — a
    // client-side-only state clear left the old protected page visible
    // until the next manual navigation (PROMPT.md item 3).
    if (typeof window !== "undefined") {
      window.location.assign("/login");
    }
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
