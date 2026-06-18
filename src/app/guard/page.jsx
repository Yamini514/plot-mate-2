"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Breadcrumbs,
  StatCard,
  Card,
  CardHeader,
  Button,
  Badge,
  QuickActionButton,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { VisitorsByHourChart, TrafficTrendChart, StatusDonut } from "@/components/charts";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDeferred } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";

export default function SecurityOverview() {
  const toast = useToast();
  const router = useRouter();
  const { user } = useAuth();
  // Core gate data drives the KPI tiles + pending approvals — fetched first.
  const { data: rawVis, reload: reloadVis } = useApi("/guard/visitors", { page_size: 300 });
  const { data: rawDel } = useApi("/guard/deliveries", { page_size: 300 });
  const { data: rawInc } = useApi("/guard/incidents", { page_size: 300 });
  // Blacklist count + analytics charts are below the fold — defer so they don't
  // compete with the core data on first paint.
  const showDetail = useDeferred(250);
  const { data: rawBl } = useApi(showDetail ? "/guard/blacklist" : null, { page_size: 300 });
  const { data: reports } = useApi(showDetail ? "/guard/reports" : null);
  const visitorsByHour = reports?.visitorsByHour ?? [];
  const trafficTrend7d = reports?.trafficTrend ?? [];
  const incidentSeverity = reports?.incidentSeverity ?? [];

  const vis = normalizeList(rawVis);
  const del = normalizeList(rawDel);
  const inc = normalizeList(rawInc);
  const pending = vis.filter((v) => v.status === "pending").slice(0, 5);
  const openIncidents = inc.filter((i) => ["open", "investigating", "escalated"].includes(i.status));

  // KPI counts derived entirely from live data — empty DB shows zeros.
  const kpi = {
    visitorsToday: vis.length,
    deliveriesToday: del.length,
    packagesWaiting: del.filter((d) => d.status === "waiting" || d.status === "received").length,
    insideNow: vis.filter((v) => v.checkIn && !v.checkOut).length,
    pendingApprovals: vis.filter((v) => v.status === "pending").length,
    incidentsToday: inc.length,
    incidentsOpen: openIncidents.length,
    blacklistedEntries: normalizeList(rawBl).length,
  };

  const [busyId, setBusyId] = useState(null);

  const resolve = async (v, approved) => {
    setBusyId(v.id);
    try {
      await api.post(`/guard/visitors/${v.dbId}/action`, { action: approved ? "approve" : "reject" });
      toast(approved ? `Approved ${v.name}` : `Rejected ${v.name}`, approved ? "success" : "error");
      reloadVis();
    } catch (e) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate" }, { label: "Security" }, { label: "Dashboard" }]} />
      <PageHeader
        title={`Good morning, ${(user?.name ?? "Guard").split(" ")[0]}`}
        subtitle={`${user?.title ?? "Security"}${user?.guardId ? ` · ${user.guardId}` : ""} · Gate duty`}
        actions={
          <>
            <Badge tone="green" className="px-3 py-1.5">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              On duty
            </Badge>
            <Button icon="user-plus" onClick={() => router.push("/guard/visitors?new=1")}>
              Register Visitor
            </Button>
          </>
        }
      />

      {/* Active alert banner — only shown when there are live open incidents */}
      {openIncidents.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
            <Icon name="shield-alert" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800">
              {openIncidents.length} open incident{openIncidents.length > 1 ? "s" : ""} need{openIncidents.length > 1 ? "" : "s"} attention
            </p>
            <p className="text-xs text-rose-700">{openIncidents[0].title ?? openIncidents[0].type ?? "Review the incident log."}</p>
          </div>
          <Link href="/guard/incidents">
            <Button size="sm" variant="secondary">
              View incidents
            </Button>
          </Link>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total visitors today" value={kpi.visitorsToday} icon="users-round" tone="brand" hint="Across all gates" />
        <StatCard label="Deliveries today" value={kpi.deliveriesToday} icon="package" tone="sky" hint={`${kpi.packagesWaiting} awaiting pickup`} />
        <StatCard label="Currently inside" value={kpi.insideNow} icon="car" tone="violet" hint="Checked in, not yet out" />
        <StatCard label="Pending approvals" value={kpi.pendingApprovals} icon="hourglass" tone="amber" hint="Awaiting resident confirmation" />
        <StatCard label="Security incidents" value={kpi.incidentsToday} icon="shield-alert" tone="rose" hint={`${kpi.incidentsOpen} open · ${kpi.incidentsToday - kpi.incidentsOpen} resolved`} />
        <StatCard label="Blacklisted entries" value={kpi.blacklistedEntries} icon="ban" tone="slate" hint="Flagged vehicles & persons" />
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Quick actions</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionButton label="Register Visitor" hint="Log a new entry" icon="user-plus" tone="brand" onClick={() => router.push("/guard/visitors?new=1")} />
          <QuickActionButton label="Scan QR Pass" hint="Verify pre-approved guest" icon="qr-code" tone="sky" onClick={() => router.push("/guard/residents")} />
          <QuickActionButton label="Log Incident" hint="Report a security event" icon="shield-alert" tone="rose" onClick={() => router.push("/guard/incidents?new=1")} />
          <QuickActionButton label="Call Resident" hint="Quick intercom dial" icon="phone-call" tone="violet" onClick={() => toast("Dialing resident via intercom…", "info")} />
        </div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Visitors by hour" subtitle="Today · all gates" icon="bar-chart-3" action={<Badge tone="brand">Peak 6 PM</Badge>} />
          <div className="p-4">
            <VisitorsByHourChart data={visitorsByHour} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Incident severity" subtitle="Last 30 days" icon="pie-chart" />
          <div className="p-4">
            <StatusDonut data={incidentSeverity} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Delivery vs Visitor trend" subtitle="Last 7 days" icon="trending-up" />
          <div className="p-4">
            <TrafficTrendChart data={trafficTrend7d} />
          </div>
        </Card>

        {/* Pending approvals */}
        <Card>
          <CardHeader
            title="Pending approvals"
            icon="hourglass"
            action={
              <Link href="/guard/visitors" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          {pending.length === 0 ? (
            <EmptyState icon="circle-check-big" title="All caught up" subtitle="No visitors are waiting for approval." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Visitor</Th>
                  <Th>Flat</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((v) => (
                  <Tr key={v.id}>
                    <Td>
                      <p className="font-medium text-slate-800">{v.name}</p>
                      <p className="text-xs text-slate-400">{v.purpose}</p>
                    </Td>
                    <Td className="text-slate-500">{v.plotNo}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => resolve(v, true)} disabled={busyId === v.id} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 disabled:opacity-50" title="Approve">
                          <Icon name={busyId === v.id ? "loader-circle" : "check"} size={15} className={busyId === v.id ? "animate-spin" : undefined} />
                        </button>
                        <button onClick={() => resolve(v, false)} disabled={busyId === v.id} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50" title="Reject">
                          <Icon name={busyId === v.id ? "loader-circle" : "x"} size={15} className={busyId === v.id ? "animate-spin" : undefined} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
