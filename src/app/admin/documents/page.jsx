"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const catIcon = {
  Legal: "scale",
  Financial: "indian-rupee",
  "Meeting Minutes": "file-text",
  Layout: "map",
  Maintenance: "wrench",
  Other: "file",
};
const CATEGORIES = ["Legal", "Financial", "Meeting Minutes", "Layout", "Maintenance", "Other"];

// Who can see a document, with owner-friendly labels.
const VISIBILITY = {
  admin: { label: "Admin only", tone: "slate", icon: "lock" },
  owners: { label: "All owners", tone: "sky", icon: "users" },
  plot: { label: "Specific plot", tone: "violet", icon: "map-pin" },
};

const emptyForm = { name: "", category: "Legal", url: "", size: "", visibility: "owners", plotNo: "", approved: true };

export default function AdminDocumentsPage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/admin/documents");
  const documents = normalizeList(raw);
  const [filter, setFilter] = useState("all"); // visibility scope filter
  const filtered = documents.filter((d) => {
    if (filter === "all") return true;
    if (filter === "pending") return (d.visibility ?? "admin") !== "admin" && !d.approved;
    return (d.visibility ?? "admin") === filter;
  });
  const pendingCount = documents.filter((d) => (d.visibility ?? "admin") !== "admin" && !d.approved).length;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(null);

  const upload = async () => {
    if (!form.name.trim()) {
      toast("Document name is required", "error");
      return;
    }
    if (form.visibility === "plot" && !form.plotNo.trim()) {
      toast("Enter the plot number this document belongs to", "error");
      return;
    }
    setSaving(true);
    try {
      // Real files upload to S3 via /admin/documents/presign once AWS keys are
      // set; until then we store the provided link (or a placeholder) as metadata.
      await api.post("/admin/documents", {
        name: form.name.trim(),
        category: form.category,
        url: form.url.trim() || "#",
        size: form.size.trim() || "—",
        visibility: form.visibility,
        plotNo: form.visibility === "plot" ? form.plotNo.trim() : null,
        // Admin-only docs are never owner-facing, so approval is moot there.
        approved: form.visibility === "admin" ? false : form.approved,
      });
      toast(`${form.name.trim()} added`);
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not add document", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/documents/${confirmDelete.dbId}`);
      toast(`${confirmDelete.name} deleted`);
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete document", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Gate owners' access — flip the approval flag.
  const toggleApprove = async (d) => {
    setApproving(d.id);
    try {
      const next = !d.approved;
      await api.post(`/admin/documents/${d.dbId}/approve`, { approved: next });
      toast(next ? `${d.name} approved for owners` : `${d.name} hidden from owners`);
      reload();
    } catch (e) {
      toast(e.message || "Could not update approval", "error");
    } finally {
      setApproving(null);
    }
  };

  const openFile = (d) => {
    if (d.url && d.url !== "#") {
      window.open(d.url, "_blank", "noopener,noreferrer");
    } else {
      toast("No file is attached to this document", "info");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Documents"
        subtitle="Association records · control who can view each one"
        actions={<Button icon="upload" onClick={() => { setForm(emptyForm); setOpen(true); }}>Upload document</Button>}
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: documents.length },
              { value: "owners", label: "All owners" },
              { value: "plot", label: "Plot-specific" },
              { value: "admin", label: "Admin only" },
              { value: "pending", label: "Pending approval", count: pendingCount },
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="folder-open" title="No documents here" subtitle="Upload a document or pick another filter." />
        ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Visibility</Th>
              <Th>Owner access</Th>
              <Th>Date</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const vis = VISIBILITY[d.visibility ?? "admin"];
              const ownerFacing = (d.visibility ?? "admin") !== "admin";
              return (
              <Tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name={catIcon[d.category] ?? "file"} size={15} />
                    </span>
                    <span>
                      <span className="block font-medium text-slate-800">{d.name}</span>
                      <span className="block text-xs text-slate-400">{d.size} · {d.uploadedBy}</span>
                    </span>
                  </div>
                </Td>
                <Td>
                  <Badge tone="slate">{d.category}</Badge>
                </Td>
                <Td>
                  <Badge tone={vis.tone}>
                    <Icon name={vis.icon} size={11} /> {vis.label}{d.visibility === "plot" && d.plotNo ? ` · ${d.plotNo}` : ""}
                  </Badge>
                </Td>
                <Td>
                  {ownerFacing ? (
                    <button
                      onClick={() => toggleApprove(d)}
                      disabled={approving === d.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${d.approved ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                      title={d.approved ? "Approved — click to hide from owners" : "Pending — click to approve"}
                    >
                      <Icon name={approving === d.id ? "loader-circle" : d.approved ? "circle-check-big" : "clock"} size={12} className={approving === d.id ? "animate-spin" : ""} />
                      {d.approved ? "Approved" : "Approve"}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </Td>
                <Td className="text-slate-500">{formatDate(d.date)}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => openFile(d)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" title="Open">
                      <Icon name="eye" size={15} />
                    </button>
                    <button onClick={() => setConfirmDelete(d)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                      <Icon name="trash-2" size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
              );
            })}
          </tbody>
        </Table>
        )}
      </Card>

      {/* Upload / add document */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="upload" loading={saving} onClick={upload}>Save document</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
            <Icon name="file-up" size={26} className="text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-600">Drag &amp; drop or paste a link below</p>
            <p className="text-xs text-slate-400">PDF, DOCX, XLSX up to 25 MB</p>
          </div>
          <Field label="Document name">
            <input className={inputClass} placeholder="e.g. Society bylaws 2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Size (optional)">
              <input className={inputClass} placeholder="e.g. 2.4 MB" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            </Field>
          </div>
          <Field label="File link (optional)" hint="Paste a shareable URL until file storage is configured">
            <input className={inputClass} placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </Field>

          {/* Visibility + approval */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Who can view this?">
                <select className={inputClass} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
                  <option value="admin">Admin only (private)</option>
                  <option value="owners">All owners (association-wide)</option>
                  <option value="plot">A specific plot owner</option>
                </select>
              </Field>
              {form.visibility === "plot" && (
                <Field label="Plot number">
                  <input className={inputClass} placeholder="e.g. P-047" value={form.plotNo} onChange={(e) => setForm({ ...form, plotNo: e.target.value })} />
                </Field>
              )}
            </div>
            {form.visibility !== "admin" && (
              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={form.approved} onChange={(e) => setForm({ ...form, approved: e.target.checked })} />
                <span>
                  Approve for owners immediately
                  <span className="block text-xs text-slate-400">Leave unchecked to keep it hidden until you approve it later. Owners only ever see approved documents.</span>
                </span>
              </label>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete document"
        message={`Delete "${confirmDelete?.name}"? It will be removed from the records list.`}
      />
    </div>
  );
}
