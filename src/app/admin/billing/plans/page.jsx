"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  Button,
  Badge,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { FREQUENCIES, PROPERTY_TYPES, FEE_CATEGORIES, feeCategory } from "@/lib/billing-data";
import { api, normalizeList, fieldErrors } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR } from "@/lib/utils";
import { presence, number as vnumber, collect, hasErrors } from "@/lib/validate";

const freqLabel = (v) => FREQUENCIES.find((f) => f.value === v)?.label ?? v;

// Category tone → icon-tile colour (mirrors the Badge tone palette).
const TILE_TONES = {
  brand: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-600",
};

export default function MaintenancePlans() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/admin/billing/plans");
  const rows = normalizeList(raw);
  const [catFilter, setCatFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState("maintenance");
  const [types, setTypes] = useState(PROPERTY_TYPES);
  const [errors, setErrors] = useState({});

  // Per-category counts for the filter chips; only show chips that have fees
  // (plus an always-present "All"), so the strip stays relevant as it scales.
  const catCounts = rows.reduce((acc, p) => {
    const k = p.category || "maintenance";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const visibleCats = FEE_CATEGORIES.filter((c) => catCounts[c.value]);
  const filtered = catFilter === "all" ? rows : rows.filter((p) => (p.category || "maintenance") === catFilter);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setCategory(catFilter === "all" ? "maintenance" : catFilter);
    setTypes(PROPERTY_TYPES);
    setErrors({});
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setCategory(p.category || "maintenance");
    setTypes(p.propertyTypes);
    setErrors({});
    setOpen(true);
  };

  const toggleActive = async (p) => {
    setBusyId(p.id);
    try {
      await api.put(`/admin/billing/plans/${p.dbId}`, { active: !p.active });
      toast(`${p.name} ${p.active ? "deactivated" : "activated"}`);
      reload();
    } catch (e) {
      toast(e.message || "Could not update plan", "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/billing/plans/${confirmDelete.dbId}`);
      toast(`${confirmDelete.name} deleted`);
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete plan", "error");
    } finally {
      setDeleting(false);
    }
  };

  const toggleType = (t) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const errs = collect({
      name: presence(f.get("name"), "Fee name"),
      amount: vnumber(f.get("amount"), { positive: true, label: "Amount" }),
      category: presence(f.get("category"), "Fee category"),
      frequency: presence(f.get("frequency"), "Frequency"),
      lateFeeAmount: vnumber(f.get("lateFeeAmount"), { min: 0, label: "Late fee amount" }),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    const data = {
      name: f.get("name") || "Untitled fee",
      description: f.get("description") || "",
      category: f.get("category") || "maintenance",
      amount: Number(f.get("amount")) || 0,
      frequency: f.get("frequency"),
      dueDay: Number(f.get("dueDay")) || 1,
      lateFeeType: f.get("lateFeeType"),
      lateFeeAmount: Number(f.get("lateFeeAmount")) || 0,
      propertyTypes: types,
      autoInvoice: f.get("autoInvoice") === "on",
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/billing/plans/${editing.dbId}`, data);
        toast(`${data.name} updated`);
      } else {
        await api.post("/admin/billing/plans", { ...data, active: true });
        toast(`${data.name} created`);
      }
      setOpen(false);
      reload();
    } catch (err) {
      const fe = fieldErrors(err);
      if (hasErrors(fe)) setErrors(fe);
      else toast(err.message || "Could not save plan", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/admin/billing" }, { label: "Billing" }, { label: "Charges & Fees" }]} />
      <PageHeader
        title="Charges & Fees"
        subtitle="Maintenance, corpus funds, transfer & NOC, penalties, water, amenities — every charge your community bills"
        actions={<Button icon="plus" onClick={openCreate}>New fee</Button>}
      />

      {/* Category filter strip — scales as more fee types are added */}
      {rows.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <CatChip active={catFilter === "all"} onClick={() => setCatFilter("all")} icon="layout-grid" label="All" count={rows.length} />
          {visibleCats.map((c) => (
            <CatChip key={c.value} active={catFilter === c.value} onClick={() => setCatFilter(c.value)} icon={c.icon} label={c.label} count={catCounts[c.value]} />
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          No fees in this category yet. Click <span className="font-medium text-slate-600">New fee</span> to add one.
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${TILE_TONES[feeCategory(p.category).tone]}`}>
                  <Icon name={feeCategory(p.category).icon} size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-400">{p.id}</p>
                </div>
              </div>
              <Badge tone={p.active ? "green" : "slate"}>{p.active ? "Active" : "Inactive"}</Badge>
            </div>

            <div className="mt-3">
              <Badge tone={feeCategory(p.category).tone}>
                <Icon name={feeCategory(p.category).icon} size={11} /> {feeCategory(p.category).label}
              </Badge>
            </div>

            <p className="mt-3 line-clamp-2 text-xs text-slate-500">{p.description}</p>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-slate-900">{formatINR(p.amount)}</p>
                <p className="text-xs text-slate-400">{freqLabel(p.frequency)} · due day {p.dueDay}</p>
              </div>
              {p.autoInvoice && (
                <Badge tone="sky"><Icon name="repeat" size={11} /> Auto</Badge>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.propertyTypes.map((t) => (
                <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{t}</span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Icon name="users" size={13} /> {p.subscribers} subscribers
              </span>
              <span>
                Late fee: {p.lateFeeType === "percentage" ? `${p.lateFeeAmount}%` : formatINR(p.lateFeeAmount)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" variant="secondary" icon="pencil" className="flex-1" onClick={() => openEdit(p)}>Edit</Button>
              <Button size="sm" variant="ghost" icon={p.active ? "pause" : "play"} loading={busyId === p.id} onClick={() => toggleActive(p)}>
                {p.active ? "Pause" : "Activate"}
              </Button>
              <Button size="sm" variant="ghost" icon="trash-2" onClick={() => setConfirmDelete(p)} title="Delete plan" />
            </div>
          </Card>
        ))}
      </div>
      )}

      {/* Create / edit modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit · ${editing.name}` : "New fee"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="plan-form" icon="check" loading={saving}>{editing ? "Save changes" : "Create fee"}</Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Fee category" error={errors.category}>
              <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {FEE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <Icon name={feeCategory(category).icon} size={12} /> {feeCategory(category).hint}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Field label="Fee name" error={errors.name}>
              <input name="name" required defaultValue={editing?.name} className={inputClass} placeholder="e.g. Monthly Maintenance, Plot Transfer Fee" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <input name="description" defaultValue={editing?.description} className={inputClass} placeholder="Short description" />
            </Field>
          </div>
          <Field label="Amount (₹)" error={errors.amount}>
            <input name="amount" type="number" min="0" required defaultValue={editing?.amount} className={inputClass} placeholder="2500" />
          </Field>
          <Field label="Frequency" error={errors.frequency}>
            <select name="frequency" defaultValue={editing?.frequency ?? "monthly"} className={inputClass}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Due day of period">
            <input name="dueDay" type="number" min="1" max="28" defaultValue={editing?.dueDay ?? 1} className={inputClass} />
          </Field>
          <Field label="Late fee type">
            <select name="lateFeeType" defaultValue={editing?.lateFeeType ?? "fixed"} className={inputClass}>
              <option value="fixed">Fixed (₹)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </Field>
          <Field label="Late fee amount" error={errors.lateFeeAmount}>
            <input name="lateFeeAmount" type="number" min="0" defaultValue={editing?.lateFeeAmount ?? 0} className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Applicable property types</span>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${on ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                  >
                    {on && <Icon name="check" size={13} className="mr-1 inline" />}{t}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" name="autoInvoice" defaultChecked={editing?.autoInvoice ?? true} className="h-4 w-4 accent-brand-600" />
            Auto-generate invoices on the due day for all eligible owners
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete plan"
        message={`Delete the "${confirmDelete?.name}" plan? Invoices already generated from it are kept, but it can no longer be applied to owners.`}
      />
    </div>
  );
}

function CatChip({ active, onClick, icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
      }`}
    >
      <Icon name={icon} size={14} />
      {label}
      <span className={`rounded-full px-1.5 text-xs ${active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"}`}>{count}</span>
    </button>
  );
}
