"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Button,
  Badge,
  Progress,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { CollectionTrendChart, StatusDonut } from "@/components/charts";
import { useSettings } from "@/lib/useSettings";
import { normalizeList } from "@/lib/api";
import { useApi, useDeferred } from "@/lib/useApi";
import { usePermissions } from "@/lib/usePermissions";
import { formatINR } from "@/lib/utils";

const activityIcon = {
  payment: "banknote",
  owner: "user-plus",
  expense: "receipt",
  complaint: "message-square-warning",
  announcement: "megaphone",
  booking: "calendar-check",
};

export default function AdminDashboard() {
  const toast = useToast();
  const { settings } = useSettings();
  // RBAC: only fetch (and render) widgets the role can access — committee/staff
  // see role-relevant widgets, and we avoid 403 spam on forbidden endpoints.
  const { can } = usePermissions();
  const seeFinance = can("reports.view") || can("finance.view") || can("payments.view");
  const seePlots = can("plots.view");
  const seePayments = can("payments.view");
  const seeSecurity = can("support.view");
  // Primary, above-the-fold data — fetched immediately (permission-gated).
  const { data: rep } = useApi(seeFinance ? "/admin/reports/overview" : null);
  const { data: ps } = useApi(seePlots ? "/admin/plots/summary" : null);
  const { data: payList } = useApi(seePayments ? "/admin/billing/payments" : null, { page_size: 6 });
  // Secondary "security & gate" snapshot (below the fold) — deferred so it
  // doesn't compete with the KPIs above for the small backend connection pool.
  const ready = useDeferred(700);
  const { data: incList } = useApi(ready && seeSecurity ? "/admin/security/incidents" : null);
  const { data: visList } = useApi(ready && seeSecurity ? "/admin/visitors" : null, { page_size: 300 });
  const { data: delList } = useApi(ready && seeSecurity ? "/admin/deliveries" : null, { page_size: 300 });

  const stats = {
    collectionRate: rep?.collection?.rate ?? 0,
    collected: rep?.collection?.collected ?? 0,
    target: rep?.collection?.billed ?? 0,
    treasuryBalance: rep?.treasury?.balance ?? 0,
    outstanding: rep?.collection?.outstanding ?? 0,
    paidCount: ps?.paidCount ?? 0,
    pendingCount: ps?.pendingCount ?? 0,
    unknownCount: ps?.unknownCount ?? 0,
  };
  const totalPlots = ps?.totalPlots ?? 0;
  const recentActivity = (rep?.recentActivity ?? []).map((a, i) => ({ id: i, type: a.type, text: a.text, time: a.at }));
  const payments = normalizeList(payList).map((p) => ({ ...p, plotNo: p.property, type: p.mode, date: p.paidOn }));
  const incidents = normalizeList(incList);
  // Live security snapshot — all zero on a fresh DB.
  const todayStr = new Date().toISOString().slice(0, 10);
  const visitors = normalizeList(visList);
  const deliveries = normalizeList(delList);
  const visitorsToday = visitors.filter((v) => (v.createdAt ?? "").slice(0, 10) === todayStr).length;
  const packagesWaiting = deliveries.filter((d) => d.status === "waiting" || d.status === "received").length;
  const openIncidentsCount = incidents.filter((i) => ["open", "investigating", "escalated"].includes(i.status)).length;
  const activeAlerts = incidents.filter((i) => i.severity === "high" && ["open", "investigating", "escalated"].includes(i.status)).length;

  // --- Export (CSV + Print/PDF) ---
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [exportOpen]);

  const summaryRows = [
    ["Collection rate", `${stats.collectionRate}%`],
    ["Collected", formatINR(stats.collected)],
    ["Billed target", formatINR(stats.target)],
    ["Outstanding dues", formatINR(stats.outstanding)],
    ["Treasury balance", formatINR(stats.treasuryBalance)],
    ["Plots registered", String(totalPlots)],
    ["Plots paid", String(stats.paidCount)],
    ["Plots pending", String(stats.pendingCount)],
    ["Plots unknown", String(stats.unknownCount)],
  ];

  const exportCSV = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      esc(`${settings.name} — Dashboard summary (FY ${settings.fy})`),
      "",
      ["Metric", "Value"].map(esc).join(","),
      ...summaryRows.map((r) => r.map(esc).join(",")),
      "",
      "Recent payments",
      ["Plot", "Owner", "Type", "Date", "Amount"].map(esc).join(","),
      ...payments
        .slice(0, 6)
        .map((p) => [p.plotNo, p.ownerName, p.type, p.date, formatINR(p.amount)].map(esc).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plotmate-dashboard.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Dashboard summary exported (CSV)");
  };

  const exportPrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast("Pop-up blocked — allow pop-ups to print the report", "error");
      return;
    }
    const esc = (s) =>
      String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const kpis = summaryRows
      .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
      .join("");
    const payRows = payments
      .slice(0, 6)
      .map(
        (p) =>
          `<tr><td>${esc(p.plotNo)}</td><td>${esc(p.ownerName)}</td><td>${esc(p.type)}</td><td>${esc(p.date)}</td><td class="num">${esc(formatINR(p.amount))}</td></tr>`,
      )
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(settings.name)} — Dashboard summary</title>
<style>
  body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1e293b;margin:40px;}
  h1{font-size:20px;margin:0 0 2px;} .sub{color:#64748b;font-size:13px;margin:0 0 24px;}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:28px 0 8px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e2e8f0;}
  table.kpi th{width:40%;color:#475569;font-weight:600;} table.kpi td{font-weight:600;}
  td.num{text-align:right;font-weight:600;}
  @media print{body{margin:16px;}}
</style></head><body>
<h1>${esc(settings.name)}</h1>
<p class="sub">Dashboard summary · FY ${esc(settings.fy)}</p>
<h2>Key metrics</h2>
<table class="kpi"><tbody>${kpis}</tbody></table>
<h2>Recent payments</h2>
<table><thead><tr><th>Plot</th><th>Owner</th><th>Type</th><th>Date</th><th class="num">Amount</th></tr></thead><tbody>${payRows || '<tr><td colspan="5">No recent payments.</td></tr>'}</tbody></table>
</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    toast("Dashboard report ready to print");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`${settings.name} · FY ${settings.fy}`}
        actions={
          <>
            <div className="relative" ref={exportRef}>
              <Button variant="secondary" icon="download" size="md" onClick={() => setExportOpen((o) => !o)}>
                Export
                <Icon name="chevron-down" size={14} className="ml-0.5 text-slate-400" />
              </Button>
              {exportOpen && (
                <div className="absolute right-0 z-40 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { setExportOpen(false); exportCSV(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name="file-spreadsheet" size={15} className="text-slate-400" />
                    Download CSV
                  </button>
                  <button
                    onClick={() => { setExportOpen(false); exportPrint(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Icon name="printer" size={15} className="text-slate-400" />
                    Print / Save as PDF
                  </button>
                </div>
              )}
            </div>
            <Link href="/admin/reminders"><Button icon="bell-ring">Send reminders</Button></Link>
          </>
        }
      />

      {/* Alert banner */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
          <Icon name="triangle-alert" size={20} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            {stats.pendingCount} plots have not paid maintenance fees for FY{" "}
            {settings.fy}
          </p>
          <p className="text-xs text-amber-700">
            {formatINR(stats.outstanding)} outstanding · {stats.unknownCount} plots
            still need owner contact details.
          </p>
        </div>
        <Link href="/admin/reminders">
          <Button size="sm" variant="secondary">
            Review &amp; remind
          </Button>
        </Link>
      </div>

      {/* Stat tiles (permission-gated) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {seeFinance && (
          <StatCard
            label="Collection rate"
            value={`${stats.collectionRate}%`}
            icon="trending-up"
            tone="brand"
            delta={{ value: "+8.2%", up: true }}
            hint={`${formatINR(stats.collected, { compact: true })} of ${formatINR(stats.target, { compact: true })}`}
          />
        )}
        {seeFinance && (
          <StatCard
            label="Treasury balance"
            value={formatINR(stats.treasuryBalance, { compact: true })}
            icon="wallet"
            tone="sky"
            hint="Available funds"
          />
        )}
        {seeFinance && (
          <StatCard
            label="Outstanding dues"
            value={formatINR(stats.outstanding, { compact: true })}
            icon="triangle-alert"
            tone="amber"
            delta={{ value: "-3.1%", up: false }}
            hint={`${stats.pendingCount} plots pending`}
          />
        )}
        {seePlots && (
          <StatCard
            label="Plots registered"
            value={`${totalPlots}`}
            icon="map-pinned"
            tone="violet"
            hint={`${stats.paidCount} paid · ${stats.pendingCount} pending · ${stats.unknownCount} unknown`}
          />
        )}
      </div>

      {/* Charts row (permission-gated) */}
      {(seeFinance || seePlots) && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {seeFinance && (
            <Card className="lg:col-span-2">
              <CardHeader
                title="Collections vs Expenses"
                subtitle="Last 6 months"
                icon="bar-chart-3"
                action={<Badge tone="brand">FY {settings.fy}</Badge>}
              />
              <div className="p-4">
                <CollectionTrendChart data={rep?.collectionTrend ?? []} />
              </div>
            </Card>
          )}

          {seePlots && (
            <Card>
              <CardHeader title="Payment status" subtitle={`All ${totalPlots} plots`} icon="pie-chart" />
              <div className="p-4">
                <StatusDonut
                  data={[
                    { name: "Paid", value: stats.paidCount, color: "#059669" },
                    { name: "Pending", value: stats.pendingCount, color: "#f59e0b" },
                    { name: "Unknown", value: stats.unknownCount, color: "#cbd5e1" },
                  ]}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Security & gate snapshot (permission-gated) */}
      {seeSecurity && (
      <Card className="mt-6">
        <CardHeader
          title="Security & gate operations"
          subtitle="Live snapshot from the security desk"
          icon="shield-check"
          action={
            <Link
              href="/admin/security"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
            >
              Open Security Operations <Icon name="arrow-right" size={13} />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
          {[
            { label: "Visitors today", value: visitorsToday, icon: "users-round", tone: "text-brand-600" },
            { label: "Open incidents", value: openIncidentsCount, icon: "shield-alert", tone: "text-rose-600" },
            { label: "Active alerts", value: activeAlerts, icon: "siren", tone: "text-amber-600" },
            { label: "Awaiting pickup", value: packagesWaiting, icon: "package", tone: "text-sky-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white px-5 py-4">
              <div className="flex items-center gap-2">
                <Icon name={s.icon} size={15} className={s.tone} />
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>
      </Card>
      )}

      {/* Financial snapshot + activity (permission-gated) */}
      {(seePayments || seeFinance) && (
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {seePayments && (
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent payments"
            icon="banknote"
            action={
              <Link
                href="/admin/treasury"
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                View all
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Plot</Th>
                <Th>Owner</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 6).map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium text-slate-800">{p.plotNo}</Td>
                  <Td>{p.ownerName}</Td>
                  <Td className="capitalize">
                    <Badge tone="slate">{p.type}</Badge>
                  </Td>
                  <Td className="text-slate-500">{p.date}</Td>
                  <Td className="text-right font-semibold text-brand-700">
                    {formatINR(p.amount)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
        )}

        {seeFinance && (
        <Card>
          <CardHeader title="Recent activity" icon="activity" />
          <div className="space-y-1 p-3">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <Icon name={activityIcon[a.type] ?? "dot"} size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-slate-700">{a.text}</p>
                  <p className="text-xs text-slate-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        )}
      </div>
      )}

      {/* Collection progress (permission-gated) */}
      {seeFinance && (
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              FY {settings.fy} collection progress
            </p>
            <p className="text-xs text-slate-500">
              {formatINR(stats.collected)} collected of {formatINR(stats.target)}{" "}
              target
            </p>
          </div>
          <span className="text-lg font-semibold text-brand-700">
            {stats.collectionRate}%
          </span>
        </div>
        <Progress value={stats.collectionRate} />
      </Card>
      )}
    </div>
  );
}
