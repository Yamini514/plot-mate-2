"use client";

import { useState } from "react";
import { Button, Badge, Modal, Field, inputClass, ConfirmDialog } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { phone as vphone, text as vtext, email as vemail, collect, hasErrors } from "@/lib/validate";

const EMPTY = { name: "", phone: "", email: "", share: "", primary: false };

// Joint-owner roster for a plot: add / remove / set-primary, plus
// deactivate/reactivate of a co-owner's member login.
export function PlotOwnersSection({ plotId }) {
  const toast = useToast();
  const { data: raw, reload } = useApi(plotId ? `/admin/plots/${plotId}/owners` : null);
  const owners = normalizeList(raw);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [removeFor, setRemoveFor] = useState(null);
  const [deactFor, setDeactFor] = useState(null);
  const [reason, setReason] = useState("");

  const run = async (fn, label) => {
    setBusy(true);
    try { await fn(); if (label) toast(label); reload(); }
    catch (e) { toast(e.message || "Action failed", "error"); }
    finally { setBusy(false); }
  };

  const add = async () => {
    const errs = collect({
      name: vtext(form.name, { min: 2, max: 120, label: "Name" }),
      phone: vphone(form.phone),
      email: vemail(form.email, { required: false }),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    await run(() => api.post(`/admin/plots/${plotId}/owners`, form), "Owner added");
    setAddOpen(false); setForm(EMPTY);
  };

  const deactivate = async () => {
    if (reason.trim().length < 3) { toast("Add a reason (min 3 chars)", "error"); return; }
    await run(() => api.post(`/admin/users/${deactFor.userId}/deactivate`, { reason: reason.trim() }), "Login deactivated");
    setDeactFor(null); setReason("");
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Owners</h4>
        <Button size="sm" variant="ghost" icon="user-plus" onClick={() => { setForm(EMPTY); setErrors({}); setAddOpen(true); }}>Add owner</Button>
      </div>
      {owners.length === 0 ? (
        <p className="text-xs text-slate-400">No owners recorded.</p>
      ) : (
        <ul className="space-y-2">
          {owners.map((o) => (
            <li key={o.dbId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {o.name}
                  {o.primaryOwner && <Badge tone="brand">primary</Badge>}
                  {o.share && <span className="text-xs font-normal text-slate-400">{o.share}</span>}
                  {o.loginActive === false && <Badge tone="rose">login off</Badge>}
                </p>
                <p className="text-xs text-slate-400">{o.phone || "no phone"}{o.email ? ` · ${o.email}` : ""}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!o.primaryOwner && (
                  <button title="Make primary" disabled={busy} onClick={() => run(() => api.post(`/admin/plots/${plotId}/owners/${o.dbId}/primary`, {}), `${o.name} is now primary`)}
                    className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"><Icon name="star" size={14} /></button>
                )}
                {o.userId && (
                  o.loginActive ? (
                    <button title="Deactivate login" disabled={busy} onClick={() => { setDeactFor(o); setReason(""); }}
                      className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="user-x" size={14} /></button>
                  ) : (
                    <button title="Reactivate login" disabled={busy} onClick={() => run(() => api.post(`/admin/users/${o.userId}/activate`, {}), "Login reactivated")}
                      className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-brand-50 hover:text-brand-600"><Icon name="user-check" size={14} /></button>
                  )
                )}
                <button title="Remove" disabled={busy} onClick={() => setRemoveFor(o)}
                  className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash-2" size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add owner"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button icon="check" loading={busy} onClick={add}>Add</Button></>}>
        <div className="space-y-3">
          <Field label="Name" required error={errors.name}><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" error={errors.phone}><input className={inputClass} maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} /></Field>
            <Field label="Share" hint="e.g. 50% / joint"><input className={inputClass} value={form.share} onChange={(e) => setForm({ ...form, share: e.target.value })} /></Field>
          </div>
          <Field label="Email" error={errors.email}><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.primary} onChange={(e) => setForm({ ...form, primary: e.target.checked })} /> Make primary owner
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={!!removeFor} onClose={() => setRemoveFor(null)}
        onConfirm={() => run(() => api.del(`/admin/plots/${plotId}/owners/${removeFor.dbId}`), "Owner removed").then(() => setRemoveFor(null))}
        loading={busy} title="Remove owner" confirmLabel="Remove"
        message={`Remove ${removeFor?.name} from this plot?`} />

      <Modal open={!!deactFor} onClose={() => setDeactFor(null)} title={`Deactivate login · ${deactFor?.name ?? ""}`}
        footer={<><Button variant="secondary" onClick={() => setDeactFor(null)}>Cancel</Button>
          <Button variant="danger" icon="user-x" loading={busy} onClick={deactivate}>Deactivate</Button></>}>
        <Field label="Reason" hint="Recorded in the audit trail. The owner is signed out and can't log in until reactivated.">
          <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
