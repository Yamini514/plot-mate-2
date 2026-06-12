"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  StatCard,
  Card,
  Button,
  StatusBadge,
  EmptyState,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { myTickets as seed, CATEGORIES, PRIORITIES } from "@/lib/helpdesk-data";

const catMeta = (v) => CATEGORIES.find((c) => c.value === v) ?? { label: v, icon: "circle-help" };

export default function MemberHelpdesk() {
  const toast = useToast();
  const [rows, setRows] = useState(seed);
  const [open, setOpen] = useState(false);
  const [verify, setVerify] = useState(null); // ticket to accept/reject
  const [rating, setRating] = useState(0);

  const create = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const cat = f.get("category");
    const newRow = {
      id: `TKT-${4822 + rows.length}`,
      subject: f.get("subject") || "New request",
      description: f.get("description") || "",
      category: cat,
      priority: f.get("priority") || "medium",
      status: "created",
      location: f.get("location") || "—",
      createdBy: "Naveen Varma (Owner)",
      assignee: null,
      created: "Just now",
      slaRemaining: "On track",
      slaState: "ok",
      reopenCount: 0,
      rating: null,
    };
    setRows((rs) => [newRow, ...rs]);
    setOpen(false);
    toast(`${newRow.id} created — routed to ${catMeta(cat).team}`);
  };

  const accept = () => {
    setRows((rs) => rs.map((r) => (r.id === verify.id ? { ...r, status: "closed", rating } : r)));
    toast(`Resolution accepted · thanks for the ${rating}★ rating`);
    setVerify(null);
    setRating(0);
  };

  const reopen = () => {
    setRows((rs) => rs.map((r) => (r.id === verify.id ? { ...r, status: "reopened", reopenCount: r.reopenCount + 1 } : r)));
    toast(`${verify.id} reopened — sent back to the team`, "info");
    setVerify(null);
    setRating(0);
  };

  const openCount = rows.filter((t) => !["closed", "cancelled"].includes(t.status)).length;
  const resolvedCount = rows.filter((t) => t.status === "resolved").length;

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/member" }, { label: "Me" }, { label: "Service Requests" }]} />
      <PageHeader
        title="Service Requests"
        subtitle="Raise and track maintenance & community requests for your home"
        actions={<Button icon="plus" onClick={() => setOpen(true)}>New request</Button>}
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Open requests" value={openCount} icon="ticket" tone="sky" />
        <StatCard label="Awaiting my review" value={resolvedCount} icon="badge-check" tone="amber" />
        <StatCard label="Total raised" value={rows.length} icon="list-checks" tone="brand" />
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <Card><EmptyState icon="ticket" title="No requests yet" subtitle="Raise your first service request." /></Card>
        ) : (
          rows.map((t) => {
            const cm = catMeta(t.category);
            return (
              <Card key={t.id} className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name={cm.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{t.subject}</p>
                      <StatusBadge status={t.status} />
                      <StatusBadge status={t.priority} />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{t.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t.id} · {cm.label} · {t.assignee ? `Assigned to ${t.assignee}` : "Awaiting assignment"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {t.rating && <span className="text-xs text-amber-500">{"★".repeat(t.rating)}</span>}
                    {t.status === "resolved" && (
                      <Button size="sm" onClick={() => { setVerify(t); setRating(5); }}>Verify</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a Service Request"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-ticket" icon="send">Submit request</Button>
          </>
        }
      >
        <form id="create-ticket" onSubmit={create} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Subject">
              <input name="subject" required className={inputClass} placeholder="e.g. Kitchen tap leaking" />
            </Field>
          </div>
          <Field label="Category">
            <select name="category" className={inputClass} defaultValue="plumbing">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" className={inputClass} defaultValue="medium">
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Location">
              <input name="location" className={inputClass} placeholder="e.g. P-047 · Kitchen" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea name="description" rows={3} required className={inputClass} placeholder="Describe the issue in detail…" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Attachments</span>
            <div className="grid place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-5 text-slate-400">
              <Icon name="paperclip" size={22} />
              <p className="mt-1.5 text-xs">Click to attach photos (optional)</p>
            </div>
          </div>
        </form>
      </Modal>

      {/* Verify resolution modal */}
      <Modal
        open={!!verify}
        onClose={() => { setVerify(null); setRating(0); }}
        title="Verify Resolution"
        footer={
          <>
            <Button variant="secondary" icon="rotate-ccw" onClick={reopen}>Reject &amp; reopen</Button>
            <Button icon="check" onClick={accept}>Accept resolution</Button>
          </>
        }
      >
        {verify && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">{verify.subject}</p>
              <p className="mt-0.5 text-xs text-slate-400">{verify.id} · resolved by {verify.assignee}</p>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Rate the service</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="text-2xl leading-none">
                    <span className={n <= rating ? "text-amber-400" : "text-slate-200"}>★</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Feedback (optional)">
              <textarea rows={2} className={inputClass} placeholder="How was the resolution?" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
