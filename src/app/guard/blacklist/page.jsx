"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  Avatar,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import {
  blacklistedVisitors,
  blacklistedVehicles,
  emergencyAlerts,
  communityNotices,
} from "@/lib/guard-data";

const TABS = [
  { value: "visitors", label: "Visitors" },
  { value: "vehicles", label: "Vehicles" },
];

const alertTone = {
  high: { ring: "border-rose-200 bg-rose-50", icon: "bg-rose-100 text-rose-600", name: "siren" },
  medium: { ring: "border-amber-200 bg-amber-50", icon: "bg-amber-100 text-amber-600", name: "triangle-alert" },
  low: { ring: "border-sky-200 bg-sky-50", icon: "bg-sky-100 text-sky-600", name: "info" },
};

export default function BlacklistAlerts() {
  const toast = useToast();
  const [tab, setTab] = useState("visitors");
  const [alerts, setAlerts] = useState(emergencyAlerts);
  const [visitorRows, setVisitorRows] = useState(blacklistedVisitors);
  const [vehicleRows, setVehicleRows] = useState(blacklistedVehicles);
  const [open, setOpen] = useState(false);

  const acknowledge = (id, title) => {
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a)));
    toast(`Acknowledged: ${title}`);
  };

  const addToBlacklist = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const reason = f.get("reason") || "Flagged at gate";
    if (tab === "visitors") {
      setVisitorRows((rs) => [
        { id: `BL-V-${22 + rs.length}`, name: f.get("subject") || "Unknown visitor", phone: f.get("phone") || "—", reason, addedBy: "Security", addedOn: "12 Jun 2026", attempts: 0, status: "blacklisted" },
        ...rs,
      ]);
      toast("Visitor added to blacklist");
    } else {
      setVehicleRows((rs) => [
        { id: `BL-C-${15 + rs.length}`, plate: f.get("subject") || "—", model: f.get("phone") || "Unknown vehicle", reason, addedOn: "12 Jun 2026", attempts: 0, status: "blacklisted" },
        ...rs,
      ]);
      toast("Vehicle added to blacklist");
    }
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Security" }, { label: "Blacklist & Alerts" }]} />
      <PageHeader
        title="Blacklist & Alerts"
        subtitle="Blocked entries, emergency alerts and community notices"
        actions={<Button icon="ban" variant="danger" onClick={() => setOpen(true)}>Add to Blacklist</Button>}
      />

      {/* Emergency alerts */}
      <div className="mb-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Emergency alerts</p>
        {alerts.map((a) => {
          const t = alertTone[a.level];
          return (
            <div key={a.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 ${t.ring}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.icon}`}>
                <Icon name={t.name} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-slate-600">{a.body}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap text-xs text-slate-400">{a.time}</span>
                {a.status === "open" && (
                  <Button size="sm" variant="secondary" onClick={() => acknowledge(a.id, a.title)}>
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Blacklist table */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Blacklist"
            subtitle="Entries automatically blocked at the gate"
            icon="ban"
            action={<Segmented options={TABS} value={tab} onChange={setTab} />}
          />
          {tab === "visitors" ? (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>Reason</Th>
                  <Th>Attempts</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {visitorRows.map((b) => (
                  <Tr key={b.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={b.name} size={32} className="bg-rose-100 text-rose-700" />
                        <div>
                          <p className="font-medium text-slate-800">{b.name}</p>
                          <p className="text-xs text-slate-400">Added {b.addedOn} · {b.addedBy}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-500">{b.phone}</Td>
                    <Td className="max-w-[220px] whitespace-normal text-slate-600">{b.reason}</Td>
                    <Td><span className="font-semibold text-rose-600">{b.attempts}</span></Td>
                    <Td><StatusBadge status={b.status} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Plate</Th>
                  <Th>Vehicle</Th>
                  <Th>Reason</Th>
                  <Th>Attempts</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {vehicleRows.map((b) => (
                  <Tr key={b.id}>
                    <Td>
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{b.plate}</span>
                      <p className="mt-1 text-xs text-slate-400">Added {b.addedOn}</p>
                    </Td>
                    <Td className="text-slate-600">{b.model}</Td>
                    <Td className="max-w-[220px] whitespace-normal text-slate-600">{b.reason}</Td>
                    <Td><span className="font-semibold text-rose-600">{b.attempts}</span></Td>
                    <Td><StatusBadge status={b.status} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Community notices */}
        <Card>
          <CardHeader title="Community notices" icon="megaphone" />
          <div className="divide-y divide-slate-100">
            {communityNotices.map((n) => (
              <div key={n.id} className="px-5 py-4">
                <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                  <Icon name="clock" size={11} /> {n.time}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Add to blacklist modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Add ${tab === "visitors" ? "Visitor" : "Vehicle"} to Blacklist`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="add-blacklist" variant="danger" icon="ban">Add to Blacklist</Button>
          </>
        }
      >
        <form id="add-blacklist" onSubmit={addToBlacklist} className="space-y-4">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Type</span>
            <Segmented options={TABS} value={tab} onChange={setTab} />
          </div>
          {tab === "visitors" ? (
            <>
              <Field label="Visitor name">
                <input name="subject" required className={inputClass} placeholder="e.g. Unknown solicitor" />
              </Field>
              <Field label="Phone number">
                <input name="phone" className={inputClass} placeholder="+91 9XXXX XXXXX" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Vehicle number">
                <input name="subject" required className={inputClass} placeholder="e.g. TS 07 QR 9981" />
              </Field>
              <Field label="Make / model">
                <input name="phone" className={inputClass} placeholder="e.g. White Swift Dzire" />
              </Field>
            </>
          )}
          <Field label="Reason for blacklisting">
            <textarea name="reason" rows={2} required className={inputClass} placeholder="Why is this entry being blocked?" />
          </Field>
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <Icon name="shield-alert" size={14} />
            Blacklisted entries are automatically blocked at every gate.
          </div>
        </form>
      </Modal>
    </div>
  );
}
