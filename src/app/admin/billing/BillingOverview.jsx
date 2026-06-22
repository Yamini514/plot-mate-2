"use client";

import Link from "next/link";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  Progress,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { BillingTrendChart, CategoryBarChart, StatusDonut } from "@/components/charts";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR } from "@/lib/utils";

export function BillingOverview() {
  const toast = useToast();
  const { data: sum } = useApi("/admin/billing/invoices/summary");
  const { data: rep } = useApi("/admin/reports/overview");
  const { data: invList } = useApi("/admin/billing/invoices", { page_size: 6 });

  // Live billing KPIs (headline tiles map to current totals).
  const billingStats = {
    monthBilled: sum?.totalBilled ?? 0,
    monthCollected: sum?.totalCollected ?? 0,
    monthPending: sum?.pending ?? 0,
    monthOverdue: sum?.overdue ?? 0,
    collectionRate: sum?.collectionRate ?? 0,
    invoiceCount: sum?.invoiceCount ?? 0,
    defaulters: sum?.defaulters ?? 0,
  };
  const collectionTrend = rep?.collectionTrend ?? [];
  const outstandingAging = rep?.outstandingAging ?? [];
  const collectionByCommunity = rep?.collectionByCommunity ?? [];
  const recent = normalizeList(invList).map((i) => ({ ...i, owner: i.ownerName }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Collections Dashboard"
        subtitle="Maintenance billing, recurring invoices & collection performance"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast("Collection report exported")}>
              Export
            </Button>
            <Link href="/admin/billing/invoices">
              <Button icon="file-plus">Generate invoices</Button>
            </Link>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total billed (Jun)" value={formatINR(billingStats.monthBilled, { compact: true })} icon="badge-indian-rupee" tone="sky" hint="This billing cycle" />
        <StatCard label="Total collected" value={formatINR(billingStats.monthCollected, { compact: true })} icon="hand-coins" tone="brand" delta={{ value: "+6.4%", up: true }} hint={`${billingStats.collectionRate}% collection rate`} />
        <StatCard label="Pending collection" value={formatINR(billingStats.monthPending, { compact: true })} icon="hourglass" tone="amber" hint="Sent & partially paid" />
        <StatCard label="Overdue collection" value={formatINR(billingStats.monthOverdue, { compact: true })} icon="triangle-alert" tone="rose" delta={{ value: "-2.1%", up: false }} hint={`${billingStats.defaulters} defaulters`} />
        <StatCard label="Active invoices" value={billingStats.invoiceCount} icon="file-text" tone="violet" hint="Current cycle" />
        <StatCard label="Collection rate" value={`${billingStats.collectionRate}%`} icon="trending-up" tone="brand" hint="Collected / billed" />
      </div>

      {/* Collection progress */}
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">June 2026 collection progress</p>
            <p className="text-xs text-slate-500">
              {formatINR(billingStats.monthCollected)} collected of {formatINR(billingStats.monthBilled)} billed
            </p>
          </div>
          <span className="text-lg font-semibold text-brand-700">{billingStats.collectionRate}%</span>
        </div>
        <Progress value={billingStats.collectionRate} />
      </Card>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly collection trend" subtitle="Billed vs collected · last 6 months" icon="bar-chart-3" />
          <div className="p-4">
            <BillingTrendChart data={collectionTrend} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Outstanding dues" subtitle="By ageing bucket" icon="pie-chart" />
          <div className="p-4">
            <StatusDonut data={outstandingAging} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent invoices"
            icon="file-text"
            action={<Link href="/admin/billing/invoices" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>}
          />
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Owner</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th className="text-right">Balance</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-800">{i.id}</Td>
                  <Td>
                    <p className="text-slate-700">{i.owner}</p>
                    <p className="text-xs text-slate-400">{i.property}</p>
                  </Td>
                  <Td className="text-slate-500">{i.dueDate}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                  <Td className="text-right font-semibold text-slate-700">{i.balance > 0 ? formatINR(i.balance) : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Collection by community" subtitle="This month" icon="building-2" />
          <div className="p-4">
            <CategoryBarChart data={collectionByCommunity} />
          </div>
        </Card>
      </div>

      {/* Reports shortcuts */}
      <Card className="mt-6">
        <CardHeader title="Billing reports" subtitle="Generate & download" icon="file-down" />
        <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-5">
          {["Collection Report", "Outstanding Report", "Defaulter Report", "Monthly Revenue", "Community Wise"].map((r) => (
            <button key={r} onClick={() => toast(`${r} generated (PDF)`)} className="flex items-center gap-2 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50">
              <Icon name="file-text" size={16} className="text-brand-600" />
              <span className="text-sm font-medium text-slate-700">{r}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
