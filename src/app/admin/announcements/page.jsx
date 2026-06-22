"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Avatar,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const typeTone = {
  meeting: "sky",
  deadline: "amber",
  progress: "brand",
  general: "slate",
};

const emptyForm = { title: "", type: "general", pinned: "No", body: "" };

export default function AdminAnnouncementsPage() {
  const { data: raw, reload } = useApi("/admin/announcements");
  const announcements = normalizeList(raw);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (a) => {
    setEditingId(a.dbId);
    setForm({
      title: a.title ?? "",
      type: a.type ?? "general",
      pinned: a.pinned ? "Yes" : "No",
      body: a.body ?? "",
    });
    setOpen(true);
  };

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast("Title and message are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        pinned: form.pinned === "Yes",
      };
      if (editingId) {
        await api.put(`/admin/announcements/${editingId}`, payload);
        toast("Announcement updated");
      } else {
        await api.post("/admin/announcements", payload);
        toast("Announcement published");
      }
      setForm(emptyForm);
      setEditingId(null);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not publish", "error");
    } finally {
      setSaving(false);
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Announcements"
        subtitle="Post notices to all members"
        actions={<Button icon="plus" onClick={startCreate}>New announcement</Button>}
      />

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
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.body}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Avatar name={a.author} size={20} />
                  {a.author} · {formatDate(a.date)}
                </div>
              </div>
              <div className="flex gap-1">
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
            <Button icon="send" onClick={publish} loading={saving}>{editingId ? "Save changes" : "Publish"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
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
          <Field label="Message">
            <textarea rows={5} className={inputClass} placeholder="Write your announcement…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
