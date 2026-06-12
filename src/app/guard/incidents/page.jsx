"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  Button,
  StatCard,
  StatusBadge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { incidents as seed, incidentTypes } from "@/lib/guard-data";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
];

const SEVERITIES = ["low", "medium", "high", "critical"];

export default function IncidentReporting() {
  const toast = useToast();
  const [rows, setRows] = useState(seed);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState("medium");

  // Open the log-incident modal automatically when linked from a quick action.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open modal on arrival from a quick action
    if (params.get("new") === "1") setOpen(true);
  }, []);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const openCount = rows.filter((r) => ["open", "investigating", "escalated"].includes(r.status)).length;
  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const log = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newRow = {
      id: `INC-${3093 + rows.length}`,
      type: f.get("type") || "Other",
      location: f.get("location") || "—",
      severity,
      reportedBy: "Rajappa Gowda",
      time: "Today · Just now",
      status: "open",
    };
    setRows((rs) => [newRow, ...rs]);
    setOpen(false);
    setSeverity("medium");
    toast(`Incident ${newRow.id} logged`);
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Security" }, { label: "Incidents" }]} />
      <PageHeader
        title="Incident Reporting"
        subtitle="Log and track security incidents at the community"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast("Incident report exported")}>
              Export
            </Button>
            <Button icon="shield-alert" onClick={() => setOpen(true)}>
              Log Incident
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Open incidents" value={openCount} icon="shield-alert" tone="rose" />
        <StatCard label="Logged today" value={rows.filter((r) => r.time.startsWith("Today")).length} icon="file-plus" tone="amber" />
        <StatCard label="Critical / High" value={rows.filter((r) => r.severity === "critical" || r.severity === "high").length} icon="siren" tone="rose" />
        <StatCard label="Resolved" value={counts.resolved ?? 0} icon="circle-check-big" tone="brand" />
      </div>

      <Card className="mb-4 p-3">
        <Segmented options={FILTERS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))} value={filter} onChange={setFilter} />
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="shield-check" title="No incidents" subtitle="Nothing matches this filter — all clear." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Incident ID</Th>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th>Severity</Th>
                <Th>Reported by</Th>
                <Th>Time</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-800">{i.id}</Td>
                  <Td className="text-slate-700">{i.type}</Td>
                  <Td className="text-slate-500">{i.location}</Td>
                  <Td><StatusBadge status={i.severity} /></Td>
                  <Td className="text-slate-500">{i.reportedBy}</Td>
                  <Td className="text-slate-500">{i.time}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                  <Td className="text-right">
                    <button onClick={() => toast(`Viewing ${i.id}`, "info")} className="text-xs font-medium text-brand-600 hover:underline">
                      View
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Log incident modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log Security Incident"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="log-incident" variant="danger" icon="shield-alert">Submit Report</Button>
          </>
        }
      >
        <form id="log-incident" onSubmit={log} className="space-y-4">
          <Field label="Incident type">
            <select name="type" className={inputClass} defaultValue={incidentTypes[0]}>
              {incidentTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <input name="location" required className={inputClass} placeholder="e.g. Main Gate, Block B Driveway" />
          </Field>
          <Field label="Description">
            <textarea name="description" rows={3} required className={inputClass} placeholder="Describe what happened, who was involved, and any action taken…" />
          </Field>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Severity</span>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITIES.map((s) => {
                const active = severity === s;
                const colors = {
                  low: "border-slate-300 bg-slate-50 text-slate-600",
                  medium: "border-amber-300 bg-amber-50 text-amber-700",
                  high: "border-orange-300 bg-orange-50 text-orange-700",
                  critical: "border-rose-300 bg-rose-50 text-rose-700",
                };
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className={`rounded-lg border py-2 text-xs font-semibold capitalize transition-all ${active ? colors[s] + " ring-2 ring-offset-1" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Photo evidence</span>
            <div className="grid place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-slate-400">
              <Icon name="camera" size={28} />
              <p className="mt-2 text-xs">Click to upload or drag a photo here</p>
              <p className="text-[10px] text-slate-400">PNG, JPG up to 10MB</p>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
