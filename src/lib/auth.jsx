"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, apiEnabled, setToken } from "./api";
import { clearApiCache } from "./useApi";

export const DEMO_ACCOUNTS = [
  {
    name: "Platform Super Admin",
    email: "super@plotmate.app",
    password: "super123",
    role: "super_admin",
    title: "Platform Super Admin",
  },
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
  if (role === "super_admin") return "/super-admin";
  if (role === "admin") return "/admin";
  if (role === "guard") return "/guard";
  if (role === "vendor") return "/vendor";
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

  // Ends the session. Against the real backend this also closes an open guard
  // shift (recording the logout time + early-clock-out flag); the returned
  // payload lets the caller react. Local state is always cleared so a backend
  // hiccup never strands the user in the app.
  const logout = async () => {
    let result = {};
    if (apiEnabled) result = await api.endSession();
    else setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    clearApiCache(); // don't let the next account (same tab) read cached data
    return result;
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
