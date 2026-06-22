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
import { CATEGORIES, PRIORITIES } from "@/lib/helpdesk-data";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const catMeta = (v) => CATEGORIES.find((c) => c.value === v) ?? { label: v, icon: "circle-help" };

export default function MemberHelpdesk() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/member/helpdesk");
  const rows = normalizeList(raw); // backend returns this member's own
  const [open, setOpen] = useState(false);
  const [verify, setVerify] = useState(null); // ticket to accept/reject
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [reopening, setReopening] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const cat = f.get("category");
    setSaving(true);
    try {
      const { data } = await api.post("/member/helpdesk", {
        subject: f.get("subject") || "New request",
        description: f.get("description") || "",
        category: cat,
        priority: f.get("priority") || "medium",
        location: f.get("location") || "—",
      });
      setOpen(false);
      toast(`${data.code} created — routed to ${catMeta(cat).team}`);
      reload();
    } catch (err) {
      toast(err.message || "Could not create request", "error");
    } finally {
      setSaving(false);
    }
  };

  const accept = async () => {
    setAccepting(true);
    try {
      await api.post(`/member/helpdesk/${verify.dbId}/verify`, { action: "accept", rating });
      toast(`Resolution accepted · thanks for the ${rating}★ rating`);
      setVerify(null);
      setRating(0);
      reload();
    } catch (e) {
      toast(e.message || "Could not accept", "error");
    } finally {
      setAccepting(false);
    }
  };

  const reopen = async () => {
    setReopening(true);
    try {
      await api.post(`/member/helpdesk/${verify.dbId}/verify`, { action: "reopen" });
      toast(`${verify.id} reopened — sent back to the team`, "info");
      setVerify(null);
      setRating(0);
      reload();
    } catch (e) {
      toast(e.message || "Could not reopen", "error");
    } finally {
      setReopening(false);
    }
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
            <Button type="submit" form="create-ticket" icon="send" loading={saving}>Submit request</Button>
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
            <Button variant="secondary" icon="rotate-ccw" loading={reopening} onClick={reopen}>Reject &amp; reopen</Button>
            <Button icon="check" loading={accepting} onClick={accept}>Accept resolution</Button>
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
