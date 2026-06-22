"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  Badge,
  EmptyState,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { guardTicketTemplates, CATEGORIES, PRIORITIES } from "@/lib/helpdesk-data";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const catMeta = (v) => CATEGORIES.find((c) => c.value === v) ?? { label: v, icon: "circle-help" };

export default function GuardTickets() {
  const toast = useToast();
  // Backend returns only this guard's own tickets (they also surface to admin).
  const { data: raw, reload } = useApi("/guard/tickets", { page_size: 300 });
  const rows = normalizeList(raw);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(null);
  const [saving, setSaving] = useState(false);

  const start = (tpl) => {
    setPreset(tpl);
    setOpen(true);
  };

  const create = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const { data } = await api.post("/guard/tickets", {
        subject: f.get("subject") || preset?.label || "Security request",
        description: f.get("description") || "",
        category: f.get("category"),
        priority: f.get("priority") || "high",
        location: f.get("location") || "Main Gate",
      });
      setOpen(false);
      setPreset(null);
      toast(`${data.code} raised to the helpdesk`);
      reload();
    } catch (err) {
      toast(err.message || "Could not raise ticket", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Security" }, { label: "Service Requests" }]} />
      <PageHeader
        title="Service Requests"
        subtitle="Raise facility & security tickets to the management helpdesk"
        actions={<Button icon="plus" onClick={() => { setPreset(null); setOpen(true); }}>New ticket</Button>}
      />

      {/* Quick templates */}
      <Card className="mb-6">
        <CardHeader title="Quick raise" subtitle="Common gate & facility issues" icon="zap" />
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4">
          {guardTicketTemplates.map((t) => (
            <button
              key={t.label}
              onClick={() => start(t)}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-brand-300 hover:shadow-sm"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-100">
                <Icon name={t.icon} size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{t.label}</p>
                <p className="text-xs text-slate-400 capitalize">{t.priority} priority</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* My raised tickets */}
      <Card>
        <CardHeader title="My raised tickets" subtitle="Status updates from the management team" icon="ticket" />
        {rows.length === 0 ? (
          <EmptyState icon="ticket" title="No tickets raised" subtitle="Use a quick template above to raise one." />
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((t) => {
              const cm = catMeta(t.category);
              return (
                <div key={t.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon name={cm.icon} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-800">{t.subject}</p>
                      <StatusBadge status={t.status} />
                      <StatusBadge status={t.priority} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t.id} · {t.location} · {t.assignee ? `Assigned to ${t.assignee}` : "Awaiting assignment"}
                    </p>
                  </div>
                  <Badge tone={t.slaState === "breached" ? "rose" : t.slaState === "due_soon" ? "amber" : "slate"}>
                    <Icon name="clock" size={11} /> {t.slaRemaining}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setPreset(null); }}
        title={preset ? `Raise: ${preset.label}` : "Raise a Service Request"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpen(false); setPreset(null); }}>Cancel</Button>
            <Button type="submit" form="guard-ticket" icon="send" loading={saving}>Raise ticket</Button>
          </>
        }
      >
        <form id="guard-ticket" onSubmit={create} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Subject">
              <input name="subject" required defaultValue={preset?.label ?? ""} className={inputClass} placeholder="e.g. Boom barrier not working" />
            </Field>
          </div>
          <Field label="Category">
            <select name="category" className={inputClass} defaultValue={preset?.category ?? "security"}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" className={inputClass} defaultValue={preset?.priority ?? "high"}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Location">
              <input name="location" className={inputClass} placeholder="e.g. Main Gate, Parking L2" defaultValue="Main Gate" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea name="description" rows={3} required className={inputClass} placeholder="What happened? Any immediate action taken?" />
            </Field>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 sm:col-span-2">
            <Icon name="info" size={14} />
            Critical & high-priority tickets are auto-escalated to the Security Manager.
          </div>
        </form>
      </Modal>
    </div>
  );
}
