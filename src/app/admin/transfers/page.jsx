"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, Td, Tr, Modal, Field, inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList, fieldErrors } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatINR, digitsOnly } from "@/lib/utils";
import { presence, phone as vphone, email as vemail, collect, hasErrors } from "@/lib/validate";

const STATUS_TONE = {
  initiated: "amber", under_review: "sky", approved: "green",
  completed: "green", rejected: "rose", cancelled: "slate",
};
const emptyForm = { plotId: "", toOwnerName: "", toEmail: "", toPhone: "", reason: "sale", duesAction: "carry" };

export default function TransfersPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data: raw, meta, reload, loading } = useApi("/admin/transfers", { status: filter });
  const transfers = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const initiate = async () => {
    const errs = collect({
      plotId: presence(form.plotId, "Plot ID"),
      toOwnerName: presence(form.toOwnerName, "New owner name"),
      toPhone: vphone(form.toPhone),
      toEmail: vemail(form.toEmail, { required: false }),
      duesAction: presence(form.duesAction, "Dues action"),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    try {
      await api.post("/admin/transfers/initiate", {
        plotId: Number(form.plotId),
        toOwnerName: form.toOwnerName.trim(),
        toEmail: form.toEmail.trim() || null,
        toPhone: form.toPhone.trim() || null,
        reason: form.reason,
        duesAction: form.duesAction,
      });
      toast("Transfer initiated — review it in Approvals");
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setErrors(fe); else toast(e.message || "Could not initiate transfer", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (t) => {
    setBusyId(t.dbId);
    try {
      await api.post(`/admin/transfers/${t.dbId}/cancel`, {});
      toast("Transfer cancelled");
      reload();
    } catch (e) {
      toast(e.message || "Could not cancel", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ownership transfers"
        subtitle="Move a plot from its current owner to a new one"
        actions={<Button icon="arrow-left-right" onClick={() => { setForm(emptyForm); setErrors({}); setOpen(true); }}>New transfer</Button>}
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "under_review", label: "Open", count: counts.open },
              { value: "completed", label: "Completed", count: counts.completed },
              { value: "rejected", label: "Rejected", count: counts.rejected },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Transfer</Th>
              <Th>Plot</Th>
              <Th>From → To</Th>
              <Th className="text-right">Outstanding</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <Tr key={t.dbId}>
                <Td className="font-mono text-xs text-slate-500">{t.code}</Td>
                <Td className="font-medium text-slate-800">{t.plotNo || t.plotId}</Td>
                <Td className="text-slate-600">
                  <span className="text-slate-500">{t.fromOwnerName || "—"}</span>
                  <Icon name="arrow-right" size={12} className="mx-1 inline text-slate-300" />
                  <span className="font-medium text-slate-700">{t.toOwnerName}</span>
                </Td>
                <Td className="text-right text-slate-600">{formatINR((t.outstandingPaise ?? 0) / 100)}</Td>
                <Td><Badge tone={STATUS_TONE[t.status] ?? "slate"}>{t.status?.replace("_", " ")}</Badge></Td>
                <Td>
                  <div className="flex justify-end">
                    {["initiated", "under_review"].includes(t.status) && (
                      <Button variant="secondary" icon="x" loading={busyId === t.dbId} onClick={() => cancel(t)}>Cancel</Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {transfers.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading transfers…</>
                  ) : "No transfers in this view."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Initiate ownership transfer"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="arrow-left-right" loading={saving} onClick={initiate}>Initiate</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Plot ID" hint="The plot being transferred" error={errors.plotId}><input className={inputClass} value={form.plotId} onChange={(e) => setForm({ ...form, plotId: digitsOnly(e.target.value, 12) })} placeholder="e.g. 142" /></Field>
          <Field label="Reason"><select className={inputClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>{["sale", "gift", "inheritance", "other"].map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
          <Field label="New owner name" required error={errors.toOwnerName}><input className={inputClass} value={form.toOwnerName} onChange={(e) => setForm({ ...form, toOwnerName: e.target.value })} placeholder="Full name" /></Field>
          <Field label="New owner email" error={errors.toEmail}><input type="email" className={inputClass} value={form.toEmail} onChange={(e) => setForm({ ...form, toEmail: e.target.value })} placeholder="optional" /></Field>
          <Field label="New owner phone" error={errors.toPhone}><input inputMode="numeric" maxLength={10} className={inputClass} value={form.toPhone} onChange={(e) => setForm({ ...form, toPhone: digitsOnly(e.target.value) })} placeholder="optional" /></Field>
          <Field label="Outstanding dues" hint="What happens to the plot's open balance on approval" error={errors.duesAction}>
            <select className={inputClass} value={form.duesAction} onChange={(e) => setForm({ ...form, duesAction: e.target.value })}>
              <option value="carry">Carry forward to new owner</option>
              <option value="clear">Write off / settle on transfer</option>
            </select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">This snapshots the current owner and outstanding dues, then raises an approval request. On approval the plot is relinked to the new owner, its documents are reassigned, and dues are handled per your choice above.</p>
      </Modal>
    </div>
  );
}
