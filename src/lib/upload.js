// Shared image-upload helper used by every photo picker (avatars, site photos).
// One code path so callers never care whether the image ends up on S3 or inline.

import { api, API_BASE } from "@/lib/api";

// Downscale an image file to a JPEG data URL, capping the longest edge at `max`.
// Keeps stored images small (tens–hundreds of KB) whether they end up inline in
// the DB or on S3 — important at community scale, where thousands of full-res
// photos would bloat rows and slow every list fetch.
export function downscaleImage(file, max = 1280, quality = 0.85) {
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

// Upload an image file and resolve to its URL. Uploads to S3 via a presigned PUT
// when the backend reports AWS is configured; otherwise returns the downscaled
// image inline as a data URL. Callers get a URL either way and never care which
// path ran, so photo upload works with zero infra and switches to S3 the moment
// creds are set — no caller change.
export async function uploadImage(file, { max = 1280, quality = 0.85 } = {}) {
  const dataUrl = await downscaleImage(file, max, quality);
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
      // The bucket is private, so we don't store the raw S3 URL (it 403s in an
      // <img>). Instead store our backend proxy, which 302s to a short-lived
      // presigned GET each time the image is viewed.
      if (put.ok) finalUrl = `${API_BASE}/uploads/view?key=${encodeURIComponent(data.key)}`;
    }
  } catch {
    /* presign/S3 unavailable — keep the inline data URL */
  }
  return finalUrl;
}

// Upload an arbitrary document (PDF/DOCX/XLSX/…) to S3 via a presigned PUT and
// resolve to { url, key }. `url` is our private-view proxy (the bucket is
// private), so the caller stores a stable URL that resolves to a short-lived
// signed GET each time the file is opened. Unlike images there's no inline
// fallback — documents can be large — so this throws if storage isn't wired.
export async function uploadDocument(file) {
  const contentType = file.type || "application/octet-stream";
  const { data } = await api.post("/admin/documents/presign", {
    filename: file.name,
    contentType,
  });
  if (!data?.uploadUrl || !data?.key) throw new Error("File storage isn't configured");

  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!put.ok) throw new Error("Upload to storage failed");

  return { url: `${API_BASE}/uploads/view?key=${encodeURIComponent(data.key)}`, key: data.key };
}

// Human-readable file size, e.g. "2.4 MB" — used to label uploaded documents.
export function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
