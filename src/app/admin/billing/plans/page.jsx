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
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { plans as seed, FREQUENCIES, PROPERTY_TYPES } from "@/lib/billing-data";
import { formatINR } from "@/lib/utils";

const freqLabel = (v) => FREQUENCIES.find((f) => f.value === v)?.label ?? v;

export default function MaintenancePlans() {
  const toast = useToast();
  const [rows, setRows] = useState(seed);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [types, setTypes] = useState(PROPERTY_TYPES);

  const openCreate = () => {
    setEditing(null);
    setTypes(PROPERTY_TYPES);
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setTypes(p.propertyTypes);
    setOpen(true);
  };

  const toggleActive = (id) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    const p = rows.find((r) => r.id === id);
    toast(`${p.name} ${p.active ? "deactivated" : "activated"}`);
  };

  const toggleType = (t) =>
    setTypes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data = {
      name: f.get("name") || "Untitled plan",
      description: f.get("description") || "",
      amount: Number(f.get("amount")) || 0,
      frequency: f.get("frequency"),
      dueDay: Number(f.get("dueDay")) || 1,
      lateFeeType: f.get("lateFeeType"),
      lateFeeAmount: Number(f.get("lateFeeAmount")) || 0,
      propertyTypes: types,
      autoInvoice: f.get("autoInvoice") === "on",
    };
    if (editing) {
      setRows((rs) => rs.map((r) => (r.id === editing.id ? { ...r, ...data } : r)));
      toast(`${data.name} updated`);
    } else {
      setRows((rs) => [
        { id: `PLN-${String(rs.length + 1).padStart(2, "0")}`, active: true, subscribers: 0, ...data },
        ...rs,
      ]);
      toast(`${data.name} created`);
    }
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/admin/billing" }, { label: "Billing" }, { label: "Maintenance Plans" }]} />
      <PageHeader
        title="Maintenance Plans"
        subtitle="Define recurring & one-time charges with auto-invoice rules"
        actions={<Button icon="plus" onClick={openCreate}>New plan</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => (
          <Card key={p.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name="scroll-text" size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{p.name}</h3>
                  <p className="text-xs text-slate-400">{p.id}</p>
                </div>
              </div>
              <Badge tone={p.active ? "green" : "slate"}>{p.active ? "Active" : "Inactive"}</Badge>
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
              <Button size="sm" variant="ghost" icon={p.active ? "pause" : "play"} onClick={() => toggleActive(p.id)}>
                {p.active ? "Pause" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create / edit modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit · ${editing.name}` : "New Maintenance Plan"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="plan-form" icon="check">{editing ? "Save changes" : "Create plan"}</Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Plan name">
              <input name="name" required defaultValue={editing?.name} className={inputClass} placeholder="e.g. Monthly Maintenance" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <input name="description" defaultValue={editing?.description} className={inputClass} placeholder="Short description" />
            </Field>
          </div>
          <Field label="Amount (₹)">
            <input name="amount" type="number" min="0" required defaultValue={editing?.amount} className={inputClass} placeholder="2500" />
          </Field>
          <Field label="Frequency">
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
          <Field label="Late fee amount">
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
    </div>
  );
}
