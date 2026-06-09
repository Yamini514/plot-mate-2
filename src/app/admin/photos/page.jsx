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
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useStore, newId } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const UPLOAD_CATEGORIES = ["Road work", "Street lights", "Compound wall", "Plantation", "Drainage", "Other"];

export default function AdminPhotosPage() {
  const { photos, addPhoto } = useStore();
  const toast = useToast();
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Road work", caption: "" });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(photos.map((p) => p.category)))],
    [photos],
  );
  const filtered = photos.filter((p) => cat === "all" || p.category === cat);

  const upload = () => {
    const colors = ["10b981", "0ea5e9", "f59e0b", "8b5cf6", "ef4444", "14b8a6"];
    addPhoto({
      id: newId("IMG"),
      url: `https://placehold.co/600x400/${colors[photos.length % colors.length]}/ffffff?text=${encodeURIComponent(form.category)}`,
      caption: form.caption.trim() || form.category,
      category: form.category,
      date: "2025-06-09",
    });
    toast("Photo uploaded");
    setForm({ category: "Road work", caption: "" });
    setOpen(false);
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
          <Card key={p.id} className="group overflow-hidden">
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
            <Button onClick={upload}>Upload</Button>
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
          <Field label="Caption (optional)">
            <input className={inputClass} placeholder="Describe this photo" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
