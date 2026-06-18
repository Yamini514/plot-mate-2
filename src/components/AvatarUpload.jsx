"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";

// Downscale an image file to a small square-ish JPEG data URL. Keeps stored
// photos tiny (tens of KB) whether they end up inline in the DB or on S3 —
// important at community scale, where thousands of full-res photos would bloat
// rows and slow every list fetch.
function downscaleToDataURL(file, max = 256, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Circular photo picker. `value` is the current URL (data: or https:), `onChange`
 * receives the new URL string. Uploads to S3 when the backend says it's wired,
 * otherwise stores the downscaled image inline as a data URL — same `value`
 * either way, so callers never care which path ran.
 */
export function AvatarUpload({ value, onChange, name = "", size = 80, label = "Photo" }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image (PNG/JPG)", "error");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await downscaleToDataURL(file);
      let finalUrl = dataUrl; // inline fallback (works with no storage infra)
      try {
        const { data } = await api.post("/admin/uploads/presign", { contentType: "image/jpeg" });
        if (data?.configured && data.uploadUrl) {
          const blob = await (await fetch(dataUrl)).blob();
          const put = await fetch(data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          if (put.ok) finalUrl = data.publicUrl;
        }
      } catch {
        /* presign/S3 unavailable — keep the inline data URL */
      }
      onChange(finalUrl);
    } catch {
      toast("Couldn't process that image", "error");
    } finally {
      setBusy(false);
    }
  };

  const initials = (name || "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700"
        style={{ width: size, height: size, fontSize: size * 0.34 }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={name || "photo"} className="h-full w-full object-cover" />
        ) : (
          initials || <Icon name="user" size={size * 0.5} />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/60">
            <Icon name="loader-circle" size={size * 0.4} className="animate-spin text-brand-600" />
          </span>
        )}
      </div>
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            pick(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-50"
          >
            <Icon name="upload" size={14} /> {value ? "Change" : `Upload ${label.toLowerCase()}`}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              <Icon name="x" size={14} /> Remove
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">PNG or JPG · auto-resized to a thumbnail.</p>
      </div>
    </div>
  );
}
