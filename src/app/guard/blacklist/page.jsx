"use client";

import { useMemo, useState } from "react";
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
  EmptyState,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

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
  const communityNotices = []; // community notices (no backend feed yet)
  const { data: raw, reload, loading, error } = useApi("/guard/blacklist", { page_size: 300 });
  // Emergency alerts are the live open high/critical incidents at the gate —
  // the same feed the dashboard banner and admin alerts derive from.
  const { data: rawInc } = useApi("/guard/incidents", { page_size: 300 });
  const [acked, setAcked] = useState({}); // locally acknowledged alert ids

  const alerts = useMemo(() => {
    const open = normalizeList(rawInc).filter(
      (i) => ["high", "critical"].includes(i.severity) &&
        ["open", "investigating", "escalated"].includes(i.status),
    );
    return open
      .map((i) => ({
        id: i.dbId ?? i.id,
        level: i.severity === "critical" ? "high" : "medium",
        title: i.incidentType ?? i.type ?? "Security incident",
        body: i.location ?? "Review the incident log for details.",
        time: i.occurredAt || i.createdAt,
        status: acked[i.dbId ?? i.id] ? "acknowledged" : "open",
      }))
      .sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
  }, [rawInc, acked]);

  const all = normalizeList(raw);
  const visitorRows = all.filter((b) => b.kind === "visitor");
  const vehicleRows = all.filter((b) => b.kind === "vehicle");
  const currentRows = tab === "visitors" ? visitorRows : vehicleRows;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const acknowledge = (id, title) => {
    setAcked((m) => ({ ...m, [id]: true }));
    toast(`Acknowledged: ${title}`);
  };

  const addToBlacklist = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const subject = (f.get("subject") || "").toString().trim();
    const reason = (f.get("reason") || "").toString().trim();

    // Validate before hitting the API so the guard gets a clear, specific
    // message instead of a row of blanks being silently saved.
    if (!subject) {
      toast(tab === "visitors" ? "Enter the visitor's name." : "Enter the vehicle number.", "error");
      return;
    }
    if (tab === "vehicles" && !/^[A-Za-z0-9 -]{4,15}$/.test(subject)) {
      toast("Enter a valid vehicle number (e.g. TS 07 QR 9981).", "error");
      return;
    }
    if (!reason) {
      toast("Add a reason so other guards know why this entry is blocked.", "error");
      return;
    }

    setSaving(true);
    try {
      if (tab === "visitors") {
        await api.post("/guard/blacklist", { kind: "visitor", name: subject, phone: (f.get("phone") || "").toString().trim() || "—", reason });
        toast(`${subject} added to the visitor blacklist`);
      } else {
        await api.post("/guard/blacklist", { kind: "vehicle", plate: subject.toUpperCase(), model: (f.get("phone") || "").toString().trim() || "Unknown vehicle", reason });
        toast(`${subject.toUpperCase()} added to the vehicle blacklist`);
      }
      setOpen(false);
      reload();
    } catch (err) {
      toast(err.message || "Could not add to the blacklist. Please try again.", "error");
    } finally {
      setSaving(false);
    }
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
      {alerts.length > 0 && (
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
                <span className="whitespace-nowrap text-xs text-slate-400">{a.time ? formatDate(a.time) : ""}</span>
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
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Blacklist table */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Blacklist"
            subtitle="Entries automatically blocked at the gate"
            icon="ban"
            action={<Segmented options={TABS} value={tab} onChange={setTab} />}
          />
          {loading && all.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-slate-400">
              <Icon name="loader-circle" size={16} className="animate-spin" /> Loading blacklist…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-500">
                <Icon name="triangle-alert" size={22} />
              </span>
              <p className="text-sm font-medium text-slate-700">Couldn&apos;t load the blacklist</p>
              <p className="max-w-xs text-xs text-slate-400">{error.message || "The security service is unreachable. Check your connection and try again."}</p>
              <Button size="sm" variant="secondary" icon="refresh-cw" onClick={reload}>Retry</Button>
            </div>
          ) : currentRows.length === 0 ? (
            tab === "visitors" ? (
              <EmptyState icon="user-check" title="No blacklisted visitors" subtitle="Persons you block at the gate appear here and are flagged on arrival." />
            ) : (
              <EmptyState icon="car" title="No blacklisted vehicles" subtitle="Number plates you block at the gate appear here and are flagged on arrival." />
            )
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{tab === "visitors" ? "Name" : "Plate"}</Th>
                  <Th>{tab === "visitors" ? "Phone" : "Vehicle"}</Th>
                  <Th>Reason</Th>
                  <Th>Attempts</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((b) => (
                  <Tr key={b.id}>
                    {tab === "visitors" ? (
                      <>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={b.name} size={32} className="bg-rose-100 text-rose-700" />
                            <div>
                              <p className="font-medium text-slate-800">{b.name}</p>
                              <p className="text-xs text-slate-400">Added {b.addedOn ? formatDate(b.addedOn) : "—"}{b.addedBy ? ` · ${b.addedBy}` : ""}</p>
                            </div>
                          </div>
                        </Td>
                        <Td className="text-slate-500">{b.phone}</Td>
                      </>
                    ) : (
                      <>
                        <Td>
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{b.plate}</span>
                          <p className="mt-1 text-xs text-slate-400">Added {b.addedOn ? formatDate(b.addedOn) : "—"}</p>
                        </Td>
                        <Td className="text-slate-600">{b.model}</Td>
                      </>
                    )}
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
            {communityNotices.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No notices right now.</p>
            )}
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
            <Button type="submit" form="add-blacklist" variant="danger" icon="ban" loading={saving}>Add to Blacklist</Button>
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
