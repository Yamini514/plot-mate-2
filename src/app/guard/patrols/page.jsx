"use client";

import { useState } from "react";
import {
  PageHeader, Breadcrumbs, Card, Button, Badge, Segmented, Drawer, Modal, Field, inputClass, EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";
import { formatDate } from "@/lib/utils";

const TONE = { scheduled: "slate", in_progress: "amber", completed: "green" };

export default function GuardPatrolsPage() {
  const toast = useToast();
  const [status, setStatus] = useState("all");
  const { data: raw, meta, reload } = useApi("/guard/patrols", { status });
  const patrols = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/guard/patrols/${openId}` : null);
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState({ title: "", checkpoints: "" });
  const [cp, setCp] = useState({ checkpoint: "", note: "", issue: false });
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => { reload(); reloadDetail(); };

  const addPatrol = async () => {
    if (!form.title.trim()) return toast("Add a title", "error");
    setBusy(true);
    try {
      await api.post("/guard/patrols", { title: form.title.trim(), checkpoints: form.checkpoints.split(",").map((s) => s.trim()).filter(Boolean) });
      toast("Patrol scheduled"); setForm({ title: "", checkpoints: "" }); setCreate(false); reload();
    } catch (e) { toast(e.message || "Could not create", "error"); }
    finally { setBusy(false); }
  };

  const act = async (id, fn, label) => {
    setBusy(true);
    try { await fn(); toast(label); refresh(); }
    catch (e) { toast(e.message || "Action failed", "error"); }
    finally { setBusy(false); }
  };

  const logCheckpoint = async () => {
    if (!cp.checkpoint.trim()) return toast("Pick a checkpoint", "error");
    await act(openId, async () => {
      await api.post(`/guard/patrols/${openId}/checkpoint`, { ...cp, photoUrl: photo });
      setCp({ checkpoint: "", note: "", issue: false }); setPhoto(null);
    }, "Checkpoint logged");
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Security" }, { label: "Patrols" }]} />
      <PageHeader title="Security Patrol" subtitle="Schedule patrols, scan checkpoints, and report issues"
        actions={<Button icon="plus" onClick={() => { setForm({ title: "", checkpoints: "" }); setCreate(true); }}>New patrol</Button>} />

      <Card className="mb-4 p-3">
        <Segmented value={status} onChange={setStatus} options={[
          { value: "all", label: "All", count: counts.all },
          { value: "scheduled", label: "Scheduled", count: counts.scheduled },
          { value: "in_progress", label: "Active", count: counts.in_progress },
          { value: "completed", label: "Completed", count: counts.completed },
        ]} />
      </Card>

      {patrols.length === 0 ? (
        <Card><EmptyState icon="route" title="No patrols" subtitle="Schedule a patrol to begin." /></Card>
      ) : (
        <div className="space-y-3">
          {patrols.map((p) => (
            <Card key={p.dbId} className="cursor-pointer p-4 transition-colors hover:border-brand-200" onClick={() => setOpenId(p.dbId)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{p.title || p.code}</p>
                  <p className="text-xs text-slate-400">{p.code} · {(p.checkpoints || []).length} checkpoints · {p.logCount} scans · {formatDate(p.createdAt)}</p>
                </div>
                <Badge tone={TONE[p.status] ?? "slate"}>{(p.status || "").replace(/_/g, " ")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.title || "Patrol"} subtitle={detail?.code} width="max-w-xl">
        {!detail ? (
          <div className="py-10 text-center text-slate-400"><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between"><Badge tone={TONE[detail.status] ?? "slate"}>{(detail.status || "").replace(/_/g, " ")}</Badge>
              {detail.status === "scheduled" && <Button size="sm" icon="play" loading={busy} onClick={() => act(openId, () => api.post(`/guard/patrols/${openId}/start`, {}), "Patrol started")}>Start patrol</Button>}
              {detail.status === "in_progress" && <Button size="sm" icon="flag" loading={busy} onClick={() => act(openId, () => api.post(`/guard/patrols/${openId}/complete`, {}), "Patrol completed")}>Complete</Button>}
            </div>

            {(detail.checkpoints || []).length > 0 && (
              <p className="text-xs text-slate-500">Route: {detail.checkpoints.join(" → ")}</p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Scans</p>
              {(detail.logs?.length ?? 0) === 0 ? <p className="text-xs text-slate-400">No checkpoints scanned yet.</p> : (
                <ul className="space-y-2">
                  {detail.logs.map((l) => (
                    <li key={l.id} className="flex gap-2 text-sm">
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${l.issue ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"}`}><Icon name={l.issue ? "triangle-alert" : "check"} size={12} /></span>
                      <div><p className="text-slate-700">{l.checkpoint}{l.note ? ` — ${l.note}` : ""}</p><p className="text-xs text-slate-400">{formatDate(l.createdAt)}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {detail.status === "in_progress" && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                <Field label="Checkpoint">
                  <select className={inputClass} value={cp.checkpoint} onChange={(e) => setCp({ ...cp, checkpoint: e.target.value })}>
                    <option value="">Select…</option>
                    {(detail.checkpoints || []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Note"><input className={inputClass} value={cp.note} onChange={(e) => setCp({ ...cp, note: e.target.value })} placeholder="All clear / observation…" /></Field>
                <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={cp.issue} onChange={(e) => setCp({ ...cp, issue: e.target.checked })} /> Report an issue here</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                    <Icon name="image-plus" size={14} /> {photo ? "photo attached" : "Add photo"}
                    <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setPhoto(await uploadImage(f)); } catch (err) { toast(err.message, "error"); } }} />
                  </label>
                  <Button className="ml-auto" size="sm" icon="scan-line" loading={busy} onClick={logCheckpoint}>Log checkpoint</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal open={create} onClose={() => setCreate(false)} title="New patrol"
        footer={<><Button variant="secondary" onClick={() => setCreate(false)}>Cancel</Button><Button icon="check" loading={busy} onClick={addPatrol}>Schedule</Button></>}>
        <div className="space-y-3">
          <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Night round" /></Field>
          <Field label="Checkpoints" hint="Comma-separated, e.g. Gate A, Block 1, Pool"><input className={inputClass} value={form.checkpoints} onChange={(e) => setForm({ ...form, checkpoints: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
