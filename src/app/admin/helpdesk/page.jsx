"use client";

import Link from "next/link";
import {
  PageHeader,
  Breadcrumbs,
  StatCard,
  Card,
  CardHeader,
  Button,
  Progress,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { CountBarChart, StatusDonut } from "@/components/charts";
import {
  helpdeskStats,
  categoryTrend,
  staffPerformance,
  slaComplianceTrend,
  statusDistribution,
  tickets,
} from "@/lib/helpdesk-data";

export default function HelpdeskDashboard() {
  const toast = useToast();
  const breached = tickets.filter((t) => t.slaState === "breached");

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate" }, { label: "Support" }, { label: "Helpdesk" }]} />
      <PageHeader
        title="Helpdesk Dashboard"
        subtitle="Service request management · SLA, escalations & team performance"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast("Helpdesk analytics exported")}>Export</Button>
            <Link href="/admin/helpdesk/tickets"><Button icon="ticket">Open tickets</Button></Link>
          </>
        }
      />

      {/* SLA breach banner */}
      {breached.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
            <Icon name="alarm-clock-off" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800">{breached.length} tickets have breached SLA</p>
            <p className="text-xs text-rose-700">Auto-escalation triggered — reassign or expedite to restore compliance.</p>
          </div>
          <Link href="/admin/helpdesk/tickets"><Button size="sm" variant="secondary">Review</Button></Link>
        </div>
      )}

      {/* Widgets */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total tickets" value={helpdeskStats.total} icon="ticket" tone="brand" />
        <StatCard label="Open" value={helpdeskStats.open} icon="folder-open" tone="sky" />
        <StatCard label="In progress" value={helpdeskStats.inProgress} icon="loader" tone="violet" />
        <StatCard label="Resolved" value={helpdeskStats.resolved} icon="circle-check-big" tone="brand" />
        <StatCard label="Closed" value={helpdeskStats.closed} icon="archive" tone="slate" />
        <StatCard label="Escalated" value={helpdeskStats.escalatedCount} icon="trending-up" tone="rose" />
        <StatCard label="Overdue (SLA)" value={helpdeskStats.overdue} icon="alarm-clock-off" tone="rose" />
        <StatCard label="Reopened" value={helpdeskStats.reopened} icon="rotate-ccw" tone="amber" />
      </div>

      {/* SLA + resolution summary */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">SLA compliance</p>
            <span className="text-lg font-semibold text-brand-700">{helpdeskStats.slaCompliance}%</span>
          </div>
          <Progress value={helpdeskStats.slaCompliance} tone={helpdeskStats.slaCompliance < 90 ? "amber" : "brand"} />
          <p className="mt-2 text-xs text-slate-400">Across all priorities, last 30 days</p>
        </Card>
        <Card className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-semibold text-slate-800">Avg. resolution time</p>
            <p className="text-xs text-slate-400">First response to closure</p>
          </div>
          <p className="text-3xl font-semibold tracking-tight text-slate-900">{helpdeskStats.avgResolutionHrs}<span className="text-base font-medium text-slate-400">h</span></p>
        </Card>
      </div>

      {/* Analytics */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Category-wise volume" subtitle="Tickets by category · last 30 days" icon="bar-chart-3" />
          <div className="p-4">
            <CountBarChart data={categoryTrend} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Status distribution" icon="pie-chart" />
          <div className="p-4">
            <StatusDonut data={statusDistribution} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Staff performance" subtitle="Tickets resolved" icon="users" />
          <div className="p-4">
            <CountBarChart data={staffPerformance} />
          </div>
        </Card>
        <Card>
          <CardHeader title="SLA compliance by priority" subtitle="% within target" icon="gauge" />
          <div className="space-y-3 p-5">
            {slaComplianceTrend.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{s.name}</span>
                  <span className="text-slate-500">{s.value}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
