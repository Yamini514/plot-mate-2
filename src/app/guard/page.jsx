"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  guardProfile,
  guardStats,
  visitorsByHour,
  trafficTrend7d,
  incidentSeverity,
  visitors,
  emergencyAlerts,
} from "@/lib/guard-data";

export default function SecurityOverview() {
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(
    visitors.filter((v) => v.status === "pending").slice(0, 5),
  );

  const resolve = (id, name, approved) => {
    setPending((p) => p.filter((v) => v.id !== id));
    toast(approved ? `Approved ${name}` : `Rejected ${name}`, approved ? "success" : "error");
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate" }, { label: "Security" }, { label: "Dashboard" }]} />
      <PageHeader
        title={`Good morning, ${guardProfile.name.split(" ")[0]}`}
        subtitle={`${guardProfile.gate} · ${guardProfile.shift} shift (${guardProfile.shiftStart}–${guardProfile.shiftEnd})`}
        actions={
          <>
            <Badge tone="green" className="px-3 py-1.5">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              On duty since {guardProfile.clockIn}
            </Badge>
            <Button icon="user-plus" onClick={() => router.push("/guard/visitors?new=1")}>
              Register Visitor
            </Button>
          </>
        }
      />

      {/* Active alert banner */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
          <Icon name="shield-alert" size={20} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-rose-800">
            {emergencyAlerts.filter((a) => a.status === "open").length} active alert needs attention
          </p>
          <p className="text-xs text-rose-700">
            East Gate boom barrier is jammed — operate manually until the technician arrives.
          </p>
        </div>
        <Link href="/guard/blacklist">
          <Button size="sm" variant="secondary">
            View alerts
          </Button>
        </Link>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total visitors today" value={guardStats.visitorsToday} icon="users-round" tone="brand" delta={guardStats.visitorsDelta} hint="Across all gates" />
        <StatCard label="Deliveries today" value={guardStats.deliveriesToday} icon="package" tone="sky" delta={guardStats.deliveriesDelta} hint={`${guardStats.packagesWaiting} awaiting pickup`} />
        <StatCard label="Residents checked in" value={guardStats.residentsCheckedIn} icon="car" tone="violet" delta={guardStats.residentsDelta} hint={`${guardStats.residentsCheckedIn} vehicles inside`} />
        <StatCard label="Pending approvals" value={guardStats.pendingApprovals} icon="hourglass" tone="amber" hint="Awaiting resident confirmation" />
        <StatCard label="Security incidents" value={guardStats.incidentsToday} icon="shield-alert" tone="rose" hint={`${guardStats.incidentsOpen} open · ${guardStats.incidentsToday - guardStats.incidentsOpen} resolved`} />
        <StatCard label="Blacklisted entries" value={guardStats.blacklistedEntries} icon="ban" tone="slate" hint={`${guardStats.blacklistAttemptsToday} attempt blocked today`} />
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
                    <Td className="text-slate-500">{v.flat}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => resolve(v.id, v.name, true)} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100" title="Approve">
                          <Icon name="check" size={15} />
                        </button>
                        <button onClick={() => resolve(v.id, v.name, false)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" title="Reject">
                          <Icon name="x" size={15} />
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
