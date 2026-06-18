"use client";

import { useState } from "react";
import { Modal, Button } from "./ui";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

/**
 * Share-options dialog. On devices that support the Web Share API it offers the
 * native share sheet; everywhere it also lists explicit options (WhatsApp,
 * Email, SMS, Copy) so the user always sees choices.
 */
export function ShareModal({ open, onClose, title = "Share", shareTitle, text = "", url = "", getFile }) {
  const toast = useToast();
  // navigator.share only exists in some browsers. Safe to read lazily here: the
  // dialog renders nothing until opened (after hydration), so there's no
  // SSR/CSR mismatch from the server-side `false`.
  const [canNative] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
  );
  const [busy, setBusy] = useState(false);

  const full = url ? `${text} ${url}`.trim() : text;

  const nativeShare = async () => {
    setBusy(true);
    try {
      // Prefer sharing the image (QR) itself when the platform supports files.
      if (getFile && typeof navigator.canShare === "function") {
        const file = await getFile();
        if (file && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: shareTitle || title, text, files: [file] });
          onClose();
          return;
        }
      }
      await navigator.share({ title: shareTitle || title, text, url: url || undefined });
      onClose();
    } catch {
      // user cancelled or share failed — keep the dialog open
    } finally {
      setBusy(false);
    }
  };

  const downloadImage = async () => {
    if (!getFile) return;
    setBusy(true);
    try {
      const file = await getFile();
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(href);
      toast("QR image saved");
      onClose();
    } catch {
      toast("Could not prepare the image", "error");
    } finally {
      setBusy(false);
    }
  };

  const openUrl = (href) => {
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      toast("Copied to clipboard");
      onClose();
    } catch {
      toast("Could not copy", "error");
    }
  };

  const options = [
    { label: "WhatsApp", icon: "message-circle", onClick: () => openUrl(`https://wa.me/?text=${encodeURIComponent(full)}`) },
    { label: "Email", icon: "mail", onClick: () => openUrl(`mailto:?subject=${encodeURIComponent(shareTitle || title)}&body=${encodeURIComponent(full)}`) },
    { label: "SMS", icon: "smartphone", onClick: () => openUrl(`sms:?&body=${encodeURIComponent(full)}`) },
    { label: "Copy text", icon: "copy", onClick: copy },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        {text && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{text}</div>
        )}

        {canNative && (
          <Button icon="share-2" className="w-full" loading={busy} onClick={nativeShare}>
            {getFile ? "Share QR via apps…" : "Share via apps…"}
          </Button>
        )}

        {getFile && (
          <Button variant="secondary" icon="image-down" className="w-full" loading={busy} onClick={downloadImage}>
            Save QR image
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {options.map((o) => (
            <button
              key={o.label}
              onClick={o.onClick}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <Icon name={o.icon} size={16} />
              </span>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
