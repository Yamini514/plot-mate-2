"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  Drawer,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

const slaBadge = (t) => {
  if (t.slaState === "breached") return <Badge tone="rose"><Icon name="alarm-clock-off" size={11} /> {t.slaRemaining}</Badge>;
  if (t.slaState === "due_soon") return <Badge tone="amber"><Icon name="clock" size={11} /> {t.slaRemaining}</Badge>;
  return <Badge tone="slate"><Icon name="clock" size={11} /> {t.slaRemaining}</Badge>;
};

function WorkOrderDrawer({ dbId, onClose, onChanged }) {
  const toast = useToast();
  const [t, setT] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoKind, setPhotoKind] = useState("before");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/vendor/tickets/${dbId}`);
      setT(data);
    } catch (e) {
      toast(e.message || "Could not load", "error");
    } finally {
      setLoading(false);
    }
  }, [dbId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    load();
  }, [load]);

  const act = async (fn, label) => {
    setBusy(label);
    try {
      await fn();
      toast(label);
      await load();
      onChanged?.();
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const accept = () => act(() => api.post(`/vendor/tickets/${dbId}/accept`), "Accepted");
  const start = () => act(() => api.post(`/vendor/tickets/${dbId}/transition`, { to: "in_progress" }), "Work started");
  const decline = () => {
    if (!reason.trim()) return toast("Add a reason for declining", "error");
    return act(() => api.post(`/vendor/tickets/${dbId}/reject`, { reason: reason.trim() }), "Declined");
  };
  const complete = () => {
    if (!note.trim()) return toast("Add a completion note", "error");
    return act(() => api.post(`/vendor/tickets/${dbId}/complete`, { completion_note: note.trim() }), "Marked complete");
  };
  const addPhoto = () => {
    if (!photoUrl.trim()) return toast("Paste a photo URL", "error");
    return act(async () => {
      await api.post(`/vendor/tickets/${dbId}/photos`, { url: photoUrl.trim(), kind: photoKind });
      setPhotoUrl("");
    }, "Photo added");
  };

  const photos = t?.photos || [];
  const before = photos.filter((p) => p.kind === "before");
  const after = photos.filter((p) => p.kind === "after");
  const canRespond = t && ["assigned", "escalated"].includes(t.status);
  const canStart = t && t.status === "accepted";
  const canWork = t && ["in_progress", "reopened"].includes(t.status);

  return (
    <Drawer open onClose={onClose} width="max-w-xl" title={t?.subject} subtitle={t ? `${t.code} · ${t.location}` : ""}>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && t && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={t.status} />
            <StatusBadge status={t.priority} />
            {slaBadge(t)}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
            <p className="text-sm leading-relaxed text-slate-600">{t.description || "—"}</p>
          </div>

          {t.rejectedReason && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Previously declined: {t.rejectedReason}
            </div>
          )}

          {/* before / after photos */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Photos</p>
            {photos.length === 0 && <p className="text-sm text-slate-400">No photos yet.</p>}
            <div className="grid grid-cols-2 gap-3">
              {[["Before", before], ["After", after]].map(([label, list]) => (
                <div key={label}>
                  <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {list.map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.caption || label} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                      </a>
                    ))}
                    {list.length === 0 && <span className="text-xs text-slate-300">—</span>}
                  </div>
                </div>
              ))}
            </div>
            {(canWork || canStart) && (
              <div className="mt-3 flex items-end gap-2">
                <Field label="Add a photo (URL)">
                  <input className={inputClass} placeholder="https://…/photo.jpg" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                </Field>
                <select className={inputClass + " w-32"} value={photoKind} onChange={(e) => setPhotoKind(e.target.value)}>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
                <Button size="sm" variant="secondary" icon="image-plus" loading={busy === "Photo added"} onClick={addPhoto}>Add</Button>
              </div>
            )}
          </div>

          {/* completion note */}
          {t.completionNote && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Completion note</p>
              <p className="text-sm text-slate-600">{t.completionNote}</p>
            </div>
          )}

          {/* actions by state */}
          {canRespond && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Respond to this assignment</p>
              <div className="flex gap-2">
                <Button size="sm" icon="check" loading={busy === "Accepted"} onClick={accept}>Accept</Button>
              </div>
              <Field label="Or decline with a reason">
                <input className={inputClass} placeholder="e.g. No slot until Monday" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <Button size="sm" variant="secondary" icon="x" loading={busy === "Declined"} onClick={decline}>Decline</Button>
            </div>
          )}

          {canStart && (
            <Button icon="play" loading={busy === "Work started"} onClick={start}>Start work</Button>
          )}

          {canWork && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-4">
              <Field label="Completion note">
                <textarea rows={3} className={inputClass} placeholder="What was done…" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Button icon="circle-check-big" loading={busy === "Marked complete"} onClick={complete}>Mark complete</Button>
            </div>
          )}

          {t.status === "resolved" && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Completed — awaiting owner confirmation.</p>
          )}
          {t.status === "closed" && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">Closed{t.rating ? ` · rated ${t.rating}★` : ""}.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}

export default function VendorWorkOrdersPage() {
  const { data: raw, reload } = useApi("/vendor/tickets", { page_size: 300 });
  const rows = normalizeList(raw);
  const [status, setStatus] = useState("active");
  const [activeId, setActiveId] = useState(null);

  const ACTIVE = ["assigned", "accepted", "in_progress", "escalated", "reopened"];
  const filtered = rows.filter((t) => {
    if (status === "all") return true;
    if (status === "active") return ACTIVE.includes(t.status);
    return t.status === status;
  });

  const counts = {
    active: rows.filter((t) => ACTIVE.includes(t.status)).length,
    resolved: rows.filter((t) => t.status === "resolved").length,
    closed: rows.filter((t) => t.status === "closed").length,
    all: rows.length,
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="My Work Orders" subtitle="Jobs assigned to you — accept, work, and close them out" />

      <Card className="mb-4 p-3">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Active", count: counts.active },
            { value: "resolved", label: "Completed", count: counts.resolved },
            { value: "closed", label: "Closed", count: counts.closed },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="clipboard-list" title="No work orders" subtitle="Assignments will appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Work order</Th>
                <Th>Priority</Th>
                <Th>SLA</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <Tr key={t.id} onClick={() => setActiveId(t.dbId)}>
                  <Td>
                    <p className="font-medium text-slate-800">{t.subject}</p>
                    <p className="text-xs text-slate-400">{t.id} · {t.location} · {formatDate(t.created)}</p>
                  </Td>
                  <Td><StatusBadge status={t.priority} /></Td>
                  <Td>{slaBadge(t)}</Td>
                  <Td><StatusBadge status={t.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {activeId && (
        <WorkOrderDrawer dbId={activeId} onClose={() => setActiveId(null)} onChanged={reload} />
      )}
    </div>
  );
}
