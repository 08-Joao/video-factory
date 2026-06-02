"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

type User = { id: string; email: string; name: string };
type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vf_token");
    if (!saved) return;
    setToken(saved);
    api.get("/auth/me").then((res) => setUser(res.data)).catch(() => logout());
  }, []);

  function persist(nextToken: string, nextUser: User) {
    localStorage.setItem("vf_token", nextToken);
    document.cookie = `vf_token=${nextToken}; path=/; max-age=604800; SameSite=Lax`;
    setToken(nextToken);
    setUser(nextUser);
    router.push("/dashboard");
  }

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    persist(res.data.accessToken, res.data.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.post("/auth/register", { name, email, password });
    persist(res.data.accessToken, res.data.user);
  }

  function logout() {
    localStorage.removeItem("vf_token");
    document.cookie = "vf_token=; path=/; max-age=0";
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  const value = useMemo(() => ({ user, token, login, register, logout }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
