"use client";

import { useEffect, useState } from "react";
import { Modal, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

// The three real delivery channels the backend understands, plus an "All"
// convenience that fans out to every channel at once.
export const REMINDER_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", icon: "message-circle", hint: "Instant chat message" },
  { id: "sms", label: "SMS", icon: "smartphone", hint: "Text to mobile" },
  { id: "email", label: "Email", icon: "mail", hint: "To registered email" },
];

/**
 * Confirmation dialog shown before any reminder goes out. The admin must pick at
 * least one channel (or "All") and confirm — nothing is sent on the first click.
 *
 *   onConfirm(channels: string[]) — receives the resolved list of channel ids.
 */
export function SendReminderModal({ open, onClose, onConfirm, title = "Send reminder", recipientLabel, amountLabel, sending = false, defaultChannels = ["whatsapp"], confirmLabel }) {
  const [selected, setSelected] = useState(() => new Set(defaultChannels));

  // Reset to the intended default channels each time the dialog opens so a fresh
  // confirmation never carries a stale selection from a previous recipient.
  const defaultKey = defaultChannels.join(",");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed channels on open
    if (open) setSelected(new Set(defaultKey ? defaultKey.split(",") : []));
  }, [open, defaultKey]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = REMINDER_CHANNELS.every((c) => selected.has(c.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(REMINDER_CHANNELS.map((c) => c.id)));

  const channels = [...selected];
  const confirm = () => channels.length && onConfirm(channels);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button icon="send" loading={sending} disabled={channels.length === 0} onClick={confirm}>
            {confirmLabel || (channels.length > 1 ? `Send via ${channels.length} channels` : "Send reminder")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {(recipientLabel || amountLabel) && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
            {recipientLabel && (
              <span className="font-medium text-slate-700">{recipientLabel}</span>
            )}
            {amountLabel && (
              <span className="font-semibold text-amber-600">{amountLabel}</span>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Choose channels</p>
            <button
              type="button"
              onClick={toggleAll}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                allSelected ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              )}
            >
              {allSelected ? "All selected" : "Select all"}
            </button>
          </div>
          <div className="space-y-2">
            {REMINDER_CHANNELS.map((c) => {
              const on = selected.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    on ? "border-brand-300 bg-brand-50" : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <span className={cn("grid h-9 w-9 place-items-center rounded-lg", on ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
                    <Icon name={c.icon} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800">{c.label}</span>
                    <span className="block text-xs text-slate-400">{c.hint}</span>
                  </span>
                  <span className={cn("grid h-5 w-5 place-items-center rounded-md border", on ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300")}>
                    {on && <Icon name="check" size={13} />}
                  </span>
                </button>
              );
            })}
          </div>
          {channels.length === 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
              <Icon name="triangle-alert" size={13} /> Pick at least one channel to send.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
