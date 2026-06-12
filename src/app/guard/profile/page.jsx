"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  CardHeader,
  Button,
  Badge,
  StatusBadge,
  Avatar,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { guardProfile, shiftRoster, recentGateActions } from "@/lib/guard-data";

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function GuardProfile() {
  const toast = useToast();
  const [onDuty, setOnDuty] = useState(guardProfile.shiftStatus === "on_duty");

  const toggleShift = () => {
    setOnDuty((d) => !d);
    toast(onDuty ? "Shift ended — clocked out" : "Shift started — clocked in");
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "System" }, { label: "Profile & Shift" }]} />
      <PageHeader title="Guard Profile & Shift" subtitle="Your assignment, shift timings and attendance" />

      {/* Profile banner */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <Avatar name={guardProfile.name} size={72} className="text-xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{guardProfile.name}</h2>
              <StatusBadge status={onDuty ? "on_duty" : "off_duty"} />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{guardProfile.title} · {guardProfile.guardId}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Icon name="building-2" size={13} /> {guardProfile.agency}</span>
              <span className="flex items-center gap-1"><Icon name="star" size={13} className="text-amber-500" /> {guardProfile.rating} rating</span>
              <span className="flex items-center gap-1"><Icon name="calendar-check" size={13} /> {guardProfile.shiftsThisMonth} shifts this month</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">Current shift</p>
            <p className="text-lg font-semibold text-slate-900">{guardProfile.shiftStart} – {guardProfile.shiftEnd}</p>
            <p className="text-xs text-slate-400">{guardProfile.shift} · clocked in {guardProfile.clockIn}</p>
            <Button
              className="mt-3"
              variant={onDuty ? "danger" : "primary"}
              icon={onDuty ? "log-out" : "log-in"}
              onClick={toggleShift}
            >
              {onDuty ? "End Shift" : "Start Shift"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Assignment & contact */}
        <Card>
          <CardHeader title="Assignment" icon="map-pin" />
          <div className="divide-y divide-slate-100">
            <InfoRow icon="door-open" label="Assigned gate / location" value={guardProfile.gate} />
            <InfoRow icon="clock" label="Shift timings" value={`${guardProfile.shiftStart} – ${guardProfile.shiftEnd} (${guardProfile.shift})`} />
            <InfoRow icon="phone" label="Contact" value={guardProfile.phone} />
            <InfoRow icon="mail" label="Email" value={guardProfile.email} />
            <InfoRow icon="user-cog" label="Supervisor" value={`${guardProfile.supervisor.name} · ${guardProfile.supervisor.phone}`} />
          </div>
        </Card>

        {/* Attendance + roster */}
        <Card>
          <CardHeader title="Shift roster" subtitle="Main Gate · today" icon="calendar-days" />
          <div className="space-y-2 p-4">
            {shiftRoster.map((s) => (
              <div
                key={s.shift}
                className={`flex items-center justify-between rounded-xl border p-3 ${s.current ? "border-brand-200 bg-brand-50/60" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${s.current ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"}`}>
                    <Icon name={s.shift === "Night" ? "moon" : s.shift === "Evening" ? "sunset" : "sunrise"} size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.shift} <span className="font-normal text-slate-400">· {s.time}</span></p>
                    <p className="text-xs text-slate-400">{s.guard}</p>
                  </div>
                </div>
                {s.current && <Badge tone="brand">Now</Badge>}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent gate actions */}
        <Card>
          <CardHeader title="My recent actions" icon="history" />
          <div className="divide-y divide-slate-100">
            {recentGateActions.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <Icon name={a.icon} size={15} />
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
    </div>
  );
}
