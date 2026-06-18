"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, apiEnabled, setToken } from "./api";

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
  {
    name: "Rajappa Gowda",
    email: "guard@greenaeroview.in",
    password: "guard123",
    role: "guard",
    title: "Security Guard · Main Gate",
    guardId: "GRD-04",
  },
];

/** Landing route for a given role. */
export function homePath(role) {
  if (role === "admin") return "/admin";
  if (role === "guard") return "/guard";
  return "/member";
}

const AuthContext = createContext(null);
const STORAGE_KEY = "plotmate.session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted session on mount
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const persist = (session) => {
    setUser(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { ok: true, user: session };
  };

  const login = async (email, password) => {
    // Real backend (JWT) when configured; otherwise the demo fallback.
    if (apiEnabled) {
      try {
        const info = await api.login(email.trim().toLowerCase(), password);
        return persist({
          id: info.id,
          name: info.fullName,
          email: info.email,
          role: info.roleName, // "admin" | "guard" | "member"
          title: info.title,
          plotNo: info.plotNo,
          guardId: info.guardId,
          avatarUrl: info.avatarUrl,
        });
      } catch (e) {
        return { ok: false, error: e.message || "Invalid email or password." };
      }
    }

    const match = DEMO_ACCOUNTS.find(
      (a) =>
        a.email.toLowerCase() === email.trim().toLowerCase() &&
        a.password === password,
    );
    if (!match) return { ok: false, error: "Invalid email or password." };
    const { password: _pw, ...session } = match;
    void _pw;
    return persist(session);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Merge fields into the active session and re-persist (e.g. after the user
  // edits their own name on the profile page) so the shell updates immediately.
  const updateUser = (partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
