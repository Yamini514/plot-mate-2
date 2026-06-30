"use client";

import { useMemo, useRef, useState } from "react";
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
import { api, normalizeList, fieldErrors } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { uploadImage } from "@/lib/upload";
import { presence, collect, hasErrors } from "@/lib/validate";

const UPLOAD_CATEGORIES = ["Road work", "Street lights", "Compound wall", "Plantation", "Drainage", "Other"];

export default function AdminPhotosPage() {
  const { data: raw, reload } = useApi("/admin/photos");
  const photos = normalizeList(raw);
  const toast = useToast();
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Road work", customCategory: "", caption: "" });
  const [errors, setErrors] = useState({});
  const [imageUrl, setImageUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef(null);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(photos.map((p) => p.category)))],
    [photos],
  );
  const filtered = photos.filter((p) => cat === "all" || p.category === cat);

  const resetForm = () => {
    setForm({ category: "Road work", customCategory: "", caption: "" });
    setErrors({});
    setImageUrl("");
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  // Process the chosen file to a URL up front (S3 when configured, inline data
  // URL otherwise) so the modal can preview it before the row is saved.
  const pickImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image (JPG/PNG)", "error");
      return;
    }
    setProcessing(true);
    try {
      setImageUrl(await uploadImage(file));
    } catch {
      toast("Couldn't process that image", "error");
    } finally {
      setProcessing(false);
    }
  };

  const upload = async () => {
    const category = form.category === "Other" ? form.customCategory.trim() : form.category;
    const errs = collect({
      customCategory: form.category === "Other" ? presence(category, "Category") : "",
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    if (!imageUrl) {
      toast("Choose an image to upload", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/photos", {
        url: imageUrl,
        caption: form.caption.trim() || category,
        category,
      });
      toast("Photo uploaded");
      closeModal();
      reload();
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setErrors(fe);
      else toast(e.message || "Upload failed", "error");
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
        actions={<Button icon="upload" onClick={() => { resetForm(); setOpen(true); }}>Upload</Button>}
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
        onClose={closeModal}
        title="Upload site photo"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={upload} loading={saving} disabled={processing || !imageUrl}>Upload</Button>
          </>
        }
      >
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              pickImage(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={processing}
            className="relative grid w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-brand-400 disabled:opacity-60"
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Selected" className="max-h-48 w-full rounded-lg object-contain" />
            ) : (
              <>
                <Icon name="image-up" size={28} className="text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-600">Click to choose a photo</p>
                <p className="text-xs text-slate-400">JPG or PNG · auto-resized</p>
              </>
            )}
            {processing && (
              <span className="absolute inset-0 grid place-items-center bg-white/60">
                <Icon name="loader-circle" size={28} className="animate-spin text-brand-600" />
              </span>
            )}
          </button>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {UPLOAD_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          {form.category === "Other" && (
            <Field label="Enter category" required error={errors.customCategory}>
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
