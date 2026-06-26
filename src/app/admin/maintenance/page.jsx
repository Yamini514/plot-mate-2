"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, Td, Tr, Modal, Field, inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { MaintenanceCalendar } from "./MaintenanceCalendar";

const DUE_TONE = { overdue: "rose", due_soon: "amber", ok: "green", inactive: "slate", unscheduled: "slate" };
const FREQS = ["weekly", "monthly", "quarterly", "half_yearly", "yearly"];
const emptyForm = { title: "", category: "", area: "", frequency: "monthly", nextDueOn: "", notes: "" };
const emptyLog = { performedOn: "", outcome: "ok", report: "" };

export default function MaintenancePage() {
  const toast = useToast();
  const [filter, setFilter] = useState("active");
  const [view, setView] = useState("list");
  const { data: raw, meta, reload, loading } = useApi("/admin/maintenance", { status: filter });
  const schedules = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [logFor, setLogFor] = useState(null); // schedule pending a completion log
  const [log, setLog] = useState(emptyLog);
  const [busyId, setBusyId] = useState(null);

  const createSchedule = async () => {
    if (!form.title.trim()) return toast("A title is required", "error");
    setSaving(true);
    try {
      await api.post("/admin/maintenance", {
        title: form.title.trim(),
        category: form.category.trim() || null,
        area: form.area.trim() || null,
        frequency: form.frequency,
        nextDueOn: form.nextDueOn || null,
        notes: form.notes.trim() || null,
      });
      toast("Schedule created");
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not create schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  const submitLog = async () => {
    setBusyId(logFor.dbId);
    try {
      await api.post(`/admin/maintenance/${logFor.dbId}/log`, {
        performedOn: log.performedOn || null,
        outcome: log.outcome,
        report: log.report.trim() || null,
      });
      toast(log.outcome === "issue_found" ? "Logged — a ticket was raised for the issue" : "Inspection logged");
      setLogFor(null);
      setLog(emptyLog);
      reload();
    } catch (e) {
      toast(e.message || "Could not log inspection", "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggle = async (s) => {
    setBusyId(s.dbId);
    try {
      await api.post(`/admin/maintenance/${s.dbId}/toggle`, {});
      reload();
    } catch (e) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Preventive maintenance"
        subtitle="Recurring inspections — schedule, perform, and keep a completion record"
        actions={
          <div className="flex items-center gap-2">
            <Segmented value={view} onChange={setView} options={[{ value: "list", label: "List" }, { value: "calendar", label: "Calendar" }]} />
            <Button icon="plus" onClick={() => setOpen(true)}>New schedule</Button>
          </div>
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          {(counts.overdue > 0 || counts.due_soon > 0) && (
            <div className="mt-3 flex gap-2 text-xs">
              {counts.overdue > 0 && <Badge tone="rose">{counts.overdue} overdue</Badge>}
              {counts.due_soon > 0 && <Badge tone="amber">{counts.due_soon} due soon</Badge>}
            </div>
          )}
        </div>
        {view === "calendar" ? (
          <MaintenanceCalendar schedules={schedules} />
        ) : (
        <Table>
          <thead>
            <tr>
              <Th>Schedule</Th>
              <Th>Area</Th>
              <Th>Frequency</Th>
              <Th>Next due</Th>
              <Th>Last done</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <Tr key={s.dbId}>
                <Td>
                  <span className="font-medium text-slate-800">{s.title}</span>
                  {s.category && <span className="block text-xs text-slate-400">{s.category}</span>}
                </Td>
                <Td className="text-slate-600">{s.area || "—"}</Td>
                <Td className="text-slate-500">{s.frequency?.replace("_", " ")}</Td>
                <Td>
                  <Badge tone={DUE_TONE[s.dueState] ?? "slate"}>
                    {s.nextDueOn ? formatDate(s.nextDueOn) : "—"}
                  </Badge>
                </Td>
                <Td className="text-slate-500">{s.lastDoneOn ? formatDate(s.lastDoneOn) : "—"}</Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    <Button icon="clipboard-check" onClick={() => { setLogFor(s); setLog(emptyLog); }}>Log</Button>
                    <Button variant="secondary" icon={s.active ? "pause" : "play"} loading={busyId === s.dbId} onClick={() => toggle(s)}>
                      {s.active ? "Pause" : "Resume"}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {schedules.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading schedules…</>
                  ) : "No maintenance schedules yet."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
        )}
      </Card>

      {/* Create schedule */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New maintenance schedule"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="check" loading={saving} onClick={createSchedule}>Create</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lift inspection" /></Field></div>
          <Field label="Category"><input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="electrical / plumbing…" /></Field>
          <Field label="Area"><input className={inputClass} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Block A clubhouse" /></Field>
          <Field label="Frequency"><select className={inputClass} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>{FREQS.map((f) => <option key={f} value={f}>{f.replace("_", " ")}</option>)}</select></Field>
          <Field label="First due date" hint="Defaults to one cycle from today"><input type="date" className={inputClass} value={form.nextDueOn} onChange={(e) => setForm({ ...form, nextDueOn: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
        </div>
      </Modal>

      {/* Log a completion */}
      <Modal
        open={!!logFor}
        onClose={() => setLogFor(null)}
        title={`Log inspection · ${logFor?.title ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLogFor(null)}>Cancel</Button>
            <Button icon="check" loading={busyId === logFor?.dbId} onClick={submitLog}>Save log</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Performed on" hint="Defaults to today"><input type="date" className={inputClass} value={log.performedOn} onChange={(e) => setLog({ ...log, performedOn: e.target.value })} /></Field>
          <Field label="Outcome">
            <select className={inputClass} value={log.outcome} onChange={(e) => setLog({ ...log, outcome: e.target.value })}>
              <option value="ok">All OK</option>
              <option value="issue_found">Issue found</option>
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Report"><textarea className={inputClass} rows={3} value={log.report} onChange={(e) => setLog({ ...log, report: e.target.value })} placeholder="What was checked / found" /></Field></div>
        </div>
        {log.outcome === "issue_found" && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
            <Icon name="triangle-alert" size={14} /> A high-priority helpdesk ticket will be raised automatically.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">Saving advances the next due date by one cycle.</p>
      </Modal>
    </div>
  );
}
