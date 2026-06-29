"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Modal, Drawer, Field, inputClass, StatusBadge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { text as vtext, presence, collect, hasErrors } from "@/lib/validate";

export default function VendorSupportPage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/vendor/support");
  const tickets = normalizeList(raw);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "medium" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/vendor/support/${openId}` : null);
  const [reply, setReply] = useState("");

  const submit = async () => {
    const errs = collect({ subject: vtext(form.subject, { min: 3, max: 160, label: "Subject" }), description: presence(form.description, "Description") });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try { await api.post("/vendor/support", form); toast("Support ticket raised"); setForm({ subject: "", description: "", priority: "medium" }); setOpen(false); reload(); }
    catch (e) { toast(e.message || "Could not raise", "error"); }
    finally { setBusy(false); }
  };

  const sendReply = async () => {
    if (!reply.trim()) return toast("Write a reply", "error");
    setBusy(true);
    try { await api.post(`/vendor/support/${openId}/reply`, { body: reply.trim() }); setReply(""); reloadDetail(); }
    catch (e) { toast(e.message || "Could not reply", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Support" subtitle="Raise a support request with the association"
        actions={<Button icon="plus" onClick={() => { setForm({ subject: "", description: "", priority: "medium" }); setErrors({}); setOpen(true); }}>New ticket</Button>} />

      {tickets.length === 0 ? (
        <Card><EmptyState icon="life-buoy" title="No support tickets" subtitle="Raise a ticket and the association will respond." /></Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.dbId} className="cursor-pointer p-4 transition-colors hover:border-brand-200" onClick={() => setOpenId(t.dbId)}>
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-medium text-slate-800">{t.subject}</p><p className="text-xs text-slate-400">{t.code} · {formatDate(t.created)}</p></div>
                <StatusBadge status={t.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Raise a support ticket"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button icon="send" loading={busy} onClick={submit}>Submit</Button></>}>
        <div className="space-y-3">
          <Field label="Subject" required error={errors.subject}><input className={inputClass} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
          <Field label="Priority"><select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["low", "medium", "high"].map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
          <Field label="Description" required error={errors.description}><textarea rows={4} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
      </Modal>

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.subject || "Ticket"} subtitle={detail?.code}>
        {!detail ? (
          <div className="py-10 text-center text-slate-400"><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex gap-2"><StatusBadge status={detail.status} /><StatusBadge status={detail.priority} /></div>
            <p className="text-sm text-slate-700">{detail.description}</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Conversation</p>
              {(detail.events?.length ?? 0) === 0 ? <p className="text-xs text-slate-400">No replies yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {detail.events.map((e) => (
                    <li key={e.id} className="rounded-lg bg-slate-50 p-2"><p className="text-slate-700">{e.body}</p><p className="text-xs text-slate-400">{e.actorName || "system"} · {formatDate(e.createdAt)}</p></li>
                  ))}
                </ul>
              )}
              {!["closed", "cancelled"].includes(detail.status) && (
                <div className="mt-2 flex items-end gap-2">
                  <Field label="Reply"><input className={inputClass} value={reply} onChange={(e) => setReply(e.target.value)} /></Field>
                  <Button size="sm" variant="secondary" icon="send" loading={busy} onClick={sendReply}>Send</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
