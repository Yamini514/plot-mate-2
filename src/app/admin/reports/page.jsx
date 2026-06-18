"use client";

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
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import {
  CollectionTrendChart,
  CategoryBarChart,
  StatusDonut,
} from "@/components/charts";
import { useSettings } from "@/lib/useSettings";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR } from "@/lib/utils";

export default function ReportsPage() {
  const toast = useToast();
  const { settings } = useSettings();
  const { data: rep } = useApi("/admin/reports/overview");
  const { data: ps } = useApi("/admin/plots/summary");
  const { data: plotList } = useApi("/admin/plots", { page_size: 300 });

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

  const reportFiles = [
    { name: "Collection Summary – FY 2024–25", icon: "file-spreadsheet", desc: "Plot-wise paid / pending breakdown" },
    { name: "Expense Ledger – FY 2024–25", icon: "file-text", desc: "All expenses by category & vendor" },
    { name: "Defaulters List", icon: "file-warning", desc: `${stats.pendingCount} plots with pending dues` },
    { name: "Balance Sheet", icon: "file-chart-column", desc: "Income, expenses & closing balance" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Financial and collection insights · FY ${settings.fy}`}
        actions={<Button icon="download" onClick={() => toast("All reports downloaded (PDF)")}>Download all (PDF)</Button>}
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
        <CardHeader title="Downloadable reports" icon="folder-down" />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {reportFiles.map((r) => (
            <button
              key={r.name}
              onClick={() => toast(`Downloading: ${r.name}`)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={r.icon} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
