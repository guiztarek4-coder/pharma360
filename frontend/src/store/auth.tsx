import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken } from "@/src/lib/api";

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role?: string;
  addresses?: any[];
  loyalty_points?: number;
  loyalty_lifetime?: number;
  referral_code?: string;
};

type Ctx = {
  user: User | null;
  booting: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { first_name: string; last_name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get("/auth/me", undefined, true);
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshUser();
      setBooting(false);
    })();
  }, [refreshUser]);

  const login = useCallback(async (identifier: string, password: string) => {
    const u = await api.post("/auth/login", { identifier, password });
    setUser(u);
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(
    async (data: { first_name: string; last_name: string; email: string; phone: string; password: string }) => {
      await api.post("/auth/register", data);
      await api.post("/auth/login", { identifier: data.email, password: data.password });
      await refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {}, true);
    } catch {}
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, booting, login, register, logout, refreshUser }}>{children}</AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
