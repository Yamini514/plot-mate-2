"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { association } from "@/lib/mock-data";
import { Icon } from "./Icon";
import { Avatar } from "./ui";
import { cn } from "@/lib/utils";

export function AppShell({ nav, role, children }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Route guard
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role !== role)
      router.replace(user.role === "admin" ? "/admin" : "/member");
  }, [ready, user, role, router]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (!ready || !user || user.role !== role) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-400">
        <Icon name="loader" className="animate-spin" size={28} />
      </div>
    );
  }

  // group nav items
  const groups = nav.reduce((acc, item) => {
    const g = item.group ?? "General";
    (acc[g] ??= []).push(item);
    return acc;
  }, {});

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Icon name="map-pinned" size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">Plotmate</p>
          <p className="truncate text-xs text-slate-400">{association.name}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== `/${role}` && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <Icon
                      name={item.icon}
                      size={18}
                      className={active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.title}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Icon name="log-out" size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 animate-fade-in border-r border-slate-200 bg-white">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <Icon name="menu" size={20} />
          </button>

          <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 sm:flex sm:w-72">
            <Icon name="search" size={16} className="text-slate-400" />
            <input
              placeholder="Search plots, owners, payments…"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 md:inline-flex">
              <Icon name="calendar" size={13} />
              FY {association.fy}
            </span>
            <button className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
              <Icon name="bell" size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
              <Icon name="circle-help" size={18} />
            </button>
            <span className="ml-1 hidden items-center gap-2 rounded-lg py-1 pl-1 pr-3 sm:flex">
              <Avatar name={user.name} size={32} />
              <span className="text-sm font-medium text-slate-700">
                {user.name.split(" ")[0]}
              </span>
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
