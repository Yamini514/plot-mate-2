"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatCard,
  Avatar,
  Badge,
  StatusBadge,
  Drawer,
  Tabs,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { myProfile, myPlots as seedPlots, myPortfolio } from "@/lib/member-data";
import { pendingApprovals } from "@/lib/member-gate-data";
import { announcements, association } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";

const activityIcon = {
  visitor: "user-check",
  delivery: "package",
  incident: "shield-alert",
  vehicle: "car",
};

export default function MemberHome() {
  const toast = useToast();
  const [plots, setPlots] = useState(seedPlots);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("overview");

  const selected = plots.find((p) => p.id === selectedId) ?? null;
  const totalDue = plots.reduce((s, p) => s + p.amountDue, 0);

  const openPlot = (id) => {
    setSelectedId(id);
    setTab("overview");
  };

  const payPlot = (id) => {
    setPlots((ps) =>
      ps.map((p) =>
        p.id === id
          ? {
              ...p,
              amountDue: 0,
              paymentStatus: "paid",
              daysOverdue: 0,
              charges: p.charges.map((c) => (c.status === "paid" ? c : { ...c, status: "paid" })),
            }
          : p,
      ),
    );
    const p = plots.find((x) => x.id === id);
    toast(`Payment of ${formatINR(p.amountDue)} successful for ${p.plotNo} · receipt sent`);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Properties"
        subtitle={`${myProfile.name} · ${association.name}`}
        actions={
          <>
            <Link href="/member/visitors">
              <Button variant="secondary" icon="user-plus">Pre-register visitor</Button>
            </Link>
            {totalDue > 0 && (
              <Link href="/member/billing">
                <Button icon="indian-rupee">Pay all dues ({formatINR(totalDue)})</Button>
              </Link>
            )}
          </>
        }
      />

      {/* Owner hero */}
      <Card className="overflow-hidden">
        <div className="relative bg-brand-700 p-6 text-white">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, #34d399 0, transparent 45%), radial-gradient(circle at 85% 80%, #0ea5e9 0, transparent 45%)",
            }}
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={myProfile.name} size={56} className="bg-white/20 text-white" />
              <div>
                <p className="text-lg font-semibold">{myProfile.name}</p>
                <p className="text-sm text-brand-100">
                  {myProfile.memberId} · {myPortfolio.plots} properties · {myPortfolio.jointPlots} jointly held
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs text-brand-100">Membership</p>
                <p className="font-semibold capitalize">{myProfile.membership}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs text-brand-100">Total due</p>
                <p className="font-semibold">{totalDue > 0 ? formatINR(totalDue) : "₹0"}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Due banner */}
      {totalDue > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <Icon name="triangle-alert" size={24} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">{formatINR(totalDue)} in maintenance charges pending</p>
            <p className="text-sm text-amber-700">
              Across {plots.filter((p) => p.amountDue > 0).length} of your {plots.length} properties.
            </p>
          </div>
          <Link href="/member/billing">
            <Button icon="wallet">Pay now</Button>
          </Link>
        </div>
      )}

      {/* Live gate approvals */}
      {pendingApprovals.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-sky-600">
            <Icon name="bell-ring" size={24} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sky-800">{pendingApprovals.length} visitor(s) waiting at the gate</p>
            <p className="text-sm text-sky-700">{pendingApprovals[0].name} ({pendingApprovals[0].purpose}) and others need your approval.</p>
          </div>
          <Link href="/member/visitors">
            <Button icon="check">Review &amp; approve</Button>
          </Link>
        </div>
      )}

      {/* Portfolio summary (incl. security) */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Properties owned" value={myPortfolio.plots} icon="map-pinned" tone="brand" hint={`${myPortfolio.jointPlots} joint`} />
        <StatCard label="Total due" value={totalDue > 0 ? formatINR(totalDue, { compact: true }) : "₹0"} icon="wallet" tone={totalDue > 0 ? "amber" : "brand"} />
        <StatCard label="Visitors this month" value={myPortfolio.visitors} icon="users-round" tone="sky" hint="Across all properties" />
        <StatCard label="Open issues" value={myPortfolio.incidents} icon="shield-alert" tone={myPortfolio.incidents > 0 ? "rose" : "slate"} hint={`${myPortfolio.deliveries} parcels awaiting`} />
      </div>

      {/* My Plots */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">My Plots & Properties</h2>
          <span className="text-xs text-slate-400">{plots.length} registered</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plots.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name={p.type === "Villa" ? "house" : "map-pinned"} size={22} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.plotNo}</p>
                    <p className="text-xs text-slate-400">{p.type} · {p.size} sqyd · {p.phase}</p>
                  </div>
                </div>
                <StatusBadge status={p.paymentStatus} />
              </div>

              {/* Registered names */}
              <div className="mt-4 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {p.registeredNames.slice(0, 3).map((r) => (
                    <Avatar key={r.name} name={r.name} size={26} className="ring-2 ring-white" />
                  ))}
                </div>
                <span className="text-xs text-slate-500">
                  {p.registeredNames.length > 1 ? `${p.registeredNames.length} owners` : "Sole owner"}
                </span>
                {p.registeredNames.length > 1 && <Badge tone="violet">Joint</Badge>}
              </div>

              {/* Mini security + dues row */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.security.visitorsThisMonth}</p>
                  <p className="text-[11px] text-slate-400">Visitors</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.security.deliveriesPending}</p>
                  <p className="text-[11px] text-slate-400">Parcels</p>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${p.security.openIncidents > 0 ? "text-rose-600" : "text-slate-800"}`}>{p.security.openIncidents}</p>
                  <p className="text-[11px] text-slate-400">Issues</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs text-slate-400">Amount due</p>
                  <p className={`text-base font-bold ${p.amountDue > 0 ? "text-amber-600" : "text-brand-700"}`}>
                    {p.amountDue > 0 ? formatINR(p.amountDue) : "Cleared"}
                  </p>
                </div>
                <Button size="sm" icon="eye" onClick={() => openPlot(p.id)}>View</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Latest updates */}
      <Card className="mt-8">
        <CardHeader
          title="Latest updates"
          icon="megaphone"
          action={<Link href="/member/announcements" className="text-xs font-medium text-brand-600 hover:underline">View all</Link>}
        />
        <div className="divide-y divide-slate-100">
          {announcements.slice(0, 3).map((a) => (
            <div key={a.id} className="px-5 py-4">
              <div className="flex items-center gap-2">
                {a.pinned && <Icon name="pin" size={13} className="text-rose-500" />}
                <p className="font-medium text-slate-800">{a.title}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.body}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(a.date)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- Plot detail drawer ---- */}
      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        width="max-w-xl"
        title={selected ? `${selected.plotNo} · ${selected.type}` : ""}
        subtitle={selected ? `${selected.size} sqyd · ${selected.phase} · ${selected.facing} facing` : ""}
        footer={
          selected && selected.amountDue > 0 && (
            <Button icon="indian-rupee" onClick={() => payPlot(selected.id)}>
              Pay {formatINR(selected.amountDue)}
            </Button>
          )
        }
      >
        {selected && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <StatusBadge status={selected.paymentStatus} />
              {selected.registeredNames.length > 1 && <Badge tone="violet">Jointly registered</Badge>}
              {selected.security.openIncidents > 0 && <Badge tone="rose">{selected.security.openIncidents} open issue</Badge>}
            </div>

            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "overview", label: "Overview" },
                { value: "charges", label: "Charges", count: selected.charges.length },
                { value: "security", label: "Security" },
              ]}
            />

            {/* OVERVIEW */}
            {tab === "overview" && (
              <div className="mt-4 space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Registered owners</p>
                  <div className="space-y-2">
                    {selected.registeredNames.map((r) => (
                      <div key={r.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                        <Avatar name={r.name} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.share}</p>
                        </div>
                        {r.primary && <Badge tone="brand">Primary</Badge>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Meta label="Property type" value={selected.type} />
                  <Meta label="Size" value={`${selected.size} sqyd`} />
                  <Meta label="Phase" value={selected.phase} />
                  <Meta label="Facing" value={selected.facing} />
                  <Meta label="Plot / Unit no." value={selected.plotNo} />
                  <Meta label="Registered vehicles" value={selected.security.registeredVehicles.length || "None"} />
                </div>
              </div>
            )}

            {/* CHARGES */}
            {tab === "charges" && (
              <div className="mt-4">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Charge</Th>
                        <Th>Frequency</Th>
                        <Th>Due</Th>
                        <Th className="text-right">Amount</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.charges.map((c) => (
                        <Tr key={c.id}>
                          <Td className="font-medium text-slate-800">{c.plan}</Td>
                          <Td className="text-slate-500">{c.frequency}</Td>
                          <Td className="text-slate-500">{c.dueDate}</Td>
                          <Td className="text-right font-medium text-slate-700">{formatINR(c.amount)}</Td>
                          <Td><StatusBadge status={c.status} /></Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-800">Total due now</span>
                  <span className={`text-lg font-bold ${selected.amountDue > 0 ? "text-amber-600" : "text-brand-700"}`}>
                    {selected.amountDue > 0 ? formatINR(selected.amountDue) : "Cleared"}
                  </span>
                </div>
              </div>
            )}

            {/* SECURITY */}
            {tab === "security" && (
              <div className="mt-4 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <Meta label="Visitors this month" value={selected.security.visitorsThisMonth} />
                  <Meta label="Parcels awaiting" value={selected.security.deliveriesPending} />
                  <Meta label="Open issues" value={selected.security.openIncidents} />
                  <Meta label="Last gate entry" value={selected.security.lastEntry} />
                </div>

                {selected.security.registeredVehicles.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Registered vehicles</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.security.registeredVehicles.map((v) => (
                        <span key={v} className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                          <Icon name="car" size={13} /> {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Recent gate activity</p>
                  <div className="space-y-1">
                    {selected.security.activity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
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
                </div>

                <Link href="/member/helpdesk" className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50">
                  <Icon name="life-buoy" size={15} /> Raise a service request for this property
                </Link>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}
