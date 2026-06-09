"use client";

import Link from "next/link";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatCard,
  Avatar,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import {
  getMemberOwner,
  announcements,
  association,
  events,
} from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";

export default function MemberHome() {
  const me = getMemberOwner();
  const annualFee = me.sizeSqyd * association.ratePerSqyd;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Plot"
        subtitle={`Welcome back · ${association.name}`}
      />

      {/* Hero plot card */}
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
              <Avatar name={me.name ?? "Member"} size={56} className="bg-white/20 text-white" />
              <div>
                <p className="text-lg font-semibold">{me.name}</p>
                <p className="text-sm text-brand-100">
                  Plot {me.plotNo} · {me.sizeSqyd} sqyd · {me.phase}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs text-brand-100">Membership</p>
              <p className="font-semibold capitalize">{me.membership}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Dues alert */}
      {me.paymentStatus !== "paid" && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <Icon name="triangle-alert" size={24} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              Maintenance fee of {formatINR(me.amountDue)} is pending
            </p>
            <p className="text-sm text-amber-700">
              Overdue by {me.daysOverdue} days for FY {association.fy}.
            </p>
          </div>
          <Link href="/member/dues">
            <Button icon="wallet">Pay now</Button>
          </Link>
        </div>
      )}

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Annual fee" value={formatINR(annualFee)} icon="receipt" tone="sky" />
        <StatCard
          label="Amount due"
          value={me.amountDue > 0 ? formatINR(me.amountDue) : "₹0"}
          icon="wallet"
          tone={me.amountDue > 0 ? "amber" : "brand"}
        />
        <StatCard label="Plot size" value={`${me.sizeSqyd} sqyd`} icon="ruler" tone="violet" />
        <StatCard label="Phase" value={me.phase} icon="map-pinned" tone="brand" />
      </div>

      {/* Announcements + events */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Latest updates"
            icon="megaphone"
            action={
              <Link href="/member/announcements" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
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

        <Card>
          <CardHeader title="Upcoming events" icon="calendar-days" />
          <div className="divide-y divide-slate-100">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <span className="text-sm font-bold leading-none">
                    {new Date(e.date).getDate()}
                  </span>
                  <span className="text-[10px] uppercase">
                    {new Date(e.date).toLocaleDateString("en-IN", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{e.title}</p>
                  <p className="text-xs text-slate-400">
                    {e.time} · {e.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
