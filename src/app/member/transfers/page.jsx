"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Badge, Modal, Field, inputClass, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadDocument } from "@/lib/upload";
import { formatDate } from "@/lib/utils";
import { text as vtext, email as vemail, phone as vphone, collect, hasErrors } from "@/lib/validate";

const STATUS_TONE = { under_review: "amber", initiated: "amber", approved: "green", completed: "green", rejected: "rose", cancelled: "slate" };
const EMPTY = { plotId: "", toOwnerName: "", toEmail: "", toPhone: "", reason: "sale" };

export default function MemberTransfersPage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/member/transfers");
  const transfers = normalizeList(raw);
  const { data: plotsRaw } = useApi("/member/plots");
  const myPlots = normalizeList(plotsRaw);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploadFor, setUploadFor] = useState(null);

  const submit = async () => {
    const errs = collect({
      plotId: form.plotId ? "" : "Select your plot",
      toOwnerName: vtext(form.toOwnerName, { min: 2, max: 120, label: "New owner" }),
      toEmail: vemail(form.toEmail, { required: false }),
      toPhone: vphone(form.toPhone, { required: false }),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try {
      await api.post("/member/transfers/initiate", {
        plotId: Number(form.plotId), toOwnerName: form.toOwnerName.trim(),
        toEmail: form.toEmail.trim() || null, toPhone: form.toPhone.trim() || null, reason: form.reason,
      });
      toast("Transfer request submitted for review");
      setForm(EMPTY); setOpen(false); reload();
    } catch (e) { toast(e.message || "Could not submit", "error"); }
    finally { setBusy(false); }
  };

  const attach = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadDocument(file);
      await api.post(`/member/transfers/${uploadFor.dbId}/documents`, { name: file.name, url, docType: "supporting" });
      toast("Document added");
      setUploadFor(null); reload();
    } catch (e) { toast(e.message || "Could not upload", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ownership Transfer"
        subtitle="Request to transfer your plot to a new owner"
        actions={<Button icon="arrow-left-right" onClick={() => { setForm(EMPTY); setErrors({}); setOpen(true); }} disabled={myPlots.length === 0}>Request transfer</Button>}
      />

      {transfers.length === 0 ? (
        <Card><EmptyState icon="arrow-left-right" title="No transfers" subtitle="Your transfer requests and their status appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => (
            <Card key={t.dbId} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">Plot {t.plotNo} → {t.toOwnerName}</p>
                  <p className="text-xs text-slate-400">{t.code} · {formatDate(t.createdAt)} · {t.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[t.status] ?? "slate"}>{(t.status || "").replace(/_/g, " ")}</Badge>
                  {["under_review", "initiated"].includes(t.status) && (
                    <Button size="sm" variant="secondary" icon="upload" onClick={() => setUploadFor(t)}>Add doc</Button>
                  )}
                </div>
              </div>
              {Array.isArray(t.docs) && t.docs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.docs.map((d, i) => (
                    <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"><Icon name="file" size={12} /> {d.name}</a>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Request ownership transfer"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button icon="send" loading={busy} onClick={submit}>Submit for review</Button></>}>
        <div className="space-y-3">
          <Field label="Your plot" required error={errors.plotId}>
            <select className={inputClass} value={form.plotId} onChange={(e) => setForm({ ...form, plotId: e.target.value })}>
              <option value="">Select a plot</option>
              {myPlots.map((p) => <option key={p.dbId} value={p.dbId}>{p.plotNo}</option>)}
            </select>
          </Field>
          <Field label="New owner name" required error={errors.toOwnerName}>
            <input className={inputClass} value={form.toOwnerName} onChange={(e) => setForm({ ...form, toOwnerName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New owner email" error={errors.toEmail}><input className={inputClass} value={form.toEmail} onChange={(e) => setForm({ ...form, toEmail: e.target.value })} /></Field>
            <Field label="New owner phone" error={errors.toPhone}><input className={inputClass} maxLength={10} value={form.toPhone} onChange={(e) => setForm({ ...form, toPhone: e.target.value.replace(/\D/g, "") })} /></Field>
          </div>
          <Field label="Reason">
            <select className={inputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
              {["sale", "gift", "inheritance", "other"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <p className="text-xs text-slate-400">After submitting, add the sale deed / NOC via &quot;Add doc&quot;. The association reviews and approves the transfer.</p>
        </div>
      </Modal>

      <Modal open={!!uploadFor} onClose={() => setUploadFor(null)} title="Add supporting document"
        footer={<Button variant="secondary" onClick={() => setUploadFor(null)}>Close</Button>}>
        <Field label="Sale deed / NOC / supporting document">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={(e) => attach(e.target.files?.[0])} />
        </Field>
      </Modal>
    </div>
  );
}
