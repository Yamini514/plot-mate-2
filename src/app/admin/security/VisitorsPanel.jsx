"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  StatCard,
  Table,
  Th,
  Td,
  Tr,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";

// Visitor check-in/out times may be ISO (admin/store) or a plain label (guard).
function time(t) {
  if (!t || t === "—") return "—";
  const d = new Date(t);
  return isNaN(d.getTime())
    ? t
    : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const emptyForm = { name: "", phone: "", plotNo: "", purpose: "", vehicleNo: "" };

export function VisitorsPanel() {
  const { data: raw, reload } = useApi("/admin/visitors", { page_size: 300 });
  const visitors = normalizeList(raw);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const inside = visitors.filter((v) => v.status === "inside").length;
  const pending = visitors.filter((v) => v.status === "pending").length;

  const checkIn = async () => {
    if (!form.name.trim() || !form.plotNo.trim()) {
      toast("Name and visiting plot are required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/visitors", {
        name: form.name.trim(),
        phone: form.phone.trim() || "—",
        plotNo: form.plotNo.trim(),
        purpose: form.purpose.trim() || "Visit",
        vehicleNo: form.vehicleNo.trim() || null,
        status: "inside",
      });
      toast(`${form.name.trim()} checked in`);
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not log visitor", "error");
    } finally {
      setSaving(false);
    }
  };

  const checkOut = async (v) => {
    setBusyId(v.id);
    try {
      await api.post(`/admin/visitors/${v.dbId}/action`, { action: "checkout" });
      toast(`${v.name} checked out`, "info");
      reload();
    } catch (e) {
      toast(e.message || "Could not check out", "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/visitors/${confirmDelete.dbId}`);
      toast("Visitor entry deleted");
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete entry", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Visitor & Gate Management"
        subtitle="Track entries, exits and expected guests"
        actions={<Button icon="user-plus" onClick={() => setOpen(true)}>Log visitor</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Currently inside" value={`${inside}`} icon="door-open" tone="sky" />
        <StatCard label="Pending approval" value={`${pending}`} icon="clock" tone="amber" />
        <StatCard label="Total today" value={`${visitors.length}`} icon="users" tone="violet" />
        <StatCard label="Gate guards" value="2" icon="shield" tone="brand" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Visitor log — Today" icon="clipboard-list" />
        <Table>
          <thead>
            <tr>
              <Th>Visitor</Th>
              <Th>Visiting</Th>
              <Th>Purpose</Th>
              <Th>Vehicle</Th>
              <Th>Check-in</Th>
              <Th>Check-out</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {visitors.map((v) => (
              <Tr key={v.id}>
                <Td>
                  <p className="font-medium text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-400">{v.phone}</p>
                </Td>
                <Td className="font-medium text-slate-700">{v.plotNo}</Td>
                <Td className="text-slate-500">{v.purpose}</Td>
                <Td className="font-mono text-xs text-slate-500">{v.vehicleNo ?? "—"}</Td>
                <Td className="text-slate-500">{time(v.checkIn)}</Td>
                <Td className="text-slate-500">{v.checkOut ? time(v.checkOut) : "—"}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={v.status} />
                    {v.status === "inside" && (
                      <button
                        onClick={() => checkOut(v)}
                        disabled={busyId === v.id}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === v.id && <Icon name="loader-circle" size={12} className="animate-spin" />}
                        Check out
                      </button>
                    )}
                  </div>
                </Td>
                <Td>
                  <button
                    onClick={() => setConfirmDelete(v)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete entry"
                  >
                    <Icon name="trash-2" size={15} />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log a visitor"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={checkIn}>Check in</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Visitor name">
            <input className={inputClass} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} placeholder="+91 …" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Visiting plot">
            <input className={inputClass} placeholder="P-047" value={form.plotNo} onChange={(e) => setForm({ ...form, plotNo: e.target.value })} />
          </Field>
          <Field label="Purpose">
            <input className={inputClass} placeholder="Delivery / Guest / Service" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </Field>
          <Field label="Vehicle number (optional)">
            <input className={inputClass} placeholder="TS09 …" value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete visitor entry"
        message={`Delete the gate log entry for "${confirmDelete?.name}"?`}
      />
    </div>
  );
}
