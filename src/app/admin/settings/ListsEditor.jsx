"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, Button, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, fieldErrors } from "@/lib/api";
import { useSettings } from "@/lib/useSettings";
import { useToast } from "@/components/Toast";
import { number as vnumber, collect, hasErrors } from "@/lib/validate";

// Editable per-venture lists (Phase 6 — dynamic configuration). Each is a chip
// list except the SLA map. Saved via PUT /admin/settings { lists } — the api
// layer snake-cases the keys to match settings['lists'].
const CHIP_LISTS = [
  { key: "complaintCategories", label: "Complaint categories", hint: "Used in the complaint form & filters" },
  { key: "complaintPriorities", label: "Complaint priorities" },
  { key: "documentCategories", label: "Document categories" },
  { key: "ticketCategories", label: "Helpdesk ticket categories" },
  { key: "announcementChannels", label: "Notification channels" },
];
const DEFAULTS = {
  complaintCategories: ["Electricity", "Water", "Roads", "Drainage", "Security", "Cleaning", "Other"],
  complaintPriorities: ["low", "medium", "high", "critical"],
  documentCategories: ["Legal", "Financial", "Meeting Minutes", "Layout", "Maintenance", "Other"],
  ticketCategories: ["maintenance", "security", "electrical", "plumbing", "cleaning", "amenities", "parking", "documentation", "billing", "community", "other"],
  announcementChannels: ["in_app", "email", "whatsapp"],
  ticketSlaHours: { low: 72, medium: 24, high: 8, critical: 1 },
};

export function ListsEditor() {
  const { settings, loading } = useSettings();
  const toast = useToast();
  const [lists, setLists] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (loading || lists) return;
    const src = settings.lists || {};
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed once from live settings
    setLists({
      ...Object.fromEntries(CHIP_LISTS.map((l) => [l.key, Array.isArray(src[l.key]) ? src[l.key] : DEFAULTS[l.key]])),
      ticketSlaHours: { ...DEFAULTS.ticketSlaHours, ...(src.ticketSlaHours || {}) },
    });
  }, [loading, lists, settings.lists]);

  if (!lists) return <Card className="p-6 text-sm text-slate-400">Loading…</Card>;

  const addChip = (key, val) => {
    const v = val.trim();
    if (!v || lists[key].includes(v)) return;
    setLists({ ...lists, [key]: [...lists[key], v] });
  };
  const removeChip = (key, v) => setLists({ ...lists, [key]: lists[key].filter((x) => x !== v) });
  const setSla = (k, v) => setLists({ ...lists, ticketSlaHours: { ...lists.ticketSlaHours, [k]: Number(v) || 0 } });

  const save = async () => {
    const errs = collect(Object.fromEntries(
      ["critical", "high", "medium", "low"].map((k) => [
        `sla_${k}`, vnumber(lists.ticketSlaHours[k], { min: 0, integer: true, label: `${k} SLA` }),
      ]),
    ));
    setErrors(errs);
    if (hasErrors(errs)) { toast("Please fix the highlighted fields", "error"); return; }
    setSaving(true);
    try {
      await api.put("/admin/settings", { lists });
      setErrors({});
      toast("Lists saved");
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setErrors(fe);
      else toast(e.message || "Could not save", "error");
    }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Lists & categories" subtitle="Drive every dropdown from here — nothing hardcoded" icon="list" />
      <div className="space-y-6 p-5">
        {CHIP_LISTS.map((l) => (
          <ChipField key={l.key} label={l.label} hint={l.hint} values={lists[l.key]}
            onAdd={(v) => addChip(l.key, v)} onRemove={(v) => removeChip(l.key, v)} />
        ))}

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Helpdesk SLA (hours by priority)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["critical", "high", "medium", "low"].map((k) => (
              <Field key={k} label={k} error={errors[`sla_${k}`]}>
                <input type="number" min="0" className={inputClass} value={lists.ticketSlaHours[k] ?? 0} onChange={(e) => setSla(k, e.target.value)} />
              </Field>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button icon="save" loading={saving} onClick={save}>Save lists</Button>
        </div>
      </div>
    </Card>
  );
}

function ChipField({ label, hint, values, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const commit = () => { onAdd(input); setInput(""); };
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
            {v}
            <button onClick={() => onRemove(v)} className="text-slate-400 hover:text-rose-600"><Icon name="x" size={12} /></button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-slate-400">None</span>}
      </div>
      <div className="flex gap-2">
        <input className={`${inputClass} flex-1`} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }} placeholder="Add a value…" />
        <Button size="sm" variant="secondary" icon="plus" onClick={commit}>Add</Button>
      </div>
    </div>
  );
}
