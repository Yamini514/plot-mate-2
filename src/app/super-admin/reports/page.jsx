"use client";

import { useState } from "react";
import { PageHeader, Card, StatCard, Segmented, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useApi } from "@/lib/useApi";
import { downloadCSV } from "@/lib/utils";

const REPORTS = [
  { value: "venture-growth", label: "Venture growth", path: "/super/reports/venture-growth", icon: "building-2", tone: "brand" },
  { value: "user-growth",    label: "User growth",    path: "/super/reports/user-growth",    icon: "users",      tone: "violet" },
  { value: "registrations",  label: "Registrations",  path: "/super/reports/registrations",  icon: "clipboard-check", tone: "amber" },
  { value: "active-ventures",label: "Active ventures",path: "/super/reports/active-ventures",icon: "circle-check", tone: "sky" },
  { value: "revenue",        label: "Revenue",        path: "/super/reports/revenue",        icon: "indian-rupee", tone: "slate" },
];

// Minimal dependency-free bar chart for a [{month,count}] series.
function BarChart({ series }) {
  const max = Math.max(1, ...series.map((p) => p.count));
  return (
    <div className="flex h-48 items-end gap-1.5 px-1">
      {series.map((p) => (
        <div key={p.month} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-brand-500/80 transition-all"
              style={{ height: `${(p.count / max) * 100}%` }}
              title={`${p.month}: ${p.count}`}
            />
          </div>
          <span className="text-[10px] text-slate-400">{p.month.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState("venture-growth");
  const meta = REPORTS.find((r) => r.value === report);
  const { data, loading } = useApi(meta.path, { months: 12 });

  const series = data?.period ?? [];
  const cumulative = data?.cumulative ?? [];

  // Build the CSV client-side from the fetched series — a raw download link
  // wouldn't carry the JWT, so we never hit the auth-gated export endpoint here.
  const exportCsv = () =>
    downloadCSV(`${report}.csv`, series, [
      { label: "Month", get: (r) => r.month },
      { label: "Count", get: (r) => r.count },
    ]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports & analytics"
        subtitle="Platform growth and registration trends"
        actions={
          report !== "revenue" && report !== "active-ventures" ? (
            <Button variant="secondary" icon="download" onClick={exportCsv} disabled={series.length === 0}>
              Export CSV
            </Button>
          ) : null
        }
      />

      <div className="mb-4">
        <Segmented value={report} onChange={setReport} options={REPORTS.map((r) => ({ value: r.value, label: r.label }))} />
      </div>

      {report === "active-ventures" ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {!loading && data ? (
            <>
              <StatCard label="Active" value={`${data.active ?? 0}`} icon="circle-check" tone="green" />
              <StatCard label="Suspended" value={`${data.suspended ?? 0}`} icon="circle-pause" tone="rose" />
              {Object.entries(data.byStatus ?? {}).map(([k, v]) => (
                <StatCard key={k} label={k} value={`${v}`} icon="building-2" tone="slate" />
              ))}
            </>
          ) : (
            <Card className="p-6 text-slate-400">Loading…</Card>
          )}
        </div>
      ) : report === "revenue" ? (
        <Card className="p-10 text-center">
          <Icon name="indian-rupee" size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">{data?.message || "Revenue reporting is not enabled yet."}</p>
          <p className="mt-1 text-xs text-slate-400">This view activates automatically once platform billing rolls up per-venture invoices.</p>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total" value={`${data?.total ?? 0}`} icon={meta.icon} tone={meta.tone} />
            <StatCard label="This period" value={`${series.at(-1)?.count ?? 0}`} icon="trending-up" tone="sky" />
            {data?.byStatus && Object.entries(data.byStatus).slice(0, 2).map(([k, v]) => (
              <StatCard key={k} label={k} value={`${v}`} icon="dot" tone="slate" />
            ))}
          </div>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">{meta.label} · last 12 months</h2>
              {cumulative.length > 0 && <Badge tone="brand">cumulative {cumulative.at(-1)?.count ?? 0}</Badge>}
            </div>
            {loading ? (
              <div className="grid h-48 place-items-center text-slate-400">
                <span><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</span>
              </div>
            ) : series.length === 0 ? (
              <div className="grid h-48 place-items-center text-sm text-slate-400">No data for this period.</div>
            ) : (
              <BarChart series={series} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
