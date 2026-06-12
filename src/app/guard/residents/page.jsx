"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  CardHeader,
  Button,
  StatCard,
  Badge,
  Field,
  inputClass,
  Progress,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { residentActivity, residentVehicleStats } from "@/lib/guard-data";

const activityMeta = {
  entry: { icon: "log-in", tone: "bg-brand-50 text-brand-600", verb: "Vehicle entry" },
  exit: { icon: "log-out", tone: "bg-slate-100 text-slate-500", verb: "Vehicle exit" },
  guest: { icon: "qr-code", tone: "bg-sky-50 text-sky-600", verb: "Guest (QR verified)" },
};

let feedSeq = 0;

export default function ResidentCheckIn() {
  const toast = useToast();
  const [tag, setTag] = useState("");
  const [qr, setQr] = useState("");
  const [feed, setFeed] = useState(residentActivity);
  const [inside, setInside] = useState(residentVehicleStats.insideNow);

  const pct = Math.round((inside / residentVehicleStats.capacity) * 100);

  const logEntry = (type, label, method) => {
    feedSeq += 1;
    setFeed((f) => [
      {
        id: `NEW-${feedSeq}`,
        type,
        name: type === "guest" ? "Verified guest" : "Resident",
        flat: "—",
        vehicle: label || "Unknown",
        time: "Just now",
        method,
      },
      ...f,
    ]);
    if (type === "entry" || type === "guest") setInside((n) => n + 1);
    if (type === "exit") setInside((n) => Math.max(0, n - 1));
  };

  const handleEntry = () => {
    logEntry("entry", tag, "Manual");
    toast(tag ? `Entry logged for ${tag}` : "Entry logged");
    setTag("");
  };

  const handleExit = () => {
    logEntry("exit", tag, "Manual");
    toast(tag ? `Exit logged for ${tag}` : "Exit logged");
    setTag("");
  };

  const handleVerify = () => {
    logEntry("guest", qr, "QR pass");
    toast(qr ? `Pass ${qr} verified — entry granted` : "QR pass verified");
    setQr("");
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Gate" }, { label: "Residents" }]} />
      <PageHeader
        title="Resident Check-In / Check-Out"
        subtitle="Log resident vehicle movement and verify guest QR passes"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Vehicles inside" value={inside} icon="car" tone="violet" hint={`${pct}% of capacity`} />
        <StatCard label="Entries today" value={residentVehicleStats.entriesToday} icon="log-in" tone="brand" />
        <StatCard label="Exits today" value={residentVehicleStats.exitsToday} icon="log-out" tone="slate" />
        <StatCard label="Guest vehicles" value={residentVehicleStats.guestVehicles} icon="users-round" tone="sky" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Action panels */}
        <div className="space-y-4 lg:col-span-1">
          {/* Vehicle entry / exit */}
          <Card>
            <CardHeader title="Resident vehicle" subtitle="Scan RFID tag or enter plate" icon="car" />
            <div className="space-y-3 p-4">
              <Field label="RFID tag / Vehicle number">
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. TS 09 GK 4412"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Button icon="log-in" onClick={handleEntry}>
                  Entry
                </Button>
                <Button variant="secondary" icon="log-out" onClick={handleExit}>
                  Exit
                </Button>
              </div>
            </div>
          </Card>

          {/* QR verification */}
          <Card>
            <CardHeader title="Guest QR verification" subtitle="Manual guest check-in" icon="qr-code" />
            <div className="p-4">
              <div className="mb-3 grid place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-slate-400">
                <Icon name="scan-line" size={36} />
                <p className="mt-2 text-xs">Point scanner at guest QR pass</p>
              </div>
              <Field label="Or enter pass code">
                <input
                  value={qr}
                  onChange={(e) => setQr(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. GAV-8842-XK"
                />
              </Field>
              <Button className="mt-3 w-full" icon="shield-check" onClick={handleVerify}>
                Verify & Allow Entry
              </Button>
            </div>
          </Card>

          {/* Capacity */}
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Parking capacity</p>
              <span className="text-sm font-semibold text-violet-600">{pct}%</span>
            </div>
            <Progress value={pct} tone={pct > 85 ? "rose" : "brand"} />
            <p className="mt-2 text-xs text-slate-400">
              {residentVehicleStats.insideNow} of {residentVehicleStats.capacity} slots occupied
            </p>
          </Card>
        </div>

        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            subtitle="Live gate movement feed"
            icon="activity"
            action={<Badge tone="green"><span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live</Badge>}
          />
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {feed.map((a) => {
              const m = activityMeta[a.type];
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${m.tone}`}>
                    <Icon name={m.icon} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {a.name} <span className="font-normal text-slate-400">· {a.flat}</span>
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {m.verb} · {a.vehicle} · {a.method}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{a.time}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
