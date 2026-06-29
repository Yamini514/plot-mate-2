"use client";

import { useState } from "react";
import { PageHeader, Card, Button, StatusBadge, Segmented, Drawer, Field, inputClass, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";
import { formatDate } from "@/lib/utils";

export default function VendorComplaintsPage() {
  const toast = useToast();
  const [status, setStatus] = useState("all");
  const { data: raw, reload } = useApi("/vendor/complaints", { status: status === "all" ? undefined : status });
  const list = normalizeList(raw);
  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/vendor/complaints/${openId}` : null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);

  const refresh = () => { reload(); reloadDetail(); };
  const act = async (fn, label) => {
    setBusy(label);
    try { await fn(); toast(label); refresh(); }
    catch (e) { toast(e.message || "Action failed", "error"); }
    finally { setBusy(null); }
  };

  const addNote = () => { if (!note.trim()) return toast("Write an update", "error"); return act(async () => { await api.post(`/vendor/complaints/${openId}/note`, { body: note.trim() }); setNote(""); }, "Update posted"); };
  const resolve = () => act(() => api.post(`/vendor/complaints/${openId}/resolve`, {}), "Marked resolved");
  const addPhoto = async (file) => {
    if (!file) return;
    setBusy("photo");
    try { const url = await uploadImage(file); await api.post(`/vendor/complaints/${openId}/attachments`, { name: file.name, url }); toast("Photo added"); refresh(); }
    catch (e) { toast(e.message || "Could not upload", "error"); }
    finally { setBusy(null); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Assigned Complaints" subtitle="Complaints the association assigned to you" />
      <Card className="mb-4 p-3">
        <Segmented value={status} onChange={setStatus} options={[
          { value: "all", label: "All" }, { value: "open", label: "Open" },
          { value: "in_progress", label: "In progress" }, { value: "resolved", label: "Resolved" },
        ]} />
      </Card>

      {list.length === 0 ? (
        <Card><EmptyState icon="message-square-warning" title="No assigned complaints" subtitle="Complaints assigned to you appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <Card key={c.dbId} className="cursor-pointer p-4 transition-colors hover:border-brand-200" onClick={() => setOpenId(c.dbId)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{c.title}</p>
                  <p className="text-xs text-slate-400">{c.id} · {c.category} · Plot {c.plotNo || "—"} · {formatDate(c.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2"><StatusBadge status={c.priority} /><StatusBadge status={c.status} /></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.title || "Complaint"} subtitle={detail?.code} width="max-w-xl">
        {!detail ? (
          <div className="py-10 text-center text-slate-400"><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><StatusBadge status={detail.status} /><StatusBadge status={detail.priority} /></div>
            <p className="text-sm text-slate-700">{detail.description}</p>
            {(detail.attachments?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.attachments.map((a, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.name} className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" /></a>
                ))}
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</p>
              {(detail.events?.length ?? 0) === 0 ? <p className="text-xs text-slate-400">No updates yet.</p> : (
                <ul className="space-y-2">
                  {detail.events.map((e) => (
                    <li key={e.id} className="flex gap-2 text-sm"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon name="dot" size={12} /></span><div><p className="text-slate-700">{e.body}</p><p className="text-xs text-slate-400">{e.actorName || "system"} · {formatDate(e.createdAt)}</p></div></li>
                  ))}
                </ul>
              )}
            </div>

            {["open", "in_progress"].includes(detail.status) && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                <Field label="Post a progress update (visible to the resident)">
                  <textarea rows={2} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Visited site, part ordered…" />
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" icon="message-square-plus" loading={busy === "Update posted"} onClick={addNote}>Post update</Button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
                    <Icon name={busy === "photo" ? "loader-circle" : "image-plus"} size={14} className={busy === "photo" ? "animate-spin" : ""} /> Add photo
                    <input type="file" accept="image/*" hidden onChange={(e) => addPhoto(e.target.files?.[0])} />
                  </label>
                  <Button size="sm" className="ml-auto" icon="circle-check-big" loading={busy === "Marked resolved"} onClick={resolve}>Mark resolved</Button>
                </div>
              </div>
            )}
            {detail.status === "resolved" && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Resolved — awaiting resident confirmation.</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
