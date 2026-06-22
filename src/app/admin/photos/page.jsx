"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Segmented,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const UPLOAD_CATEGORIES = ["Road work", "Street lights", "Compound wall", "Plantation", "Drainage", "Other"];

export default function AdminPhotosPage() {
  const { data: raw, reload } = useApi("/admin/photos");
  const photos = normalizeList(raw);
  const toast = useToast();
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Road work", customCategory: "", caption: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(photos.map((p) => p.category)))],
    [photos],
  );
  const filtered = photos.filter((p) => cat === "all" || p.category === cat);

  // Note: real images upload to S3 via /admin/documents/presign; this stores a
  // placeholder URL until AWS keys are configured.
  const upload = async () => {
    const category = form.category === "Other" ? form.customCategory.trim() : form.category;
    if (form.category === "Other" && !category) {
      toast("Enter the photo category", "error");
      return;
    }
    const colors = ["10b981", "0ea5e9", "f59e0b", "8b5cf6", "ef4444", "14b8a6"];
    setSaving(true);
    try {
      await api.post("/admin/photos", {
        url: `https://placehold.co/600x400/${colors[photos.length % colors.length]}/ffffff?text=${encodeURIComponent(category)}`,
        caption: form.caption.trim() || category,
        category,
      });
      toast("Photo uploaded");
      setForm({ category: "Road work", customCategory: "", caption: "" });
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Upload failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/photos/${confirmDelete.dbId}`);
      toast("Photo deleted");
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete photo", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Site Photos"
        subtitle={`${photos.length} photos documenting construction progress`}
        actions={<Button icon="upload" onClick={() => setOpen(true)}>Upload</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-1">
        <Segmented
          value={cat}
          onChange={setCat}
          options={categories.map((c) => ({
            value: c,
            label: c === "all" ? "All" : c,
            count:
              c === "all"
                ? photos.length
                : photos.filter((p) => p.category === c).length,
          }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <Card key={p.id} className="group relative overflow-hidden">
            <button
              onClick={() => setConfirmDelete(p)}
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-slate-500 opacity-0 shadow-sm transition-opacity hover:text-rose-600 group-hover:opacity-100"
              title="Delete photo"
            >
              <Icon name="trash-2" size={15} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption}
              className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="p-3">
              <Badge tone="brand">{p.category}</Badge>
              <p className="mt-2 text-sm font-medium text-slate-700">{p.caption}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Icon name="calendar" size={12} />
                {formatDate(p.date)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload site photo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={upload} loading={saving}>Upload</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <Icon name="image-up" size={28} className="text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-600">
              Drag &amp; drop or click to upload
            </p>
            <p className="text-xs text-slate-400">JPG, PNG, HEIC up to 10 MB</p>
          </div>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {UPLOAD_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          {form.category === "Other" && (
            <Field label="Enter category">
              <input className={inputClass} placeholder="e.g. Clubhouse" value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} />
            </Field>
          )}
          <Field label="Caption (optional)">
            <input className={inputClass} placeholder="Describe this photo" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete photo"
        message={`Delete "${confirmDelete?.caption}"? This removes it from the gallery.`}
      />
    </div>
  );
}
