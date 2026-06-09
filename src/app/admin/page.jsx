"use client";

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
import {
  stats,
  monthlyTrend,
  recentActivity,
  payments,
  association,
} from "@/lib/mock-data";
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
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`${association.name} · FY ${association.fy}`}
        actions={
          <>
            <Button variant="secondary" icon="download" size="md" onClick={() => toast("Dashboard summary exported")}>
              Export
            </Button>
            <Button icon="bell-ring" onClick={() => toast(`Reminders queued for ${stats.pendingCount} pending owners`)}>Send reminders</Button>
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
            {association.fy}
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

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collection rate"
          value={`${stats.collectionRate}%`}
          icon="trending-up"
          tone="brand"
          delta={{ value: "+8.2%", up: true }}
          hint={`${formatINR(stats.collected, { compact: true })} of ${formatINR(stats.target, { compact: true })}`}
        />
        <StatCard
          label="Treasury balance"
          value={formatINR(stats.treasuryBalance, { compact: true })}
          icon="wallet"
          tone="sky"
          hint="Available funds"
        />
        <StatCard
          label="Outstanding dues"
          value={formatINR(stats.outstanding, { compact: true })}
          icon="triangle-alert"
          tone="amber"
          delta={{ value: "-3.1%", up: false }}
          hint={`${stats.pendingCount} plots pending`}
        />
        <StatCard
          label="Plots registered"
          value={`${association.totalPlots}`}
          icon="map-pinned"
          tone="violet"
          hint={`${stats.paidCount} paid · ${stats.pendingCount} pending · ${stats.unknownCount} unknown`}
        />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Collections vs Expenses"
            subtitle="Last 6 months"
            icon="bar-chart-3"
            action={<Badge tone="brand">FY {association.fy}</Badge>}
          />
          <div className="p-4">
            <CollectionTrendChart data={monthlyTrend} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment status" subtitle="All 280 plots" icon="pie-chart" />
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

      {/* Financial snapshot + activity */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
      </div>

      {/* Collection progress */}
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              FY {association.fy} collection progress
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
    </div>
  );
}
