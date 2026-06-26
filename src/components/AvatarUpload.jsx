"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { uploadImage } from "@/lib/upload";

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
      // Avatars stay tiny — cap the longest edge at 256px.
      onChange(await uploadImage(file, { max: 256, quality: 0.82 }));
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
