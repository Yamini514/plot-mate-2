"use client";

import { useState } from "react";
import { PageHeader, Card, Badge, EmptyState, Button, Modal, Field, inputClass, ConfirmDialog } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { cn, formatDate } from "@/lib/utils";

const EMPTY_FEATURE = { key: "", label: "", description: "", defaultOn: true, navHrefs: "" };

const STATUS_TONE = { active: "green", suspended: "rose" };

function Switch({ on, busy, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
        on ? "bg-brand-600" : "bg-slate-300",
      )}
    >
      <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export default function FeaturesPage() {
  const toast = useToast();
  const { data, loading, reload } = useApi("/super/features");
  const features = data?.features ?? [];
  const ventures = data?.ventures ?? [];

  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState(null);

  // Catalogue management (add / edit / remove feature definitions).
  const [editor, setEditor] = useState(null); // { feature } or { } for new
  const [form, setForm] = useState(EMPTY_FEATURE);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const openNew = () => { setForm(EMPTY_FEATURE); setEditor({}); };
  const openEdit = (f) => {
    setForm({ key: f.key, label: f.label, description: f.description ?? "", defaultOn: !!f.defaultOn, navHrefs: (f.navHrefs ?? []).join(", ") });
    setEditor({ feature: f });
  };

  const saveFeature = async () => {
    if (!form.label.trim() || (!editor.feature && !form.key.trim())) return toast("Key and label are required", "error");
    setSaving(true);
    const payload = { label: form.label.trim(), description: form.description.trim() || null, defaultOn: form.defaultOn,
      navHrefs: form.navHrefs.split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      if (editor.feature) await api.put(`/super/features/catalogue/${editor.feature.id}`, payload);
      else await api.post("/super/features/catalogue", { ...payload, key: form.key.trim() });
      toast(editor.feature ? "Feature updated" : "Feature added");
      setEditor(null); reload();
    } catch (e) { toast(e.message || "Could not save", "error"); }
    finally { setSaving(false); }
  };

  const removeFeature = async () => {
    try { await api.del(`/super/features/catalogue/${confirmDel.id}`); toast("Feature removed"); setConfirmDel(null); reload(); }
    catch (e) { toast(e.message || "Could not remove", "error"); }
  };

  const selected = ventures.find((v) => v.id === selectedId) || ventures[0] || null;
  const filtered = ventures.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = async (featureKey, next) => {
    if (!selected) return;
    setBusyKey(featureKey);
    try {
      await api.post(`/super/features/${selected.id}/toggle`, { feature: featureKey, enabled: next });
      toast(`${next ? "Enabled" : "Disabled"} ${featureKey.replace(/_/g, " ")}`);
      reload();
    } catch (e) {
      toast(e.message || "Could not update feature", "error");
    } finally { setBusyKey(null); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Feature management" subtitle="Enable or disable modules per venture"
        actions={<Button icon="plus" onClick={openNew}>Add feature</Button>} />

      {loading && !data ? (
        <Card className="p-10 text-center text-slate-400">
          <Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…
        </Card>
      ) : ventures.length === 0 ? (
        <EmptyState icon="building-2" title="No ventures" subtitle="Feature toggles appear once ventures exist." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Venture picker */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
                  placeholder="Search ventures"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {filtered.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border-b border-slate-50 px-4 py-3 text-left text-sm transition-colors",
                      selected?.id === v.id ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="truncate font-medium">{v.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {Object.values(v.features).filter((f) => f.on).length}/{features.length}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="p-4 text-center text-sm text-slate-400">No matches.</li>}
            </ul>
          </Card>

          {/* Feature toggles for the selected venture */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">{selected?.name}</h2>
                <p className="text-xs text-slate-400">Toggle modules available to this venture</p>
              </div>
              {selected && <Badge tone={STATUS_TONE[selected.status] ?? "slate"}>{selected.status}</Badge>}
            </div>
            <ul className="divide-y divide-slate-100">
              {features.map((f) => {
                const state = selected?.features?.[f.key] || {};
                return (
                  <li key={f.key} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{f.label} <span className="ml-1 font-mono text-xs text-slate-400">{f.key}</span></p>
                      <p className="text-xs text-slate-400">{f.description}</p>
                      {(f.navHrefs ?? []).length > 0 && (
                        <p className="mt-0.5 text-xs text-slate-400">Gates: {f.navHrefs.join(", ")}</p>
                      )}
                      {state.enabledAt && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {state.on ? "Enabled" : "Disabled"} · {formatDate(state.enabledAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button title="Edit feature" onClick={() => openEdit(f)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Icon name="pencil" size={14} /></button>
                      <button title="Remove feature" onClick={() => setConfirmDel(f)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash-2" size={14} /></button>
                      <Switch on={!!state.on} busy={busyKey === f.key} onChange={(next) => toggle(f.key, next)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.feature ? `Edit · ${editor.feature.label}` : "Add feature"}
        footer={<><Button variant="secondary" onClick={() => setEditor(null)}>Cancel</Button><Button icon="check" loading={saving} onClick={saveFeature}>{editor?.feature ? "Save" : "Add"}</Button></>}>
        <div className="space-y-3">
          {!editor?.feature && (
            <Field label="Key" hint="Lowercase id, e.g. marketplace. Used by route guards — can't change later.">
              <input className={inputClass} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. events" />
            </Field>
          )}
          <Field label="Label"><input className={inputClass} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Events Module" /></Field>
          <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Gated nav links" hint="Comma-separated venture-admin hrefs to hide when off, e.g. /admin/events">
            <input className={inputClass} value={form.navHrefs} onChange={(e) => setForm({ ...form, navHrefs: e.target.value })} placeholder="/admin/events" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.defaultOn} onChange={(e) => setForm({ ...form, defaultOn: e.target.checked })} />
            On by default for new ventures
          </label>
          <p className="text-xs text-slate-400">Note: backend route enforcement applies to built-in keys (maintenance, complaints, visitors, facility_booking). New keys gate the nav links you list above.</p>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={removeFeature}
        title="Remove feature" message={`Remove "${confirmDel?.label}" from the catalogue? Ventures will no longer see this toggle.`} />
    </div>
  );
}
