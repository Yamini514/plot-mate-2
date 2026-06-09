"use client";

import { createContext, useContext, useEffect, useState } from "react";

export const DEMO_ACCOUNTS = [
  {
    name: "Suresh Kumar",
    email: "admin@greenaeroview.in",
    password: "admin123",
    role: "admin",
    title: "Honorary Secretary",
  },
  {
    name: "Naveen Varma",
    email: "member@greenaeroview.in",
    password: "member123",
    role: "member",
    title: "Plot Owner",
    plotNo: "P-047",
  },
];

const AuthContext = createContext(null);
const STORAGE_KEY = "plotmate.session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const login = (email, password) => {
    const match = DEMO_ACCOUNTS.find(
      (a) =>
        a.email.toLowerCase() === email.trim().toLowerCase() &&
        a.password === password,
    );
    if (!match) return { ok: false, error: "Invalid email or password." };
    const { password: _pw, ...session } = match;
    void _pw;
    setUser(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
