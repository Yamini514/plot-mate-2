"use client";

import { useMemo, useState } from "react";
import { Modal, Button, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { cn, expandPlotNumbers } from "@/lib/utils";

// Bulk-create empty (available, unowned) plots from the numbers printed on an
// uploaded site plan — e.g. "1-134, 01-08". The numbers are parsed live so the
// admin sees exactly what will be created before committing. New plots appear in
// the "Register owner" selector immediately (flagged "not mapped" until drawn).
const MAX = 2000;

export function GeneratePlotsModal({ open, onClose, onDone, existingPlotNos }) {
  const toast = useToast();
  const [spec, setSpec] = useState("");
  const [prefix, setPrefix] = useState("");
  const [phase, setPhase] = useState("Phase 1");
  const [size, setSize] = useState("");
  const [saving, setSaving] = useState(false);

  const numbers = useMemo(() => expandPlotNumbers(spec, prefix.trim()), [spec, prefix]);
  const fresh = useMemo(
    () => numbers.filter((n) => !existingPlotNos?.has(n)),
    [numbers, existingPlotNos],
  );
  const dupes = numbers.length - fresh.length;
  const tooMany = fresh.length > MAX;

  const reset = () => {
    setSpec("");
    setPrefix("");
    setSize("");
  };

  const submit = async () => {
    if (fresh.length === 0) {
      toast("Nothing new to add — these plot numbers already exist", "error");
      return;
    }
    if (tooMany) {
      toast(`Too many at once (max ${MAX}). Split into batches.`, "error");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/admin/plots/generate", {
        plotNos: fresh,
        phase: phase || null,
        sizeSqyd: size ? Number(size) : null,
      });
      toast(
        `Added ${data.created} plot${data.created === 1 ? "" : "s"}` +
          (data.skipped ? ` · ${data.skipped} already existed` : ""),
      );
      reset();
      onDone?.();
      onClose();
    } catch (e) {
      toast(e.message || "Could not add plots", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add plots from your map"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!fresh.length || tooMany}>
            Add {fresh.length || ""} plot{fresh.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Type the plot numbers shown on your uploaded plan. This creates empty
          (available, unowned) plots you can then register owners against.
        </p>

        <Field label="Plot numbers (ranges or list)">
          <textarea
            autoFocus
            className={cn(inputClass, "h-24 resize-y py-2")}
            placeholder="e.g. 1-134, 01-08"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
          />
        </Field>
        <p className="-mt-2 text-xs text-slate-400">
          Use ranges like <b>1-134</b> and lists like <b>01, 02, 08</b>, separated by commas or new lines.
          Leading zeros are kept (01–08 → 01…08).
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Prefix (optional)">
            <input className={inputClass} placeholder="e.g. P-" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </Field>
          <Field label="Phase">
            <select className={inputClass} value={phase} onChange={(e) => setPhase(e.target.value)}>
              <option>Phase 1</option>
              <option>Phase 2</option>
              <option>Phase 3</option>
            </select>
          </Field>
          <Field label="Default size (sqyd)">
            <input type="number" min="0" className={inputClass} placeholder="optional" value={size} onChange={(e) => setSize(e.target.value)} />
          </Field>
        </div>

        {numbers.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">
              {fresh.length} new plot{fresh.length === 1 ? "" : "s"}
              {dupes > 0 && <span className="font-normal text-slate-400"> · {dupes} already exist (skipped)</span>}
            </p>
            {fresh.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {fresh.slice(0, 30).join(", ")}
                {fresh.length > 30 ? ` … (+${fresh.length - 30} more)` : ""}
              </p>
            )}
            {tooMany && <p className="mt-1 text-xs text-rose-500">Too many at once — max {MAX}. Split into batches.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
