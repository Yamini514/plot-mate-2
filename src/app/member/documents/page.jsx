"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Badge, Modal, Field, EmptyState, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadDocument } from "@/lib/upload";
import { formatDate } from "@/lib/utils";

const catIcon = {
  Legal: "scale",
  Financial: "indian-rupee",
  "Meeting Minutes": "file-text",
  Layout: "map",
  Maintenance: "wrench",
  Other: "file",
};
const CATEGORIES = ["Legal", "Financial", "Maintenance", "Other"];
const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8 MB

function DocCard({ d }) {
  const open = () => {
    if (d.url && d.url !== "#") window.open(d.url, "_blank", "noopener,noreferrer");
  };
  const hasFile = d.url && d.url !== "#";
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon name={catIcon[d.category] ?? "file"} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800">{d.name}</p>
        <p className="text-xs text-slate-400">{d.category} · {d.size} · {formatDate(d.date)}</p>
      </div>
      <button
        onClick={open}
        disabled={!hasFile}
        title={hasFile ? "Open document" : "No file attached"}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-40"
      >
        <Icon name="download" size={16} />
      </button>
    </Card>
  );
}

export default function MemberDocumentsPage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/member/documents");
  const documents = normalizeList(raw);
  const association = documents.filter((d) => (d.visibility ?? "owners") !== "plot");
  const mine = documents.filter((d) => d.visibility === "plot");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Legal", customCategory: "", docType: "" });
  const [file, setFile] = useState(null); // { url, name, size }
  const [replacingId, setReplacingId] = useState(null);

  // Owner replaces their own document with a new version (lands pending review).
  const replaceDoc = async (doc, picked) => {
    if (!picked) return;
    setReplacingId(doc.dbId);
    try {
      const { url } = await uploadDocument(picked);
      await api.post(`/member/documents/${doc.dbId}/versions`, { name: picked.name, url, size: picked.size });
      toast("New version uploaded — pending review");
      reload();
    } catch (e) { toast(e.message || "Could not replace", "error"); }
    finally { setReplacingId(null); }
  };
  const [saving, setSaving] = useState(false);

  const onFile = (f) => {
    if (!f) return;
    if (f.size > MAX_DOC_BYTES) return toast("File must be under 8 MB", "error");
    const reader = new FileReader();
    reader.onload = () =>
      setFile({ url: reader.result, name: f.name, size: `${(f.size / 1024 / 1024).toFixed(1)} MB` });
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast("Give the document a name", "error");
    if (!file) return toast("Attach a file", "error");
    const category = form.category === "Other" ? form.customCategory.trim() : form.category;
    if (form.category === "Other" && !category) return toast("Enter the category", "error");
    setSaving(true);
    try {
      await api.post("/member/documents", {
        name: form.name.trim(),
        category,
        docType: form.docType || null,
        url: file.url,
        size: file.size,
      });
      toast("Uploaded — sent to the association for approval");
      setForm({ name: "", category: "Legal", customCategory: "", docType: "" });
      setFile(null);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not upload", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Documents"
        subtitle="Records the association has shared with you"
        actions={<Button icon="upload" onClick={() => setOpen(true)}>Upload document</Button>}
      />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon name="users" size={16} className="text-slate-400" /> Association documents
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{association.length}</span>
        </h2>
        {association.length === 0 ? (
          <Card className="p-0">
            <EmptyState icon="folder-open" title="No shared documents yet" subtitle="Association-wide records will appear here once published." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {association.map((d) => <DocCard key={d.id} d={d} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon name="map-pin" size={16} className="text-slate-400" /> My plot documents
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{mine.length}</span>
        </h2>
        <p className="-mt-1 mb-3 text-xs text-slate-400">
          <Icon name="info" size={12} className="mr-1 inline" />
          Documents you upload are reviewed by the association before they appear here.
        </p>
        {mine.length === 0 ? (
          <Card className="p-0">
            <EmptyState icon="file-text" title="Nothing for your plot yet" subtitle="Upload an agreement or receipt, or wait for the admin to share one." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mine.map((d) => (
              <div key={d.id} className="relative">
                <DocCard d={d} />
                {!d.approved && (
                  <span className="absolute right-12 top-3"><Badge tone="amber"><Icon name="clock" size={11} /> Pending</Badge></span>
                )}
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline">
                  <Icon name={replacingId === d.dbId ? "loader-circle" : "refresh-cw"} size={12} className={replacingId === d.dbId ? "animate-spin" : ""} />
                  {(d.expiryState === "expired" || d.expiryState === "expiring") ? "Replace expired" : "Upload new version"}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden disabled={replacingId === d.dbId} onChange={(e) => replaceDoc(d, e.target.files?.[0])} />
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload a document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="upload" loading={saving} onClick={submit}>Upload</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Document name">
            <input className={inputClass} placeholder="e.g. Sale agreement" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            {form.category === "Other" && (
              <Field label="Enter category">
                <input className={inputClass} placeholder="Document category" value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} />
              </Field>
            )}
            <Field label="Type">
              <select className={inputClass} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                <option value="">—</option>
                <option value="agreement">Agreement</option>
                <option value="noc">NOC</option>
                <option value="tax_receipt">Tax receipt</option>
                <option value="id_proof">ID proof</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-slate-400 hover:border-brand-300 hover:text-brand-500">
            <Icon name="file-up" size={24} />
            <p className="mt-1.5 text-xs">{file ? `${file.name} (${file.size})` : "Click to attach a file — max 8 MB"}</p>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
