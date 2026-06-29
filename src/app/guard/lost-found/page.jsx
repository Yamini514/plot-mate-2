"use client";

import { useState } from "react";
import {
  PageHeader, Breadcrumbs, Card, Button, Badge, Segmented, Modal, Field, inputClass, EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";
import { formatDate } from "@/lib/utils";
import { collect, hasErrors, text as vtext, phone as vphone } from "@/lib/validate";

const TONE = { open: "amber", claimed: "sky", closed: "slate" };

export default function GuardLostFoundPage() {
  const toast = useToast();
  const [status, setStatus] = useState("open");
  const { data: raw, meta, reload } = useApi("/guard/lost-found", { status });
  const items = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", foundLocation: "" });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [claimFor, setClaimFor] = useState(null);
  const [claim, setClaim] = useState({ claimantName: "", claimantPhone: "" });
  const [errors, setErrors] = useState({});

  const add = async () => {
    const errs = collect({ title: vtext(form.title, { min: 2, max: 160, label: "Title" }) });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try { await api.post("/guard/lost-found", { ...form, photoUrl: photo }); toast("Item logged"); setForm({ title: "", description: "", foundLocation: "" }); setPhoto(null); setOpen(false); reload(); }
    catch (e) { toast(e.message || "Could not log", "error"); }
    finally { setBusy(false); }
  };

  const doClaim = async () => {
    const errs = collect({ claimantName: vtext(claim.claimantName, { min: 2, label: "Name" }), claimantPhone: vphone(claim.claimantPhone, { required: true }) });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try { await api.post(`/guard/lost-found/${claimFor.dbId}/claim`, claim); toast("Claim recorded"); setClaimFor(null); setClaim({ claimantName: "", claimantPhone: "" }); reload(); }
    catch (e) { toast(e.message || "Could not claim", "error"); }
    finally { setBusy(false); }
  };

  const close = async (it) => {
    setBusy(true);
    try { await api.post(`/guard/lost-found/${it.dbId}/close`, {}); toast("Closed"); reload(); }
    catch (e) { toast(e.message || "Could not close", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Security" }, { label: "Lost & Found" }]} />
      <PageHeader title="Lost & Found" subtitle="Log found items, record claims, and close them out"
        actions={<Button icon="plus" onClick={() => { setForm({ title: "", description: "", foundLocation: "" }); setPhoto(null); setErrors({}); setOpen(true); }}>Log item</Button>} />

      <Card className="mb-4 p-3">
        <Segmented value={status} onChange={setStatus} options={[
          { value: "open", label: "Open", count: counts.open },
          { value: "claimed", label: "Claimed", count: counts.claimed },
          { value: "closed", label: "Closed", count: counts.closed },
          { value: "all", label: "All", count: counts.all },
        ]} />
      </Card>

      {items.length === 0 ? (
        <Card><EmptyState icon="search" title="Nothing here" subtitle="Found items appear here." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <Card key={it.dbId} className="p-4">
              <div className="flex items-start gap-3">
                {it.photoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={it.photoUrl} alt={it.title} className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                  : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><Icon name="package-search" size={22} /></span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{it.title}</p>
                    <Badge tone={TONE[it.status] ?? "slate"}>{it.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{it.description}</p>
                  <p className="mt-1 text-xs text-slate-400">{it.code} · {it.foundLocation || "—"} · {formatDate(it.createdAt)}</p>
                  {it.claimantName && <p className="mt-1 text-xs text-slate-500">Claimed by {it.claimantName} ({it.claimantPhone})</p>}
                  {it.status !== "closed" && (
                    <div className="mt-2 flex gap-2">
                      {it.status === "open" && <Button size="sm" variant="secondary" icon="hand" onClick={() => { setClaimFor(it); setClaim({ claimantName: "", claimantPhone: "" }); setErrors({}); }}>Claim</Button>}
                      <Button size="sm" variant="ghost" icon="check" loading={busy} onClick={() => close(it)}>Close</Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Log found item"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button icon="check" loading={busy} onClick={add}>Log</Button></>}>
        <div className="space-y-3">
          <Field label="Item" required error={errors.title}><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Black wallet" /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Found location"><input className={inputClass} value={form.foundLocation} onChange={(e) => setForm({ ...form, foundLocation: e.target.value })} placeholder="e.g. Near Gate B" /></Field>
          <Field label="Photo (optional)">
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setPhoto(await uploadImage(f)); } catch (err) { toast(err.message, "error"); } }} />
            {photo && <span className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600"><Icon name="check" size={12} /> photo attached</span>}
          </Field>
        </div>
      </Modal>

      <Modal open={!!claimFor} onClose={() => setClaimFor(null)} title="Record claim"
        footer={<><Button variant="secondary" onClick={() => setClaimFor(null)}>Cancel</Button><Button icon="check" loading={busy} onClick={doClaim}>Record</Button></>}>
        <div className="space-y-3">
          <Field label="Claimant name" required error={errors.claimantName}><input className={inputClass} value={claim.claimantName} onChange={(e) => setClaim({ ...claim, claimantName: e.target.value })} /></Field>
          <Field label="Claimant phone" required error={errors.claimantPhone}><input className={inputClass} maxLength={10} value={claim.claimantPhone} onChange={(e) => setClaim({ ...claim, claimantPhone: e.target.value.replace(/\D/g, "") })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
