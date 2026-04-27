import React, { createContext, useContext, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type { User } from "../lib/types";
import { api } from "../lib/api";
import { clearSession, getSession, setSession } from "./session";

type AuthContextValue = {
  user: User | null;
  role: User["role"] | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSession()?.user ?? null);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      async login(email, password) {
        const data = await api<{
          accessToken: string;
          refreshToken: string;
          refreshTokenExpiresAt: string;
          user: User;
        }>("/api/auth/login", "POST", { email, password });

        setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          refreshTokenExpiresAt: data.refreshTokenExpiresAt,
          user: data.user
        });
        setUser(data.user);
        toast.success("Welcome back!");
      },
      async logout() {
        const session = getSession();
        try {
          if (session?.refreshToken) {
            await api("/api/auth/logout", "POST", {
              refreshToken: session.refreshToken
            });
          }
        } finally {
          clearSession();
          setUser(null);
        }
        toast.success("Logged out.");
      }
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

