"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, DEMO_ACCOUNTS, homePath } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(homePath(user.role));
  }, [ready, user, router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate on the client first so the user gets a specific, friendly
    // message before we ever hit the network.
    const em = email.trim();
    if (!em) return setError("Please enter your email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))
      return setError("That doesn’t look like a valid email address.");
    if (!password) return setError("Please enter your password.");

    setLoading(true);
    const res = await login(em, password);
    if (!res.ok) {
      setError(res.error ?? "We couldn’t sign you in. Please try again.");
      setLoading(false);
      return;
    }
    router.replace(homePath(res.user.role));
  };

  const fill = (role) => {
    const a = DEMO_ACCOUNTS.find((x) => x.role === role);
    setEmail(a.email);
    setPassword(a.password);
    setError("");
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #34d399 0, transparent 40%), radial-gradient(circle at 80% 70%, #0ea5e9 0, transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Icon name="map-pinned" size={24} />
          </span>
          <div>
            <p className="text-lg font-bold">Plotmate</p>
            <p className="text-xs text-brand-100">Community Management</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            Run your plot-owners&rsquo; association with clarity.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            Track maintenance dues, manage the treasury, resolve complaints, book
            amenities and keep every owner informed — all in one place.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { k: "280", v: "Plots" },
              { k: "₹18L", v: "FY target" },
              { k: "53.7%", v: "Collected" },
            ].map((s) => (
              <div key={s.v} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <p className="text-xl font-bold">{s.k}</p>
                <p className="text-xs text-brand-100">{s.v}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-brand-200">
          PlotMate · Plot-owners&rsquo; association management
        </p>
      </div>

      {/* Right form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="map-pinned" size={24} />
            </span>
            <div>
              <p className="text-lg font-bold text-slate-800">PlotMate</p>
              <p className="text-xs text-slate-400">Association management</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your association dashboard.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Email address
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                <Icon name="mail" size={16} className="text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@greenaeroview.in"
                  className="h-11 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </label>

            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Password
                </span>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                <Icon name="lock" size={16} className="text-slate-400" />
                <input
                  type={show ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Icon name={show ? "eye-off" : "eye"} size={16} />
                </button>
              </div>
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                <Icon name="triangle-alert" size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? (
                <Icon name="loader" className="animate-spin" size={18} />
              ) : (
                <>
                  Sign in <Icon name="arrow-right" size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Icon name="sparkles" size={14} className="text-brand-500" />
              Demo accounts — click to autofill
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { role: "admin", label: "Admin / Secretary", icon: "shield-check" },
                { role: "member", label: "Member / Owner", icon: "user" },
                { role: "guard", label: "Security Guard", icon: "shield" },
              ].map((d) => {
                const a = DEMO_ACCOUNTS.find((x) => x.role === d.role);
                return (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => fill(d.role)}
                    className={cn(
                      "rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={d.icon} size={15} className="text-brand-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        {d.label}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate font-mono text-[11px] text-slate-500">
                      {a.email}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      {a.password}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
