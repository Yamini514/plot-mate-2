"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  Modal,
  Drawer,
  Field,
  inputClass,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useSettings } from "@/lib/useSettings";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";
import { formatDate } from "@/lib/utils";

const catIcon = {
  Roads: "construction",
  Water: "droplets",
  Electricity: "zap",
  Security: "shield",
  Cleanliness: "trash-2",
  Other: "circle-help",
};

const emptyForm = { title: "", category: "Roads", customCategory: "", priority: "medium", description: "" };

export default function MemberComplaintsPage() {
  const { data: raw, reload } = useApi("/member/complaints");
  const list = normalizeList(raw); // backend returns this member's own
  const { settings } = useSettings();
  const categories = settings.lists?.complaintCategories?.length ? settings.lists.complaintCategories : ["Roads", "Water", "Electricity", "Security", "Cleanliness", "Other"];
  const priorities = settings.lists?.complaintPriorities?.length ? settings.lists.complaintPriorities : ["low", "medium", "high"];
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]); // [{name,url}]
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [reopenFor, setReopenFor] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [openId, setOpenId] = useState(null); // complaint detail drawer
  const { data: detail } = useApi(openId ? `/member/complaints/${openId}` : null);

  const addPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try { const url = await uploadImage(file); setPhotos((p) => [...p, { name: file.name, url }]); }
    catch (e) { toast(e.message || "Could not upload photo", "error"); }
    finally { setUploading(false); }
  };

  const confirmResolved = async (c) => {
    setBusyId(c.dbId);
    try {
      await api.post(`/member/complaints/${c.dbId}/confirm`, {});
      toast("Thanks — resolution confirmed");
      reload();
    } catch (e) {
      toast(e.message || "Could not confirm", "error");
    } finally { setBusyId(null); }
  };

  const doReopen = async () => {
    if (reopenReason.trim().length < 3) { toast("Add a reason (min 3 chars)", "error"); return; }
    setBusyId(reopenFor.dbId);
    try {
      await api.post(`/member/complaints/${reopenFor.dbId}/reopen`, { reason: reopenReason.trim() });
      toast("Complaint reopened");
      setReopenFor(null);
      setReopenReason("");
      reload();
    } catch (e) {
      toast(e.message || "Could not reopen", "error");
    } finally { setBusyId(null); }
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast("Please add a title", "error");
      return;
    }
    const category = form.category === "Other" ? form.customCategory.trim() : form.category;
    if (form.category === "Other" && !category) {
      toast("Enter the category", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/member/complaints", {
        title: form.title.trim(),
        description: form.description.trim(),
        category,
        priority: form.priority,
        attachments: photos,
      });
      toast("Complaint raised — the committee has been notified");
      setForm(emptyForm);
      setPhotos([]);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not raise complaint", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Complaints"
        subtitle="Raise an issue and track its resolution"
        actions={<Button icon="plus" onClick={() => setOpen(true)}>Raise complaint</Button>}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon="message-square-warning"
            title="No complaints yet"
            subtitle="Raise a complaint and the committee will get on it."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <Icon name={catIcon[c.category] ?? "circle-help"} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{c.title}</h3>
                    <StatusBadge status={c.status} />
                    <StatusBadge status={c.priority} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="font-mono">{c.id}</span>
                    <span>{c.category}</span>
                    {c.assignedTo && <span>Assigned to {c.assignedTo}</span>}
                    {c.reopenCount > 0 && <span>Reopened ×{c.reopenCount}</span>}
                    {(c.attachments?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1"><Icon name="paperclip" size={11} />{c.attachments.length}</span>}
                    <button onClick={() => setOpenId(c.dbId)} className="font-medium text-brand-600 hover:underline">View timeline</button>
                  </div>
                  {c.status === "resolved" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">Is this fixed?</span>
                      <Button variant="secondary" icon="circle-check-big" loading={busyId === c.dbId} onClick={() => confirmResolved(c)}>
                        Confirm resolved
                      </Button>
                      <Button variant="ghost" icon="rotate-ccw" onClick={() => { setReopenFor(c); setReopenReason(""); }}>
                        Reopen
                      </Button>
                    </div>
                  )}
                  {c.status === "closed" && c.residentConfirmed && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600">
                      <Icon name="circle-check-big" size={13} /> You confirmed this resolution
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!reopenFor}
        onClose={() => setReopenFor(null)}
        title="Reopen complaint"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReopenFor(null)}>Cancel</Button>
            <Button icon="rotate-ccw" loading={busyId === reopenFor?.dbId} onClick={doReopen}>Reopen</Button>
          </>
        }
      >
        <Field label="Why are you reopening this?" hint="Tell the committee what's still wrong.">
          <textarea className={inputClass} rows={3} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="The issue came back / wasn't fully fixed…" />
        </Field>
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Raise a complaint"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="send" loading={saving} onClick={submit}>Submit</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <input className={inputClass} placeholder="Brief summary of the issue" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {priorities.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>
          {form.category === "Other" && (
            <Field label="Enter category">
              <input className={inputClass} placeholder="What kind of issue?" value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} />
            </Field>
          )}
          <Field label="Description">
            <textarea rows={4} className={inputClass} placeholder="Describe the issue in detail…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Photos (optional)" hint="Attach photos of the issue.">
            <input type="file" accept="image/*" disabled={uploading} onChange={(e) => addPhoto(e.target.files?.[0])} />
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    <Icon name="image" size={12} /> {p.name}
                    <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-600"><Icon name="x" size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>
      </Modal>

      {/* Complaint detail — timeline + attachments */}
      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail?.title || "Complaint"} subtitle={detail?.code}>
        {!detail ? (
          <div className="py-10 text-center text-slate-400"><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={detail.status} />
              <StatusBadge status={detail.priority} />
              {detail.escalationLevel && <Badge tone="rose">escalated · {detail.escalationLevel}</Badge>}
            </div>
            <p className="text-sm text-slate-700">{detail.description}</p>
            {(detail.attachments?.length ?? 0) > 0 && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.attachments.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={a.name} className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" /></a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</h4>
              {(detail.events?.length ?? 0) === 0 ? (
                <p className="text-xs text-slate-400">No updates yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {detail.events.map((e) => (
                    <li key={e.id} className="flex gap-2.5 text-sm">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon name="dot" size={14} /></span>
                      <div><p className="text-slate-700">{e.body}</p><p className="text-xs text-slate-400">{e.actorName || "system"} · {formatDate(e.createdAt)}</p></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
