"use client";

import Link from "next/link";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Button,
  Badge,
  StatusBadge,
  Progress,
  Table,
  Th,
  Td,
  Tr,
  Avatar,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { TrafficTrendChart, StatusDonut } from "@/components/charts";
import {
  guardStats,
  incidents,
  incidentSeverity,
  trafficTrend7d,
  blacklistedVisitors,
  blacklistedVehicles,
  emergencyAlerts,
  securityTeam,
  securitySummary,
} from "@/lib/guard-data";

export default function AdminSecurity() {
  const toast = useToast();

  const openIncidents = incidents.filter((i) =>
    ["open", "investigating", "escalated"].includes(i.status),
  );
  const criticalIncidents = incidents.filter((i) => i.severity === "critical" || i.severity === "high");
  const openAlerts = emergencyAlerts.filter((a) => a.status === "open");
  const blacklistTotal = blacklistedVisitors.length + blacklistedVehicles.length;
  const patrolPct = Math.round((securitySummary.patrolsCompleted / securitySummary.patrolsScheduled) * 100);
  const cctvPct = Math.round((securitySummary.cctvOnline / securitySummary.cctvTotal) * 100);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Security Operations"
        subtitle="Community-wide security oversight · gates, guards, incidents & alerts"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast("Security summary exported")}>
              Export summary
            </Button>
            <Button icon="external-link" onClick={() => toast("Opening live gate console…", "info")}>
              Live gate console
            </Button>
          </>
        }
      />

      {/* Escalation banner */}
      {(openAlerts.length > 0 || criticalIncidents.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
            <Icon name="siren" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800">
              {openAlerts.length} active alert · {openIncidents.length} open incident requiring oversight
            </p>
            <p className="text-xs text-rose-700">
              {criticalIncidents.length} high/critical-severity incidents logged in the last 7 days.
            </p>
          </div>
          <Link href="/admin/visitors">
            <Button size="sm" variant="secondary">Gate logs</Button>
          </Link>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Visitors today" value={guardStats.visitorsToday} icon="users-round" tone="brand" delta={guardStats.visitorsDelta} hint="Across all gates" />
        <StatCard label="Open incidents" value={openIncidents.length} icon="shield-alert" tone="rose" hint={`${criticalIncidents.length} high/critical`} />
        <StatCard label="Guards on duty" value={`${securitySummary.guardsOnDuty}/${securityTeam.length}`} icon="shield-check" tone="sky" hint={`${securitySummary.gatesMonitored} gates monitored`} />
        <StatCard label="Deliveries today" value={guardStats.deliveriesToday} icon="package" tone="violet" hint={`${guardStats.packagesWaiting} awaiting pickup`} />
        <StatCard label="Avg. response time" value={`${securitySummary.avgResponseMins} min`} icon="timer" tone="amber" hint={`${securitySummary.slaCompliance}% within SLA`} />
        <StatCard label="Blacklist entries" value={blacklistTotal} icon="ban" tone="slate" hint={`${blacklistedVisitors.length} visitors · ${blacklistedVehicles.length} vehicles`} />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Gate traffic" subtitle="Visitors vs deliveries · last 7 days" icon="trending-up" />
          <div className="p-4">
            <TrafficTrendChart data={trafficTrend7d} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Incident severity" subtitle="Last 30 days" icon="pie-chart" />
          <div className="p-4">
            <StatusDonut data={incidentSeverity} />
          </div>
        </Card>
      </div>

      {/* Operational readiness */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="footprints" size={16} className="text-brand-600" />
              <p className="text-sm font-semibold text-slate-800">Patrols completed</p>
            </div>
            <span className="text-sm font-semibold text-brand-700">{securitySummary.patrolsCompleted}/{securitySummary.patrolsScheduled}</span>
          </div>
          <Progress value={patrolPct} />
          <p className="mt-2 text-xs text-slate-400">Scheduled rounds for today’s morning shift</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="cctv" size={16} className="text-sky-600" />
              <p className="text-sm font-semibold text-slate-800">CCTV cameras online</p>
            </div>
            <span className="text-sm font-semibold text-sky-700">{securitySummary.cctvOnline}/{securitySummary.cctvTotal}</span>
          </div>
          <Progress value={cctvPct} tone={cctvPct < 95 ? "amber" : "brand"} />
          <p className="mt-2 text-xs text-slate-400">{securitySummary.cctvTotal - securitySummary.cctvOnline} cameras need attention</p>
        </Card>
      </div>

      {/* Incidents + Guards on shift */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent incidents" icon="shield-alert" action={<Badge tone="rose">{openIncidents.length} open</Badge>} />
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th>Severity</Th>
                <Th>Time</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 6).map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-800">{i.id}</Td>
                  <Td className="text-slate-700">{i.type}</Td>
                  <Td className="text-slate-500">{i.location}</Td>
                  <Td><StatusBadge status={i.severity} /></Td>
                  <Td className="text-slate-500">{i.time}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Guards on shift" subtitle="Morning · all gates" icon="users" />
          <div className="divide-y divide-slate-100">
            {securityTeam.map((g) => (
              <div key={g.name} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={g.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{g.name}</p>
                  <p className="truncate text-xs text-slate-400">{g.gate}</p>
                </div>
                <StatusBadge status={g.status} />
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3">
            <Link href="/admin/staff" className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-brand-600 hover:bg-brand-50">
              Manage security staff <Icon name="arrow-right" size={13} />
            </Link>
          </div>
        </Card>
      </div>

      {/* Active alerts */}
      <Card className="mt-6">
        <CardHeader title="Emergency alerts & notices" icon="megaphone" />
        <div className="divide-y divide-slate-100">
          {emergencyAlerts.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${a.level === "high" ? "bg-rose-50 text-rose-600" : a.level === "medium" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600"}`}>
                <Icon name={a.level === "high" ? "siren" : a.level === "medium" ? "triangle-alert" : "info"} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <p className="truncate text-xs text-slate-400">{a.body}</p>
              </div>
              <StatusBadge status={a.status} />
              <span className="whitespace-nowrap text-xs text-slate-400">{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
