"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Badge, Drawer, Field, inputClass, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";
import { formatDate } from "@/lib/utils";

const DUE_TONE = { overdue: "rose", due_soon: "amber", ok: "green" };

export default function VendorMaintenancePage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/vendor/maintenance");
  const list = normalizeList(raw);
  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/vendor/maintenance/${openId}` : null);
  const [form, setForm] = useState({ report: "", outcome: "ok", recommendation: "" });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);

  const open = (id) => { setOpenId(id); setForm({ report: "", outcome: "ok", recommendation: "" }); setPhotos([]); };

  const addPhoto = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const url = await uploadImage(file); setPhotos((p) => [...p, { url }]); }
    catch (e) { toast(e.message || "Could not upload", "error"); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (!form.report.trim()) return toast("Add an inspection report", "error");
    setBusy(true);
    try {
      await api.post(`/vendor/maintenance/${openId}/log`, {
        report: form.report.trim(), outcome: form.outcome, recommendation: form.recommendation.trim() || null, photos,
      });
      toast(form.outcome === "issue_found" ? "Inspection logged — issue raised as a work order" : "Inspection logged");
      setOpenId(null); reload(); reloadDetail();
    } catch (e) { toast(e.message || "Could not submit", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Preventive Maintenance" subtitle="Inspections scheduled to you — perform and submit a report" />

      {list.length === 0 ? (
        <Card><EmptyState icon="calendar-clock" title="No inspections assigned" subtitle="Scheduled inspections appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <Card key={s.dbId} className="cursor-pointer p-4 transition-colors hover:border-brand-200" onClick={() => open(s.dbId)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-400">{s.code} · {s.area || "—"} · {s.frequency} · next due {s.nextDueOn ? formatDate(s.nextDueOn) : "—"}</p>
                </div>
                <Badge tone={DUE_TONE[s.dueState] ?? "slate"}>{(s.dueState || "").replace(/_/g, " ")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.title || "Inspection"} subtitle={detail?.code} width="max-w-xl">
        {!detail ? (
          <div className="py-10 text-center text-slate-400"><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">{detail.notes || detail.area}</p>

            {(detail.logs?.length ?? 0) > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Past inspections</p>
                <ul className="space-y-1.5 text-sm">
                  {detail.logs.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2"><span className="text-slate-700">{l.outcome === "issue_found" ? "⚠ Issue" : "✓ OK"} — {l.report}</span><span className="text-xs text-slate-400">{formatDate(l.performedOn)}</span></li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Submit inspection</p>
              <Field label="Report"><textarea rows={3} className={inputClass} value={form.report} onChange={(e) => setForm({ ...form, report: e.target.value })} placeholder="What you inspected and found…" /></Field>
              <Field label="Outcome">
                <select className={inputClass} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
                  <option value="ok">All OK</option>
                  <option value="issue_found">Issue found (raise a work order)</option>
                </select>
              </Field>
              <Field label="Recommendation (optional)"><input className={inputClass} value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} placeholder="e.g. Replace filter next quarter" /></Field>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                  <Icon name="image-plus" size={14} /> Add photo{photos.length ? ` (${photos.length})` : ""}
                  <input type="file" accept="image/*" hidden onChange={(e) => addPhoto(e.target.files?.[0])} />
                </label>
                <Button className="ml-auto" icon="check" loading={busy} onClick={submit}>Submit inspection</Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
