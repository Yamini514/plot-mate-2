"use client";

import { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { formatINR } from "@/lib/utils";

// Itemised materials on a work order. `base` is the API prefix
// (e.g. "/admin/helpdesk/tickets" or "/vendor/tickets"); `detail` is the loaded
// ticket detail (materials + costs); onChanged re-fetches after a mutation.
export function WorkOrderMaterials({ base, ticketId, detail, onChanged, editable = true }) {
  const toast = useToast();
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const materials = Array.isArray(detail?.materials) ? detail.materials : [];

  const add = async () => {
    if (!item.trim()) return toast("Enter an item", "error");
    setBusy(true);
    try {
      await api.post(`${base}/${ticketId}/materials`, { item: item.trim(), quantity: Number(qty) || 1, unitCost: Number(cost) || 0 });
      setItem(""); setQty("1"); setCost("");
      onChanged?.();
    } catch (e) { toast(e.message || "Could not add material", "error"); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    setBusy(true);
    try { await api.del(`${base}/${ticketId}/materials/${id}`); onChanged?.(); }
    catch (e) { toast(e.message || "Could not remove", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Materials &amp; cost</p>
      {materials.length === 0 ? (
        <p className="text-xs text-slate-400">No materials recorded.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span className="text-slate-700">{m.item} <span className="text-xs text-slate-400">×{m.quantity}</span></span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-slate-700">{formatINR(m.lineTotal)}</span>
                {editable && (
                  <button onClick={() => remove(m.id)} disabled={busy} className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="x" size={13} /></button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-sm">
        <Row label="Materials" value={formatINR(detail?.materialsCost ?? 0)} />
        <Row label="Labour" value={formatINR(detail?.labourCost ?? 0)} />
        <Row label="Total cost" value={formatINR(detail?.totalCost ?? 0)} bold />
      </div>

      {editable && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <Field label="Item" className="flex-1"><input className={inputClass} value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. PVC pipe" /></Field>
          <Field label="Qty"><input type="number" min="1" className={`${inputClass} w-16`} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Unit ₹"><input type="number" min="0" className={`${inputClass} w-24`} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          <Button size="sm" variant="secondary" icon="plus" loading={busy} onClick={add}>Add</Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? "font-semibold text-slate-800" : "text-slate-700"}>{value}</span>
    </div>
  );
}
