"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  Modal,
  Field,
  inputClass,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";

const catIcon = {
  Roads: "construction",
  Water: "droplets",
  Electricity: "zap",
  Security: "shield",
  Cleanliness: "trash-2",
  Other: "circle-help",
};

const emptyForm = { title: "", category: "Roads", priority: "medium", description: "" };

export default function MemberComplaintsPage() {
  const { data: raw, reload } = useApi("/member/complaints");
  const list = normalizeList(raw); // backend returns this member's own
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.title.trim()) {
      toast("Please add a title", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/member/complaints", {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
      });
      toast("Complaint raised — the committee has been notified");
      setForm(emptyForm);
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
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

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
                {["Roads", "Water", "Electricity", "Security", "Cleanliness", "Other"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={4} className={inputClass} placeholder="Describe the issue in detail…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
