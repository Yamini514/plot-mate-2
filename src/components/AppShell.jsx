"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, homePath } from "@/lib/auth";
import { useSettings } from "@/lib/useSettings";
import { useNavBadges } from "@/lib/useNavBadges";
import { useApi, useDebounced } from "@/lib/useApi";
import { normalizeList } from "@/lib/api";
import { Icon } from "./Icon";
import { Avatar, ConfirmDialog } from "./ui";
import { cn } from "@/lib/utils";
import { isBeforeShiftEnd, scheduledEndForNow, fmtClock } from "@/lib/shift";

// Per-role "record" source for global search. Pages are always searched on top
// of this (client-side from the nav).
const RECORD_SEARCH = {
  admin: {
    path: "/admin/plots",
    query: (q) => ({ search: q, page_size: 6 }),
    map: (r) => ({ key: `p${r.id}`, title: r.ownerName || "Unregistered plot", sub: `Plot ${r.plotNo}`, href: "/admin/owners", icon: "user" }),
  },
  member: {
    path: "/member/directory",
    query: (q) => ({ search: q }),
    map: (r) => ({ key: `d${r.plotNo}`, title: r.name, sub: `Plot ${r.plotNo}`, href: "/member/directory", icon: "user" }),
  },
};

// Sidebar nav with a single active "pill" that glides to the selected item.
// We measure the active link's box and animate an absolutely-positioned
// highlight to it; on first mount the pill snaps into place (no slide).
function SidebarNav({ groups, pathname, badges }) {
  const navRef = useRef(null);
  const firstRun = useRef(true);
  const [pill, setPill] = useState(null);

  // Exactly one item is active: the one whose href is the longest match for the
  // current path (exact, or a path prefix on a "/" boundary). This avoids the
  // dashboard/home item matching every sub-route.
  const activeHref = Object.values(groups)
    .flat()
    .filter((it) => pathname === it.href || pathname.startsWith(`${it.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    const el = navRef.current?.querySelector('[data-active="true"]');
    if (!el) {
      setPill(null);
      return;
    }
    setPill({ top: el.offsetTop, height: el.offsetHeight, animate: !firstRun.current });
    firstRun.current = false;
    // Re-measure when the active route changes (DOM reflects the new active item).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <nav ref={navRef} className="relative flex-1 space-y-5 overflow-y-auto px-3 pb-4">
      {pill && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3 right-3 z-0 rounded-lg bg-brand-50",
            pill.animate && "transition-all duration-300 ease-out",
          )}
          style={{ top: pill.top, height: pill.height }}
        />
      )}
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {group}
          </p>
          <div className="space-y-0.5">
            {items.map((item) => {
              const active = item.href === activeHref;
              const badge = badges[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active ? "true" : undefined}
                  className={cn(
                    "group relative z-10 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-brand-700" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon
                    name={item.icon}
                    size={18}
                    className={active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {badge > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ nav, role, children }) {
  const { user, ready, logout } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = useNavBadges(role);

  // --- Top-bar dropdowns: notifications (bell) + help (?) --------------------
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const notifRef = useRef(null);
  const helpRef = useRef(null);
  useEffect(() => {
    if (!notifOpen && !helpOpen) return;
    const onDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [notifOpen, helpOpen]);

  // The sidebar "needs attention" badges double as the notification feed.
  const NOTIF_COPY = {
    "/admin/billing": "unpaid invoices",
    "/admin/helpdesk": "open service requests",
    "/admin/complaints": "open complaints",
    "/guard/visitors": "visitors expected at the gate",
    "/guard/deliveries": "deliveries awaiting pickup",
    "/member/visitors": "visitor approvals pending",
  };
  const notifications = Object.entries(badges)
    .filter(([, count]) => count > 0)
    .map(([href, count]) => {
      const item = nav.find((n) => n.href === href) || nav.find((n) => href.startsWith(n.href));
      return {
        href,
        count,
        label: item?.label ?? "Updates",
        icon: item?.icon ?? "bell",
        detail: `${count} ${NOTIF_COPY[href] ?? "items need attention"}`,
      };
    });
  // The platform super admin has no helpdesk/announcements; other personas link
  // to their own. (null = don't show the Help desk shortcut.)
  const helpHref =
    role === "guard" ? "/guard/tickets"
    : role === "super_admin" ? null
    : `/${role}/helpdesk`;
  const hasAnnouncements = role === "admin" || role === "member";

  // --- Global search ---------------------------------------------------------
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const dq = useDebounced(q.trim(), 250);
  const recCfg = RECORD_SEARCH[role];
  const { data: recData } = useApi(
    dq.length >= 2 && recCfg ? recCfg.path : null,
    recCfg ? recCfg.query(dq) : undefined,
  );
  const pageMatches = dq
    ? nav.filter((n) => n.label.toLowerCase().includes(dq.toLowerCase())).slice(0, 6)
    : [];
  const recordMatches =
    dq.length >= 2 && recCfg
      ? normalizeList(recData).map(recCfg.map).filter((r) => r.title).slice(0, 6)
      : [];
  const hasResults = pageMatches.length > 0 || recordMatches.length > 0;

  const go = (href) => {
    setQ("");
    setSearchOpen(false);
    setNotifOpen(false);
    setHelpOpen(false);
    router.push(href);
  };
  const onSearchKey = (e) => {
    if (e.key === "Escape") { setQ(""); setSearchOpen(false); return; }
    if (e.key === "Enter") {
      const first = pageMatches[0]?.href || recordMatches[0]?.href;
      if (first) go(first);
    }
  };

  // --- Sign out -------------------------------------------------------------
  // Guards sign out by ending their shift. If they do so before the shift's
  // scheduled end, we confirm first (and record it as an early clock-out). Any
  // sign-out lands them back on the login page.
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [earlyOut, setEarlyOut] = useState(false);

  const requestLogout = () => {
    if (role === "guard") {
      setEarlyOut(isBeforeShiftEnd());
      setLogoutOpen(true);
    } else {
      doLogout();
    }
  };

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLogoutOpen(false);
      setLoggingOut(false);
      router.replace("/login");
    }
  };

  // Route guard
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(homePath(user.role));
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
          <p className="truncate text-xs text-slate-400">{settings.name}</p>
        </div>
      </div>

      {/* Nav */}
      <SidebarNav groups={groups} pathname={pathname} badges={badges} />

      {/* User card */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user.name} src={user.avatarUrl} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.title}</p>
          </div>
          <button
            onClick={requestLogout}
            title={role === "guard" ? "End shift & sign out" : "Log out"}
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

          <div className="relative hidden sm:block sm:w-72">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
              <Icon name="search" size={16} className="text-slate-400" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={onSearchKey}
                placeholder="Search pages, owners…"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              {q && (
                <button onClick={() => { setQ(""); setSearchOpen(false); }} className="text-slate-400 hover:text-slate-600">
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>

            {searchOpen && dq && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                {!hasResults && (
                  <p className="px-3 py-3 text-sm text-slate-400">No matches for “{dq}”.</p>
                )}
                {pageMatches.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pages</p>
                    {pageMatches.map((p) => (
                      <button
                        key={p.href}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(p.href)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Icon name={p.icon} size={15} className="text-slate-400" />
                        <span className="flex-1 truncate">{p.label}</span>
                        <span className="text-xs text-slate-300">{p.group}</span>
                      </button>
                    ))}
                  </div>
                )}
                {recordMatches.length > 0 && (
                  <div className="border-t border-slate-100">
                    <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {role === "admin" ? "Owners & plots" : "Directory"}
                    </p>
                    {recordMatches.map((r) => (
                      <button
                        key={r.key}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(r.href)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <Icon name={r.icon} size={15} className="text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-700">{r.title}</span>
                          <span className="block truncate text-xs text-slate-400">{r.sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 md:inline-flex">
              <Icon name="calendar" size={13} />
              FY {settings.fy}
            </span>
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen((o) => !o); setHelpOpen(false); }}
                className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Icon name="bell" size={18} />
                {notifications.length > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <p className="text-sm font-semibold text-slate-800">Notifications</p>
                    {notifications.length > 0 && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                        {notifications.length} item{notifications.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Icon name="check-check" size={22} className="mx-auto text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">You&apos;re all caught up</p>
                    </div>
                  ) : (
                    <div className="max-h-[60vh] overflow-y-auto py-1">
                      {notifications.map((n) => (
                        <button
                          key={n.href}
                          onClick={() => go(n.href)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
                            <Icon name={n.icon} size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-700">{n.label}</span>
                            <span className="block truncate text-xs text-slate-400">{n.detail}</span>
                          </span>
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{n.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Help & support */}
            <div className="relative" ref={helpRef}>
              <button
                onClick={() => { setHelpOpen((o) => !o); setNotifOpen(false); }}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Help"
              >
                <Icon name="circle-help" size={18} />
              </button>
              {helpOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <p className="px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Help &amp; support</p>
                  {helpHref && (
                    <button
                      onClick={() => go(helpHref)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <Icon name="life-buoy" size={16} className="text-slate-400" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-700">Help desk</span>
                        <span className="block text-xs text-slate-400">Raise or track a request</span>
                      </span>
                    </button>
                  )}
                  {hasAnnouncements && (
                    <button
                      onClick={() => go(`/${role}/announcements`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <Icon name="megaphone" size={16} className="text-slate-400" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-700">Announcements</span>
                        <span className="block text-xs text-slate-400">Latest notices from the association</span>
                      </span>
                    </button>
                  )}
                  <p className="border-t border-slate-100 px-4 py-2.5 text-xs leading-relaxed text-slate-400">
                    Tip: use the search bar to jump to any page{role === "admin" ? " or plot owner" : ""}.
                  </p>
                </div>
              )}
            </div>
            <span className="ml-1 hidden items-center gap-2 rounded-lg py-1 pl-1 pr-3 sm:flex">
              <Avatar name={user.name} src={user.avatarUrl} size={32} />
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

      {/* Guard sign-out — confirm (and flag) an early clock-out */}
      <ConfirmDialog
        open={logoutOpen}
        onClose={() => !loggingOut && setLogoutOpen(false)}
        onConfirm={doLogout}
        loading={loggingOut}
        title={earlyOut ? "End shift early?" : "End shift & sign out?"}
        confirmLabel={earlyOut ? "End shift anyway" : "End shift"}
        confirmVariant={earlyOut ? "danger" : "primary"}
        message={
          earlyOut
            ? `Your shift runs until ${fmtClock(scheduledEndForNow())}. Signing out now will be recorded as an early clock-out and your supervisor can see it on the attendance log.`
            : "You'll be signed out and your shift will be closed. Your login and logout times are recorded on the attendance log."
        }
      />
    </div>
  );
}
