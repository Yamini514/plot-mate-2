"use client";

import { useApi } from "@/lib/useApi";
import { Icon } from "@/components/Icon";
import { formatINR, formatDate } from "@/lib/utils";

// Derived performance metrics for a vendor (read-only). Mounted in the staff
// edit modal when the record is a vendor.
export function VendorPerformance({ staffId }) {
  const { data, loading } = useApi(staffId ? `/admin/staff/${staffId}/performance` : null);

  if (loading) return <p className="mt-4 text-xs text-slate-400">Loading performance…</p>;
  if (!data) return null;

  const stat = (label, value) => (
    <div className="rounded-lg bg-white p-3 text-center ring-1 ring-slate-100">
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
        <Icon name="gauge" size={13} /> Performance
        {data.avgRating != null && (
          <span className="ml-auto inline-flex items-center gap-1 text-amber-600">
            <Icon name="star" size={13} /> {data.avgRating} ({data.ratingCount})
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("Orders", data.totalOrders ?? 0)}
        {stat("Completed", data.completionPct == null ? "—" : `${data.completionPct}%`)}
        {stat("On-time", data.onTimePct == null ? "—" : `${data.onTimePct}%`)}
        {stat("Reopened", data.reopened ?? 0)}
      </div>
      <p className="mt-3 flex justify-between text-sm">
        <span className="text-slate-500">Total billed</span>
        <span className="font-semibold text-slate-800">{formatINR(data.totalBilled ?? 0)}</span>
      </p>
      {(data.recentRatings ?? []).length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-amber-100 pt-2 text-xs text-slate-500">
          {data.recentRatings.map((r) => (
            <li key={r.id} className="flex justify-between gap-2">
              <span>{"★".repeat(r.score)}{r.note ? ` · ${r.note}` : ""}</span>
              <span className="text-slate-400">{formatDate(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
