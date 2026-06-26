"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatCard,
  Table,
  Th,
  Td,
  Tr,
  Badge,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import {
  CollectionTrendChart,
  CategoryBarChart,
  StatusDonut,
} from "@/components/charts";
import { useSettings } from "@/lib/useSettings";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR, downloadCSV, downloadExcel, printReport } from "@/lib/utils";

export default function ReportsPage() {
  const { settings } = useSettings();
  const { data: rep } = useApi("/admin/reports/overview");
  const { data: ps } = useApi("/admin/plots/summary");
  const { data: plotList } = useApi("/admin/plots", { page_size: 300 });
  const { data: staffList } = useApi("/admin/staff");
  const { data: maintList } = useApi("/admin/maintenance");

  // Report filters.
  const [phase, setPhase] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const stats = {
    collectionRate: rep?.collection?.rate ?? 0,
    target: rep?.collection?.billed ?? 0,
    collected: rep?.collection?.collected ?? 0,
    outstanding: rep?.collection?.outstanding ?? 0,
    paidCount: ps?.paidCount ?? 0,
    pendingCount: ps?.pendingCount ?? 0,
    unknownCount: ps?.unknownCount ?? 0,
  };
  const totalPlots = ps?.totalPlots ?? 0;
  const expenseByCategory = rep?.expensesByCategory ?? [];

  const owners = normalizeList(plotList);
  const phaseStats = Array.from(new Set(owners.map((o) => o.phase).filter(Boolean)))
    .sort()
    .map((phase) => {
      const list = owners.filter((o) => o.phase === phase);
      const paid = list.filter((o) => o.paymentStatus === "paid").length;
      return {
        phase, total: list.length, paid,
        pending: list.filter((o) => o.paymentStatus === "pending").length,
        rate: list.length ? Math.round((paid / list.length) * 100) : 0,
      };
    });

  // Owners filtered by the report filter bar (phase + payment status).
  const filteredOwners = owners.filter(
    (o) => (phase === "all" || o.phase === phase) &&
           (statusFilter === "all" || o.paymentStatus === statusFilter),
  );
  const phases = Array.from(new Set(owners.map((o) => o.phase).filter(Boolean))).sort();
  const vendors = normalizeList(staffList).filter((s) => s.type === "vendor" || s.kind === "vendor");
  const schedules = normalizeList(maintList);

  // Each report: a title, columns, and the rows to export. Exports are built
  // client-side (CSV/Excel/PDF) from already-fetched data — no auth-gated link.
  const reportDefs = [
    {
      key: "collection", name: "Collection Summary", icon: "file-spreadsheet",
      desc: "Plot-wise paid / pending breakdown",
      rows: filteredOwners,
      columns: [
        { label: "Plot", get: (o) => o.plotNo }, { label: "Owner", get: (o) => o.ownerName },
        { label: "Phase", get: (o) => o.phase }, { label: "Status", get: (o) => o.paymentStatus },
        { label: "Amount due", get: (o) => o.amountDue },
      ],
    },
    {
      key: "defaulters", name: "Defaulters List", icon: "file-warning",
      desc: `${stats.pendingCount} plots with pending dues`,
      rows: filteredOwners.filter((o) => o.paymentStatus === "pending"),
      columns: [
        { label: "Plot", get: (o) => o.plotNo }, { label: "Owner", get: (o) => o.ownerName },
        { label: "Phone", get: (o) => o.phone }, { label: "Amount due", get: (o) => o.amountDue },
        { label: "Days overdue", get: (o) => o.daysOverdue },
      ],
    },
    {
      key: "expenses", name: "Expense Ledger", icon: "file-text",
      desc: "Expenses by category",
      rows: expenseByCategory,
      columns: [{ label: "Category", get: (e) => e.name }, { label: "Amount", get: (e) => e.value }],
    },
    {
      key: "plots", name: "Plots Report", icon: "map-pinned",
      desc: `${filteredOwners.length} plots`,
      rows: filteredOwners,
      columns: [
        { label: "Plot", get: (o) => o.plotNo }, { label: "Owner", get: (o) => o.ownerName },
        { label: "Phase", get: (o) => o.phase }, { label: "Size (sqyd)", get: (o) => o.sizeSqyd },
        { label: "Status", get: (o) => o.status }, { label: "Membership", get: (o) => o.membership },
      ],
    },
    {
      key: "vendors", name: "Vendors Report", icon: "hard-hat",
      desc: `${vendors.length} vendors`,
      rows: vendors,
      columns: [
        { label: "Name", get: (v) => v.name }, { label: "Categories", get: (v) => (v.categories || []).join("; ") },
        { label: "SLA (hrs)", get: (v) => v.slaResponseHours }, { label: "Verified", get: (v) => (v.verified ? "Yes" : "No") },
        { label: "Status", get: (v) => v.status },
      ],
    },
    {
      key: "maintenance", name: "Maintenance Report", icon: "calendar-clock",
      desc: `${schedules.length} schedules`,
      rows: schedules,
      columns: [
        { label: "Task", get: (m) => m.title || m.name }, { label: "Frequency", get: (m) => m.frequency },
        { label: "Next due", get: (m) => m.nextDueOn }, { label: "Assignee", get: (m) => m.assigneeName || m.assignee },
        { label: "State", get: (m) => m.state },
      ],
    },
  ];

  const exportReport = (def, fmt) => {
    const fname = def.key;
    if (fmt === "csv") downloadCSV(`${fname}.csv`, def.rows, def.columns);
    else if (fmt === "excel") downloadExcel(`${fname}.xls`, def.rows, def.columns, def.name);
    else printReport(def.name, def.rows, def.columns, `PlotMate · FY ${settings.fy}`);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Financial and collection insights · FY ${settings.fy}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Collection rate" value={`${stats.collectionRate}%`} icon="target" tone="brand" />
        <StatCard label="Avg. dues / plot" value={formatINR(totalPlots ? Math.round(stats.target / totalPlots) : 0)} icon="divide" tone="sky" />
        <StatCard label="Recovered this FY" value={formatINR(stats.collected, { compact: true })} icon="banknote" tone="violet" />
        <StatCard label="Pending recovery" value={formatINR(stats.outstanding, { compact: true })} icon="hourglass" tone="amber" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly trend" subtitle="Collections vs expenses" icon="line-chart" />
          <div className="p-4">
            <CollectionTrendChart data={rep?.collectionTrend ?? []} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Status split" icon="pie-chart" />
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
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Collection by phase" icon="layers" />
          <Table>
            <thead>
              <tr>
                <Th>Phase</Th>
                <Th>Plots</Th>
                <Th>Paid</Th>
                <Th>Pending</Th>
                <Th>Rate</Th>
              </tr>
            </thead>
            <tbody>
              {phaseStats.map((p) => (
                <Tr key={p.phase}>
                  <Td className="font-medium text-slate-800">{p.phase}</Td>
                  <Td>{p.total}</Td>
                  <Td className="text-brand-600">{p.paid}</Td>
                  <Td className="text-amber-600">{p.pending}</Td>
                  <Td>
                    <Badge tone={p.rate >= 40 ? "green" : "amber"}>{p.rate}%</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Expense breakdown" icon="bar-chart-3" />
          <div className="p-4">
            <CategoryBarChart data={expenseByCategory} />
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Downloadable reports" icon="folder-down" />
          <div className="flex gap-2">
            <select className={`${inputClass} w-36`} value={phase} onChange={(e) => setPhase(e.target.value)}>
              <option value="all">All phases</option>
              {phases.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className={`${inputClass} w-36`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {reportDefs.map((r) => (
            <div key={r.key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={r.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">{r.desc} · {r.rows.length} rows</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" disabled={!r.rows.length} onClick={() => exportReport(r, "csv")}>CSV</Button>
                <Button size="sm" variant="ghost" disabled={!r.rows.length} onClick={() => exportReport(r, "excel")}>Excel</Button>
                <Button size="sm" variant="ghost" disabled={!r.rows.length} onClick={() => exportReport(r, "pdf")}>PDF</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
