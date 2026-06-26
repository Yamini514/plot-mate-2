"use client";

import { useMemo, useState } from "react";
import { Modal, Button, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { cn, expandPlotNumbers } from "@/lib/utils";

// Review screen for AI-detected plots. The page runs the vision scan and hands
// the result here; the admin corrects any misreads per phase before anything is
// created. Detection is best-effort, so editing + the duplicate-skip are the
// safety net. Confirming creates empty (available, unowned) plots per phase via
// the same /admin/plots/generate endpoint the manual flow uses.
export function DetectPlotsModal({ open, loading, result, existingPlotNos, onClose, onCreated }) {
  const toast = useToast();
  const [groups, setGroups] = useState([]); // [{ phase, text }]
  const [saving, setSaving] = useState(false);
  // Re-seed the editable groups whenever a fresh detection result arrives. This
  // is React's "adjust state during render" pattern (guarded so it runs once per
  // new result), which avoids a setState-in-effect cascade.
  const [seededFor, setSeededFor] = useState(null);
  if (result !== seededFor) {
    setSeededFor(result);
    setGroups(
      (result?.phases ?? []).map((p) => ({
        phase: p.phase || "Unphased",
        text: (p.numbers || []).join(", "),
      })),
    );
  }

  // Parse every group's text → numbers; dedupe across groups AND against plots
  // already on file, so the counts shown are exactly what will be created.
  const parsed = useMemo(() => {
    const seen = new Set();
    return groups.map((g) => {
      const all = expandPlotNumbers(g.text);
      const fresh = all.filter((n) => !existingPlotNos?.has(n) && !seen.has(n));
      fresh.forEach((n) => seen.add(n));
      return { all, fresh };
    });
  }, [groups, existingPlotNos]);

  const totalFresh = parsed.reduce((s, g) => s + g.fresh.length, 0);
  const totalDupes = parsed.reduce((s, g) => s + (g.all.length - g.fresh.length), 0);

  const setText = (i, text) => setGroups((gs) => gs.map((g, j) => (j === i ? { ...g, text } : g)));
  const setPhase = (i, phase) => setGroups((gs) => gs.map((g, j) => (j === i ? { ...g, phase } : g)));

  const create = async () => {
    if (totalFresh === 0) {
      toast("Nothing new to create", "error");
      return;
    }
    setSaving(true);
    try {
      let created = 0;
      for (let i = 0; i < groups.length; i++) {
        const fresh = parsed[i]?.fresh ?? [];
        if (!fresh.length) continue;
        const { data } = await api.post("/admin/plots/generate", {
          plotNos: fresh,
          phase: groups[i].phase || null,
        });
        created += data.created;
      }
      toast(`Created ${created} plot${created === 1 ? "" : "s"} from the map`);
      onCreated?.();
      onClose();
    } catch (e) {
      toast(e.message || "Could not create plots", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Plots detected from your map"
      footer={
        !loading && (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={create} loading={saving} disabled={!totalFresh}>
              Create {totalFresh || ""} plot{totalFresh === 1 ? "" : "s"}
            </Button>
          </>
        )
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon name="loader-circle" size={28} className="animate-spin text-brand-500" />
          <p className="mt-3 text-sm font-medium text-slate-700">Reading plot numbers from your map…</p>
          <p className="mt-1 text-xs text-slate-400">This can take a few seconds.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {result?.mock && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <Icon name="flask-conical" size={15} className="mt-0.5 shrink-0" />
              <span>
                <b>Sample data</b> — this is a demo, not your real map. Set <code>ANTHROPIC_API_KEY</code> on the
                server to scan the actual uploaded image. You can still edit and create these plots to try the flow.
              </span>
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-600">
              <b>{totalFresh}</b> new plot{totalFresh === 1 ? "" : "s"} across <b>{groups.length}</b> phase{groups.length === 1 ? "" : "s"}
            </span>
            {totalDupes > 0 && <span className="text-xs text-slate-400">{totalDupes} already exist (skipped)</span>}
          </div>

          <p className="text-xs text-slate-400">
            Detection is best-effort — review and fix any misread numbers before creating. Ranges like <b>1-12</b> work in each box too.
          </p>

          {groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No plot numbers were detected. Try the manual “Add plots” option instead.
            </p>
          ) : (
            groups.map((g, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    className={cn(inputClass, "h-8 w-44 text-sm font-medium")}
                    value={g.phase}
                    onChange={(e) => setPhase(i, e.target.value)}
                    placeholder="Phase name"
                  />
                  <span className="text-xs text-slate-400">{parsed[i]?.fresh.length ?? 0} new</span>
                </div>
                <textarea
                  className={cn(inputClass, "h-20 resize-y py-2 text-sm")}
                  value={g.text}
                  onChange={(e) => setText(i, e.target.value)}
                />
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
