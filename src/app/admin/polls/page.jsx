"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  Progress,
  Segmented,
  EmptyState,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const emptyForm = { question: "", description: "", options: "Yes\nNo\nNeed more details", closesAt: "" };

export default function AdminPollsPage() {
  const { data: raw, reload } = useApi("/admin/polls");
  const polls = normalizeList(raw);
  const toast = useToast();
  // Live polls vs. closed (archived) ones.
  const [tab, setTab] = useState("active");
  const activePolls = polls.filter((p) => p.status === "active");
  const closedPolls = polls.filter((p) => p.status !== "active");
  const shown = tab === "active" ? activePolls : closedPolls;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      question: p.question ?? "",
      description: p.description ?? "",
      options: (p.options ?? []).map((o) => o.label).join("\n"),
      closesAt: p.closesAt ? String(p.closesAt).slice(0, 10) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (editing) {
      // Editing keeps the existing options/votes intact — only the wording,
      // description and closing date change.
      if (!form.question.trim()) {
        toast("Question is required", "error");
        return;
      }
      setSaving(true);
      try {
        await api.put(`/admin/polls/${editing.dbId}`, {
          question: form.question.trim(),
          description: form.description.trim(),
          closesAt: form.closesAt || editing.closesAt,
        });
        toast("Poll updated");
        setForm(emptyForm);
        setEditing(null);
        setOpen(false);
        reload();
      } catch (e) {
        toast(e.message || "Could not update poll", "error");
      } finally {
        setSaving(false);
      }
      return;
    }

    const opts = form.options
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!form.question.trim() || opts.length < 2) {
      toast("Add a question and at least 2 options", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/polls", {
        question: form.question.trim(),
        description: form.description.trim(),
        options: opts.map((label, i) => ({ id: String.fromCharCode(97 + i), label, votes: 0 })),
        status: "active",
        closesAt: form.closesAt || "2025-06-30",
      });
      toast("Poll launched");
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not launch poll", "error");
    } finally {
      setSaving(false);
    }
  };

  const close = async (p) => {
    setBusyId(p.id);
    try {
      await api.post(`/admin/polls/${p.dbId}/close`);
      toast("Poll closed");
      reload();
    } catch (e) {
      toast(e.message || "Could not close poll", "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/polls/${confirmDelete.dbId}`);
      toast("Poll deleted");
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete poll", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Polls & Voting"
        subtitle="Run community decisions transparently"
        actions={<Button icon="plus" onClick={openCreate}>Create poll</Button>}
      />

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "active", label: "Active", count: activePolls.length },
            { value: "closed", label: "Closed", count: closedPolls.length },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon="vote"
            title={tab === "active" ? "No active polls" : "No closed polls"}
            subtitle={tab === "active" ? "Launch a poll to gather the community's vote." : "Closed polls are archived here for reference."}
          />
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shown.map((p) => {
          const total = p.options.reduce((s, o) => s + o.votes, 0);
          const leading = Math.max(...p.options.map((o) => o.votes));
          return (
            <Card key={p.id}>
              <CardHeader
                title={p.question}
                subtitle={`${p.totalVoters} voters · closes ${formatDate(p.closesAt)}`}
                icon="vote"
                action={
                  <Badge tone={p.status === "active" ? "green" : "slate"}>
                    {p.status}
                  </Badge>
                }
              />
              <div className="space-y-3 p-5">
                <p className="text-xs leading-relaxed text-slate-500">{p.description}</p>
                {p.options.map((o) => {
                  const pct = total ? Math.round((o.votes / total) * 100) : 0;
                  return (
                    <div key={o.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span
                          className={
                            o.votes === leading
                              ? "font-semibold text-slate-800"
                              : "text-slate-600"
                          }
                        >
                          {o.label}
                        </span>
                        <span className="text-slate-500">
                          {pct}% · {o.votes}
                        </span>
                      </div>
                      <Progress value={pct} tone={o.votes === leading ? "brand" : "amber"} />
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="ghost" icon="pencil" onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" icon="trash-2" onClick={() => setConfirmDelete(p)}>
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="square"
                    disabled={p.status === "closed"}
                    loading={busyId === p.id}
                    onClick={() => close(p)}
                  >
                    {p.status === "closed" ? "Closed" : "Close poll"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit poll" : "Create poll"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>{editing ? "Save changes" : "Launch poll"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Question">
            <input className={inputClass} placeholder="What do you want to ask?" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea rows={2} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          {editing ? (
            <Field label="Options" hint="Options can't be changed after a poll is launched (votes are preserved)">
              <div className="flex flex-wrap gap-2">
                {(editing.options ?? []).map((o) => (
                  <span key={o.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{o.label}</span>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="Options" hint="One per line">
              <textarea rows={4} className={inputClass} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
            </Field>
          )}
          <Field label="Closes on">
            <input type="date" className={inputClass} value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete poll"
        message={`Delete "${confirmDelete?.question}"? All votes cast on this poll will be removed.`}
      />
    </div>
  );
}
