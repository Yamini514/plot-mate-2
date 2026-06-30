"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Avatar,
  Modal,
  Drawer,
  Field,
  EmptyState,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList, fieldErrors } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { text as vtext, presence, future, collect, hasErrors } from "@/lib/validate";

const typeTone = {
  meeting: "sky",
  deadline: "amber",
  progress: "brand",
  general: "slate",
};

const CHANNELS = [
  { value: "in_app", label: "In-app", icon: "bell" },
  { value: "email", label: "Email", icon: "mail" },
];

const AUDIENCES = [
  { value: "all", label: "All members" },
  { value: "phase", label: "By phase" },
  { value: "block", label: "By block" },
  { value: "owners", label: "Specific plots" },
];

const commentTone = { approved: "green", pending: "amber", hidden: "slate" };

const emptyForm = {
  title: "",
  type: "general",
  pinned: "No",
  body: "",
  audienceType: "all",
  audienceValues: "",
  channels: ["in_app"],
  attachmentUrl: "",
  attachmentName: "",
  allowComments: true,
  scheduledAt: "",
};

/* ---------- moderation / engagement drawer ---------- */
function AnnouncementDrawer({ dbId, onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/admin/announcements/${dbId}`);
      setData(d);
    } catch (e) {
      toast(e.message || "Could not load", "error");
    } finally {
      setLoading(false);
    }
  }, [dbId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on open
    load();
  }, [load]);

  const moderate = async (cid, status) => {
    try {
      await api.post(`/admin/announcements/${dbId}/comments/${cid}/moderate`, { status });
      toast(status === "approved" ? "Comment approved" : "Comment hidden");
      load();
    } catch (e) {
      toast(e.message || "Could not update", "error");
    }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api.post(`/admin/announcements/${dbId}/comment`, { body: comment.trim() });
      setComment("");
      load();
    } catch (e) {
      toast(e.message || "Could not post", "error");
    } finally {
      setPosting(false);
    }
  };

  const acks = data?.acks || [];
  const comments = data?.comments || [];
  const reactions = data?.reactions || {};

  return (
    <Drawer open onClose={onClose} title={data?.title || "Announcement"} subtitle={data?.code} width="max-w-xl">
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && data && (
        <div className="space-y-6">
          {/* reactions */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Reactions</h4>
            <div className="flex flex-wrap gap-2">
              {Object.keys(reactions).length === 0 && <span className="text-sm text-slate-400">None yet</span>}
              {Object.entries(reactions).map(([kind, count]) => (
                <Badge key={kind} tone="violet">
                  <span className="capitalize">{kind}</span> · {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* read receipts */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Read receipts ({acks.length})
            </h4>
            {acks.length === 0 ? (
              <p className="text-sm text-slate-400">No one has acknowledged this yet.</p>
            ) : (
              <div className="space-y-1.5">
                {acks.map((k) => (
                  <div key={k.id} className="flex items-center gap-2.5 text-sm">
                    <Avatar name={k.name} size={24} />
                    <span className="text-slate-700">{k.name}</span>
                    {k.plotNo && <span className="text-xs text-slate-400">{k.plotNo}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* comments + moderation */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Comments ({comments.length})
            </h4>
            <div className="space-y-3">
              {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.authorName} size={24} />
                      <span className="text-xs font-medium text-slate-700">{c.authorName}</span>
                      <Badge tone={commentTone[c.status]}>
                        <span className="capitalize">{c.status}</span>
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {c.status !== "approved" && (
                        <button
                          onClick={() => moderate(c.id, "approved")}
                          title="Approve"
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <Icon name="check" size={14} />
                        </button>
                      )}
                      {c.status !== "hidden" && (
                        <button
                          onClick={() => moderate(c.id, "hidden")}
                          title="Hide"
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Icon name="eye-off" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                className={inputClass}
                placeholder="Reply as committee…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && postComment()}
              />
              <Button size="sm" icon="send" onClick={postComment} loading={posting}>
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function AdminAnnouncementsPage() {
  const { data: raw, reload } = useApi("/admin/announcements");
  const announcements = normalizeList(raw);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [errors, setErrors] = useState({});

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  };

  const startEdit = (a) => {
    setEditingId(a.dbId);
    setErrors({});
    setForm({
      title: a.title ?? "",
      type: a.type ?? "general",
      pinned: a.pinned ? "Yes" : "No",
      body: a.body ?? "",
      audienceType: a.audienceType ?? "all",
      audienceValues: (a.audienceValues ?? []).join(", "),
      channels: a.channels?.length ? a.channels : ["in_app"],
      attachmentUrl: a.attachmentUrl ?? "",
      attachmentName: a.attachmentName ?? "",
      allowComments: a.allowComments ?? true,
    });
    setOpen(true);
  };

  const toggleChannel = (ch) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));

  const publish = async () => {
    const errs = collect({
      title: vtext(form.title, { min: 2, label: "Title" }),
      body: presence(form.body, "Message"),
      audienceValues: form.audienceType !== "all" ? presence(form.audienceValues, "Audience") : "",
      scheduledAt: !editingId && form.scheduledAt ? future(form.scheduledAt, { label: "Schedule time" }) : "",
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        pinned: form.pinned === "Yes",
        audienceType: form.audienceType,
        audienceValues:
          form.audienceType === "all"
            ? []
            : form.audienceValues.split(",").map((s) => s.trim()).filter(Boolean),
        channels: form.channels.length ? form.channels : ["in_app"],
        attachmentUrl: form.attachmentUrl.trim() || null,
        attachmentName: form.attachmentName.trim() || null,
        allowComments: form.allowComments,
        scheduledAt: form.scheduledAt || null,
      };
      if (editingId) {
        await api.put(`/admin/announcements/${editingId}`, payload);
        toast("Announcement updated");
      } else {
        const { data } = await api.post("/admin/announcements", payload);
        const d = data?.delivery || {};
        if (d.scheduled) {
          toast("Scheduled — it will publish at the set time");
        } else {
          const bits = [];
          if (d.email) bits.push(`emailed ${d.email}`);
          if (d.whatsapp) bits.push(`WhatsApp ${d.whatsapp}`);
          if (d.failed) bits.push(`${d.failed} failed`);
          toast(bits.length ? `Published — ${bits.join(", ")}` : "Announcement published");
        }
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      reload();
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setErrors(fe);
      else toast(e.message || "Could not publish", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (a) => {
    setBusyId(a.id);
    try {
      await api.post(`/admin/announcements/${a.dbId}/pin`);
      reload();
    } catch (e) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (a) => {
    setBusyId(a.id);
    try {
      await api.del(`/admin/announcements/${a.dbId}`);
      toast("Announcement deleted");
      reload();
    } catch (e) {
      toast(e.message || "Could not delete", "error");
    } finally {
      setBusyId(null);
    }
  };

  const audienceLabel = (a) => {
    if (!a.audienceType || a.audienceType === "all") return "All members";
    const vals = (a.audienceValues ?? []).join(", ");
    const base = AUDIENCES.find((x) => x.value === a.audienceType)?.label || a.audienceType;
    return vals ? `${base}: ${vals}` : base;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Announcements"
        subtitle="Post notices, target an audience, and track engagement"
        actions={<Button icon="plus" onClick={startCreate}>New announcement</Button>}
      />

      {announcements.length === 0 && (
        <Card>
          <EmptyState icon="megaphone" title="No announcements yet" subtitle="Publish your first notice to the community." />
        </Card>
      )}

      <div className="space-y-4">
        {announcements.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name="megaphone" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{a.title}</h3>
                  {a.pinned && (
                    <Badge tone="rose">
                      <Icon name="pin" size={11} /> Pinned
                    </Badge>
                  )}
                  <Badge tone={typeTone[a.type]}>
                    <span className="capitalize">{a.type}</span>
                  </Badge>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{a.body}</p>

                {a.attachmentUrl && (
                  <a
                    href={a.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
                  >
                    <Icon name="paperclip" size={13} />
                    {a.attachmentName || "Attachment"}
                  </a>
                )}

                {/* meta row */}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Avatar name={a.author} size={20} />
                    {a.author} · {formatDate(a.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="users" size={13} /> {audienceLabel(a)}
                  </span>
                  {(a.channels ?? []).map((c) => (
                    <span key={c} className="flex items-center gap-1">
                      <Icon name={CHANNELS.find((x) => x.value === c)?.icon || "bell"} size={13} />
                      {CHANNELS.find((x) => x.value === c)?.label || c}
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <Icon name="check-check" size={13} /> {a.ackCount ?? 0} read
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="message-circle" size={13} /> {a.commentCount ?? 0}
                  </span>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setViewId(a.dbId)}
                  title="View engagement & moderate"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <Icon name="eye" size={15} />
                </button>
                <button
                  onClick={() => togglePin(a)}
                  disabled={busyId === a.id}
                  title={a.pinned ? "Unpin" : "Pin to top"}
                  className={
                    "grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-50 " +
                    (a.pinned ? "text-rose-500" : "text-slate-400")
                  }
                >
                  <Icon name="pin" size={15} />
                </button>
                <button
                  onClick={() => startEdit(a)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  onClick={() => remove(a)}
                  disabled={busyId === a.id}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                >
                  {busyId === a.id ? (
                    <Icon name="loader-circle" size={15} className="animate-spin" />
                  ) : (
                    <Icon name="trash-2" size={15} />
                  )}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit announcement" : "New announcement"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="send" onClick={publish} loading={saving}>
              {editingId ? "Save changes" : "Publish"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" error={errors.title}>
            <input className={inputClass} placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="general">general</option>
                <option value="meeting">meeting</option>
                <option value="deadline">deadline</option>
                <option value="progress">progress</option>
              </select>
            </Field>
            <Field label="Pin to top">
              <select className={inputClass} value={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.value })}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </Field>
          </div>

          {!editingId && (
            <Field label="Schedule for later (optional)" hint="Leave blank to publish now; otherwise it goes live at this time." error={errors.scheduledAt}>
              <input type="datetime-local" className={inputClass} value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </Field>
          )}

          <Field label="Message" error={errors.body}>
            <textarea rows={5} className={inputClass} placeholder="Write your announcement…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>

          {/* audience targeting */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Audience">
              <select className={inputClass} value={form.audienceType} onChange={(e) => setForm({ ...form, audienceType: e.target.value })}>
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </Field>
            {form.audienceType !== "all" && (
              <Field
                label={form.audienceType === "owners" ? "Plot numbers" : "Phases / blocks"}
                hint="Comma-separated, e.g. Phase 1, Phase 2"
                error={errors.audienceValues}
              >
                <input className={inputClass} placeholder="Phase 1, Phase 2" value={form.audienceValues} onChange={(e) => setForm({ ...form, audienceValues: e.target.value })} />
              </Field>
            )}
          </div>

          {/* channels */}
          <Field label="Send via" hint="In-app always shows in the members' feed. Email / WhatsApp use the association's configured gateway.">
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => {
                const on = form.channels.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleChannel(c.value)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset transition-colors " +
                      (on ? "bg-brand-50 text-brand-700 ring-brand-300" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50")
                    }
                  >
                    <Icon name={on ? "check" : c.icon} size={14} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* attachment */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Attachment URL (optional)">
              <input className={inputClass} placeholder="https://…/notice.pdf" value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} />
            </Field>
            <Field label="Attachment name">
              <input className={inputClass} placeholder="Notice.pdf" value={form.attachmentName} onChange={(e) => setForm({ ...form, attachmentName: e.target.value })} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.allowComments} onChange={(e) => setForm({ ...form, allowComments: e.target.checked })} />
            Allow members to comment
          </label>
        </div>
      </Modal>

      {viewId && <AnnouncementDrawer dbId={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}
