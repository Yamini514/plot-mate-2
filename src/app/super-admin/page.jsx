"use client";

import Link from "next/link";
import { PageHeader, Card, StatCard, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

const STATUS_TONE = { submitted: "amber", approved: "green", rejected: "rose" };

const STATS = [
  { key: "totalVentures", label: "Ventures", icon: "building-2", tone: "brand" },
  { key: "active", label: "Active", icon: "circle-check", tone: "sky" },
  { key: "suspended", label: "Suspended", icon: "circle-pause", tone: "rose" },
  { key: "pendingRequests", label: "Pending requests", icon: "clipboard-check", tone: "amber" },
  { key: "totalUsers", label: "Total users", icon: "users", tone: "violet" },
  { key: "totalPlots", label: "Total plots", icon: "map-pinned", tone: "slate" },
];

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
  const ready = !loading && !!data;
  const recent = Array.isArray(data?.recentRequests) ? data.recentRequests : [];

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

      <Card className="mt-6">
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
    </div>
  );
}
