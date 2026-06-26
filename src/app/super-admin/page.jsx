"use client";

import Link from "next/link";
import { PageHeader, Card, StatCard, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CountAreaChart, StatusDonut } from "@/components/charts";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

// Map plot lifecycle statuses onto the occupancy donut (occupied = booked+sold).
const PLOT_COLORS = { Occupied: "#059669", Vacant: "#0ea5e9", Blocked: "#ef4444" };
const TICKET_COLORS = {
  open: "#f59e0b", assigned: "#0ea5e9", in_progress: "#8b5cf6", waiting_venture: "#64748b",
  resolved: "#059669", closed: "#94a3b8", escalated: "#ef4444",
};

function plotOccupancy(ps = {}) {
  const occupied = (ps.booked ?? 0) + (ps.sold ?? 0);
  const out = [
    { name: "Occupied", value: occupied, color: PLOT_COLORS.Occupied },
    { name: "Vacant", value: ps.available ?? 0, color: PLOT_COLORS.Vacant },
    { name: "Blocked", value: ps.blocked ?? 0, color: PLOT_COLORS.Blocked },
  ];
  return out.filter((d) => d.value > 0);
}

function ticketDistribution(ts = {}) {
  return Object.entries(ts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v, color: TICKET_COLORS[k] || "#64748b" }));
}

const STATUS_TONE = { submitted: "amber", approved: "green", rejected: "rose" };

const STATS = [
  { key: "totalVentures", label: "Ventures", icon: "building-2", tone: "brand" },
  { key: "active", label: "Active", icon: "circle-check", tone: "sky" },
  { key: "suspended", label: "Suspended", icon: "circle-pause", tone: "rose" },
  { key: "pendingRequests", label: "Pending requests", icon: "clipboard-check", tone: "amber" },
  { key: "totalUsers", label: "Total users", icon: "users", tone: "violet" },
  { key: "totalPlots", label: "Total plots", icon: "map-pinned", tone: "slate" },
  { key: "openTickets", label: "Open tickets", icon: "life-buoy", tone: "amber" },
];

// Colour critical audit actions in the activity feed.
const AUDIT_TONE = (a) =>
  a?.includes("suspend") || a?.includes("block") || a?.includes("reject") ? "rose"
  : a?.includes("approve") || a?.includes("activate") ? "green"
  : a?.includes("support") ? "amber" : "slate";

function StatSkeleton() {
  return (
    <Card className="p-5">
      <span className="block h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
      <span className="mt-4 block h-7 w-14 animate-pulse rounded bg-slate-200" />
      <span className="mt-2 block h-3 w-24 animate-pulse rounded bg-slate-100" />
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const { data, loading } = useApi("/super/overview");
  const { data: trends } = useApi("/super/overview/trends");
  const ready = !loading && !!data;
  const recent = Array.isArray(data?.recentRequests) ? data.recentRequests : [];
  const audits = Array.isArray(data?.recentAudits) ? data.recentAudits : [];

  // Merge the ventures + users monthly series into one [{month, ventures, users}].
  const growth = (() => {
    const v = trends?.ventures ?? [];
    const u = trends?.users ?? [];
    return v.map((p, i) => ({ month: p.month.slice(5), ventures: p.count, users: u[i]?.count ?? 0 }));
  })();
  const occupancy = plotOccupancy(data?.plotStatus);
  const tickets = ticketDistribution(data?.ticketStatus);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Platform overview"
        subtitle="Ventures, workspaces and onboarding across the whole platform"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {ready
          ? STATS.map((s) => (
              <StatCard key={s.key} label={s.label} value={`${data[s.key] ?? 0}`} icon={s.icon} tone={s.tone} />
            ))
          : STATS.map((s) => <StatSkeleton key={s.key} />)}
      </div>

      {/* Charts: growth trend + occupancy + ticket distribution */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Venture & user growth</h2>
            <p className="text-xs text-slate-400">New ventures and users per month · last 6 months</p>
          </div>
          <div className="p-4">
            {growth.length === 0 ? (
              <div className="grid h-[260px] place-items-center text-sm text-slate-400">No trend data yet.</div>
            ) : (
              <CountAreaChart
                data={growth}
                series={[
                  { key: "ventures", name: "Ventures", color: "#059669" },
                  { key: "users", name: "Users", color: "#0ea5e9" },
                ]}
              />
            )}
          </div>
        </Card>
        <Card>
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Plot occupancy</h2>
            <p className="text-xs text-slate-400">Across every venture</p>
          </div>
          <div className="p-4">
            {occupancy.length === 0 ? (
              <div className="grid h-[220px] place-items-center text-sm text-slate-400">No plots yet.</div>
            ) : (
              <StatusDonut data={occupancy} />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Support ticket status</h2>
            <p className="text-xs text-slate-400">Distribution of platform support tickets</p>
          </div>
          <div className="p-4">
            {tickets.length === 0 ? (
              <div className="grid h-[220px] place-items-center text-sm text-slate-400">No support tickets yet.</div>
            ) : (
              <StatusDonut data={tickets} />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Recent onboarding requests</h2>
          <Link href="/super-admin/onboarding" className="text-xs font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </div>

        {!ready ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <span className="block h-3.5 w-44 animate-pulse rounded bg-slate-200" />
                  <span className="block h-3 w-28 animate-pulse rounded bg-slate-100" />
                </div>
              </li>
            ))}
          </ul>
        ) : recent.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            <Icon name="inbox" size={22} className="mx-auto text-slate-300" />
            <p className="mt-2">No onboarding requests yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <Icon name="building-2" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.ventureName}</p>
                  <p className="truncate text-xs text-slate-400">
                    {r.requesterName} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[r.status] ?? "slate"}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Recent platform activity</h2>
          <Link href="/super-admin/audit" className="text-xs font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {!ready ? (
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <span className="block h-3.5 w-48 animate-pulse rounded bg-slate-200" />
                  <span className="block h-3 w-24 animate-pulse rounded bg-slate-100" />
                </div>
              </li>
            ))}
          </ul>
        ) : audits.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            <Icon name="scroll-text" size={22} className="mx-auto text-slate-300" />
            <p className="mt-2">No platform activity yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {audits.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">{a.summary || a.action}</p>
                  <p className="truncate text-xs text-slate-400">
                    {a.actorName || "system"} · {formatDate(a.createdAt)}
                  </p>
                </div>
                <Badge tone={AUDIT_TONE(a.action)}>{a.action}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
    </div>
  );
}
