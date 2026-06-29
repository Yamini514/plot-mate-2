"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Badge, Progress, Drawer, Field, inputClass, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";
import { formatDate } from "@/lib/utils";

const STATUS_TONE = { planned: "slate", in_progress: "sky", delayed: "amber", completed: "green" };

export default function VendorProjectsPage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/vendor/projects");
  const list = normalizeList(raw);
  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/vendor/projects/${openId}` : null);
  const [form, setForm] = useState({ percent: "", note: "" });
  const [busy, setBusy] = useState(false);

  const refresh = () => { reload(); reloadDetail(); };

  const postUpdate = async () => {
    if (!form.note.trim() && form.percent === "") return toast("Add a note or progress %", "error");
    setBusy(true);
    try {
      await api.post(`/vendor/projects/${openId}/update`, {
        note: form.note.trim() || null, percent: form.percent === "" ? null : Number(form.percent),
      });
      toast("Update posted"); setForm({ percent: "", note: "" }); refresh();
    } catch (e) { toast(e.message || "Could not post", "error"); }
    finally { setBusy(false); }
  };

  const addPhoto = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const url = await uploadImage(file); await api.post(`/vendor/projects/${openId}/photos`, { url }); toast("Photo added"); refresh(); }
    catch (e) { toast(e.message || "Could not upload", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Project Tasks" subtitle="Capital projects assigned to you — update progress and photos" />

      {list.length === 0 ? (
        <Card><EmptyState icon="hammer" title="No projects assigned" subtitle="Projects assigned to you appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <Card key={p.dbId} className="cursor-pointer p-4 transition-colors hover:border-brand-200" onClick={() => setOpenId(p.dbId)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{p.title}</p>
                  <p className="text-xs text-slate-400">{p.code} · target {p.targetDate ? formatDate(p.targetDate) : "—"}</p>
                  <div className="mt-2"><Progress value={p.progressPercent ?? 0} /></div>
                </div>
                <Badge tone={STATUS_TONE[p.status] ?? "slate"}>{(p.status || "").replace(/_/g, " ")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.title || "Project"} subtitle={detail?.code} width="max-w-xl">
        {!detail ? (
          <div className="py-10 text-center text-slate-400"><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between"><Badge tone={STATUS_TONE[detail.status] ?? "slate"}>{(detail.status || "").replace(/_/g, " ")}</Badge><span className="text-sm font-medium text-slate-700">{detail.progressPercent ?? 0}%</span></div>
            <Progress value={detail.progressPercent ?? 0} />
            <p className="text-sm text-slate-600">{detail.description}</p>

            {(detail.milestones?.length ?? 0) > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Milestones</p>
                <ul className="space-y-1 text-sm">
                  {detail.milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-2"><Icon name={m.done ? "check-circle-2" : "circle"} size={14} className={m.done ? "text-brand-600" : "text-slate-300"} /><span className="text-slate-700">{m.title}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {(detail.updates?.length ?? 0) > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Updates</p>
                <ul className="space-y-2 text-sm">
                  {detail.updates.map((u) => (
                    <li key={u.id} className="flex gap-2"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon name="dot" size={12} /></span><div><p className="text-slate-700">{u.note}{u.percent != null ? ` · ${u.percent}%` : ""}</p><p className="text-xs text-slate-400">{formatDate(u.createdAt || u.date)}</p></div></li>
                  ))}
                </ul>
              </div>
            )}

            {detail.status !== "completed" && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Post a progress update</p>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Progress %"><input type="number" min="0" max="100" className={inputClass} value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} /></Field>
                  <div className="col-span-2"><Field label="Note"><input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What progressed…" /></Field></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                    <Icon name="image-plus" size={14} /> Add photo
                    <input type="file" accept="image/*" hidden onChange={(e) => addPhoto(e.target.files?.[0])} />
                  </label>
                  <Button className="ml-auto" icon="send" loading={busy} onClick={postUpdate}>Post update</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
