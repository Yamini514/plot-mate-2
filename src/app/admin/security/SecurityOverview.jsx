"use client";

import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Button,
  Badge,
  StatusBadge,
  Table,
  Th,
  Td,
  Tr,
  Avatar,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { TrafficTrendChart, StatusDonut } from "@/components/charts";
import { normalizeList } from "@/lib/api";
import { useApi, useDeferred } from "@/lib/useApi";
import { downloadCSV, formatDate } from "@/lib/utils";
import { fmtClock } from "@/lib/shift";

// Skeleton block shown while a lazy section mounts.
function SectionSkeleton({ className = "h-64" }) {
  return <Card className={`animate-pulse ${className}`} />;
}

// "1h 45m" from a minute count.
function fmtDuration(mins) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// One row of the guard attendance log (a single shift session).
function AttendanceRow({ s }) {
  const status = s.active ? "on_duty" : s.endedEarly ? "flagged" : "off_duty";
  const label = s.active ? "On duty" : s.endedEarly ? "Early out" : "Completed";
  return (
    <Tr>
      <Td>
        <div className="flex items-center gap-3">
          <Avatar name={s.guardName} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{s.guardName}</p>
            <p className="truncate text-xs text-slate-400">{s.guardId ? `${s.guardId} · ` : ""}{s.shiftName || "—"} shift</p>
          </div>
        </div>
      </Td>
      <Td className="text-slate-600">
        {fmtClock(s.startedAt)}
        <span className="block text-xs text-slate-400">{s.startedAt ? formatDate(s.startedAt) : ""}</span>
      </Td>
      <Td className="text-slate-600">{s.endedAt ? fmtClock(s.endedAt) : <span className="text-emerald-600">— on duty —</span>}</Td>
      <Td className="text-slate-500">{fmtDuration(s.durationMins)}</Td>
      <Td><Badge tone={status === "on_duty" ? "green" : status === "flagged" ? "amber" : "slate"}>{label}</Badge></Td>
    </Tr>
  );
}

export function SecurityOverview() {
  const toast = useToast();
  // One aggregated round-trip powers the whole dashboard.
  const { data: ov, loading, error } = useApi("/admin/security/overview");
  // Heavy, below-the-fold sections (charts/tables) mount after the KPIs paint.
  const showDetail = useDeferred(150);
  // Guard attendance (login/logout timings) — below the fold, so deferred too.
  const { data: sessData } = useApi(showDetail ? "/admin/security/guard-sessions" : null);
  const sessions = sessData ?? [];
  const onDutyCount = sessions.filter((s) => s.active).length;

  const s = ov ?? {};
  const blacklistTotal = (s.blacklistVisitors ?? 0) + (s.blacklistVehicles ?? 0);
  const incidents = normalizeList(s.recentIncidents);
  const alerts = s.alerts ?? [];
  const team = s.team ?? [];
  const openAlerts = alerts.filter((a) => a.status !== "resolved");

  const exportSummary = () => {
    downloadCSV("plotmate-security-summary.csv", [
      { metric: "Visitors today", value: s.visitorsToday ?? 0 },
      { metric: "Currently inside", value: s.visitorsInside ?? 0 },
      { metric: "Pending approvals", value: s.pendingApprovals ?? 0 },
      { metric: "Deliveries today", value: s.deliveriesToday ?? 0 },
      { metric: "Packages awaiting pickup", value: s.packagesWaiting ?? 0 },
      { metric: "Open incidents", value: s.openIncidents ?? 0 },
      { metric: "High/critical incidents", value: s.criticalIncidents ?? 0 },
      { metric: "Guards", value: s.guardsTotal ?? 0 },
      { metric: "Blacklisted persons", value: s.blacklistVisitors ?? 0 },
      { metric: "Blacklisted vehicles", value: s.blacklistVehicles ?? 0 },
    ], [
      { label: "Metric", get: (r) => r.metric },
      { label: "Value", get: (r) => r.value },
    ]);
    toast("Security summary exported (CSV)");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Security Operations"
        subtitle="Community-wide security oversight · gates, guards & incidents"
        actions={
          <Button variant="secondary" icon="download" disabled={!ov} onClick={exportSummary}>
            Export summary
          </Button>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <Icon name="triangle-alert" size={18} />
          Couldn’t load the security snapshot. {error.message}
        </div>
      )}

      {/* Escalation banner — only when there's something open */}
      {(openAlerts.length > 0 || (s.openIncidents ?? 0) > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
            <Icon name="siren" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800">
              {s.openIncidents ?? 0} open incident{(s.openIncidents ?? 0) === 1 ? "" : "s"} requiring oversight
            </p>
            <p className="text-xs text-rose-700">
              {s.criticalIncidents ?? 0} high/critical-severity incident{(s.criticalIncidents ?? 0) === 1 ? "" : "s"} on record.
            </p>
          </div>
        </div>
      )}

      {/* KPI tiles — paint immediately (no charts) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Visitors today" value={s.visitorsToday ?? "—"} icon="users-round" tone="brand" hint={`${s.visitorsInside ?? 0} currently inside`} />
        <StatCard label="Open incidents" value={s.openIncidents ?? "—"} icon="shield-alert" tone="rose" hint={`${s.criticalIncidents ?? 0} high/critical`} />
        <StatCard label="Guards" value={s.guardsTotal ?? "—"} icon="shield-check" tone="sky" hint="Active security accounts" />
        <StatCard label="Deliveries today" value={s.deliveriesToday ?? "—"} icon="package" tone="violet" hint={`${s.packagesWaiting ?? 0} awaiting pickup`} />
        <StatCard label="Pending approvals" value={s.pendingApprovals ?? "—"} icon="hourglass" tone="amber" hint="Visitors awaiting resident OK" />
        <StatCard label="Blacklist entries" value={blacklistTotal} icon="ban" tone="slate" hint={`${s.blacklistVisitors ?? 0} persons · ${s.blacklistVehicles ?? 0} vehicles`} />
      </div>

      {/* Charts — lazy */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {showDetail ? (
          <>
            <Card className="lg:col-span-2">
              <CardHeader title="Gate traffic" subtitle="Visitors vs deliveries · last 7 days" icon="trending-up" />
              <div className="p-4"><TrafficTrendChart data={s.trafficTrend ?? []} /></div>
            </Card>
            <Card>
              <CardHeader title="Incident severity" subtitle="All time" icon="pie-chart" />
              <div className="p-4"><StatusDonut data={s.incidentSeverity ?? []} /></div>
            </Card>
          </>
        ) : (
          <>
            <SectionSkeleton className="h-72 lg:col-span-2" />
            <SectionSkeleton className="h-72" />
          </>
        )}
      </div>

      {/* Incidents + guards — lazy */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {showDetail ? (
          <>
            <Card className="lg:col-span-2">
              <CardHeader title="Recent incidents" icon="shield-alert" action={<Badge tone="rose">{s.openIncidents ?? 0} open</Badge>} />
              {incidents.length === 0 ? (
                <EmptyState icon="shield-check" title="No incidents logged" subtitle="Guard-reported incidents will appear here." />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>ID</Th><Th>Type</Th><Th>Location</Th><Th>Severity</Th><Th>When</Th><Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((i) => (
                      <Tr key={i.id}>
                        <Td className="font-medium text-slate-800">{i.code ?? i.id}</Td>
                        <Td className="text-slate-700">{i.type}</Td>
                        <Td className="text-slate-500">{i.location ?? "—"}</Td>
                        <Td><StatusBadge status={i.severity} /></Td>
                        <Td className="text-slate-500">{i.occurredAt || i.createdAt ? formatDate(i.occurredAt || i.createdAt) : "—"}</Td>
                        <Td><StatusBadge status={i.status} /></Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            <Card>
              <CardHeader title="Security team" subtitle={`${team.length} guard${team.length === 1 ? "" : "s"}`} icon="users" />
              {team.length === 0 ? (
                <EmptyState icon="user-x" title="No guards yet" subtitle="Add security logins from Staff & Vendors." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {team.map((g, idx) => (
                    <div key={`${g.name}-${idx}`} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={g.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{g.name}</p>
                        <p className="truncate text-xs text-slate-400">{g.title}</p>
                      </div>
                      <StatusBadge status={g.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : (
          <>
            <SectionSkeleton className="h-64 lg:col-span-2" />
            <SectionSkeleton className="h-64" />
          </>
        )}
      </div>

      {/* Guard attendance — login / logout timings per shift (lazy) */}
      {showDetail && (
        <Card className="mt-6">
          <CardHeader
            title="Guard attendance"
            subtitle="Login & logout timings per shift"
            icon="clock"
            action={
              <Badge tone={onDutyCount > 0 ? "green" : "slate"}>
                {onDutyCount} on duty now
              </Badge>
            }
          />
          {sessions.length === 0 ? (
            <EmptyState icon="clock" title="No shifts recorded yet" subtitle="A guard's login and logout times appear here once they sign in." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Guard</Th>
                  <Th>Clock in</Th>
                  <Th>Clock out</Th>
                  <Th>On duty</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => <AttendanceRow key={s.id} s={s} />)}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* Alerts (derived from open high/critical incidents) — lazy */}
      {showDetail && alerts.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Active alerts" subtitle="Open high / critical incidents" icon="siren" />
          <div className="divide-y divide-slate-100">
            {alerts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${a.level === "high" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                  <Icon name={a.level === "high" ? "siren" : "triangle-alert"} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="truncate text-xs text-slate-400">{a.body}</p>
                </div>
                <StatusBadge status={a.status} />
                <span className="whitespace-nowrap text-xs text-slate-400">{a.time ? formatDate(a.time) : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading && !ov && (
        <p className="mt-6 text-center text-sm text-slate-400">Loading security snapshot…</p>
      )}
    </div>
  );
}
