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
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useStore, newId } from "@/lib/store";
import { useToast } from "@/components/Toast";

function time(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const emptyForm = { name: "", phone: "", visitingPlot: "", purpose: "", vehicleNo: "" };

export default function VisitorsPage() {
  const { visitors, addVisitor, checkOutVisitor } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const inside = visitors.filter((v) => v.status === "inside").length;
  const expected = visitors.filter((v) => v.status === "expected").length;

  const checkIn = () => {
    if (!form.name.trim() || !form.visitingPlot.trim()) {
      toast("Name and visiting plot are required", "error");
      return;
    }
    addVisitor({
      id: newId("VS"),
      name: form.name.trim(),
      phone: form.phone.trim() || "—",
      visitingPlot: form.visitingPlot.trim(),
      purpose: form.purpose.trim() || "Visit",
      vehicleNo: form.vehicleNo.trim() || undefined,
      checkIn: new Date().toISOString(),
      checkOut: null,
      status: "inside",
    });
    toast(`${form.name.trim()} checked in`);
    setForm(emptyForm);
    setOpen(false);
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
        <StatCard label="Expected today" value={`${expected}`} icon="clock" tone="amber" />
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
            </tr>
          </thead>
          <tbody>
            {visitors.map((v) => (
              <Tr key={v.id}>
                <Td>
                  <p className="font-medium text-slate-800">{v.name}</p>
                  <p className="text-xs text-slate-400">{v.phone}</p>
                </Td>
                <Td className="font-medium text-slate-700">{v.visitingPlot}</Td>
                <Td className="text-slate-500">{v.purpose}</Td>
                <Td className="font-mono text-xs text-slate-500">{v.vehicleNo ?? "—"}</Td>
                <Td className="text-slate-500">{time(v.checkIn)}</Td>
                <Td className="text-slate-500">{v.checkOut ? time(v.checkOut) : "—"}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={v.status} />
                    {v.status === "inside" && (
                      <button
                        onClick={() => { checkOutVisitor(v.id); toast(`${v.name} checked out`, "info"); }}
                        className="rounded-md px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                      >
                        Check out
                      </button>
                    )}
                  </div>
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
            <Button onClick={checkIn}>Check in</Button>
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
            <input className={inputClass} placeholder="P-047" value={form.visitingPlot} onChange={(e) => setForm({ ...form, visitingPlot: e.target.value })} />
          </Field>
          <Field label="Purpose">
            <input className={inputClass} placeholder="Delivery / Guest / Service" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </Field>
          <Field label="Vehicle number (optional)">
            <input className={inputClass} placeholder="TS09 …" value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
