"use client";

import { useState } from "react";
import { PageHeader, Card, StatCard, Segmented, Badge, Button, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useApi } from "@/lib/useApi";
import { downloadCSV, downloadExcel, printReport } from "@/lib/utils";

const PERIODS = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 24, label: "24 months" },
];

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
  const [months, setMonths] = useState(12);
  const meta = REPORTS.find((r) => r.value === report);
  const { data, loading } = useApi(meta.path, { months });

  const series = data?.period ?? [];
  const cumulative = data?.cumulative ?? [];
  const exportable = report !== "revenue" && report !== "active-ventures";

  // Build exports client-side from the fetched series — a raw download link
  // wouldn't carry the JWT, so we never hit the auth-gated export endpoint here.
  const COLUMNS = [
    { label: "Month", get: (r) => r.month },
    { label: "Count", get: (r) => r.count },
  ];
  const title = `${meta.label} — last ${months} months`;
  const exportAs = (format) => {
    if (series.length === 0) return;
    if (format === "csv") downloadCSV(`${report}.csv`, series, COLUMNS);
    else if (format === "excel") downloadExcel(`${report}.xls`, series, COLUMNS, title);
    else if (format === "pdf") printReport(title, series, COLUMNS, "PlotMate platform report");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports & analytics"
        subtitle="Platform growth and registration trends"
        actions={
          exportable ? (
            <div className="flex gap-2">
              <Button variant="secondary" icon="file-text" onClick={() => exportAs("csv")} disabled={series.length === 0}>CSV</Button>
              <Button variant="secondary" icon="sheet" onClick={() => exportAs("excel")} disabled={series.length === 0}>Excel</Button>
              <Button variant="secondary" icon="printer" onClick={() => exportAs("pdf")} disabled={series.length === 0}>PDF</Button>
            </div>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented value={report} onChange={setReport} options={REPORTS.map((r) => ({ value: r.value, label: r.label }))} />
        {exportable && (
          <select className={`${inputClass} w-36`} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        )}
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
              <h2 className="text-sm font-semibold text-slate-800">{meta.label} · last {months} months</h2>
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
