"use client";

import { useState } from "react";
import {
  PageHeader, Breadcrumbs, Card, Button, Badge, Segmented, Table, Th, Td, Tr,
  Modal, Field, inputClass, EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useSettings } from "@/lib/useSettings";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { collect, hasErrors, text as vtext, phone as vphone, presence } from "@/lib/validate";

const EMPTY = { name: "", workerType: "Maid", customWorkerType: "", phone: "", plotNo: "" };

export default function GuardDomesticPage() {
  const toast = useToast();
  const { settings } = useSettings();
  const types = settings.lists?.domesticStaffTypes?.length ? settings.lists.domesticStaffTypes : ["Maid", "Driver", "Gardener", "Housekeeping", "Cook", "Electrician", "Plumber", "Other"];
  const [tab, setTab] = useState("workers");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data: raw, reload } = useApi("/guard/domestic", { search: q, status: "active" });
  const workers = normalizeList(raw);
  const { data: vendorsRaw } = useApi(tab === "vendors" ? "/guard/vendors" : null, { search: q });
  const vendors = normalizeList(vendorsRaw);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const workerType = form.workerType === "Other" ? form.customWorkerType.trim() : form.workerType;
    const errs = collect({
      name: vtext(form.name, { min: 2, max: 120, label: "Name" }),
      phone: vphone(form.phone),
      customWorkerType: form.workerType === "Other" ? presence(workerType, "Type") : "",
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try { await api.post("/guard/domestic", { ...form, workerType }); toast("Worker registered"); setForm(EMPTY); setOpen(false); reload(); }
    catch (e) { toast(e.message || "Could not register", "error"); }
    finally { setBusy(false); }
  };

  const move = async (w, action) => {
    setBusy(true);
    try { await api.post(`/guard/domestic/${w.dbId}/${action}`, {}); toast(action === "entry" ? "Entry logged" : "Exit logged"); reload(); }
    catch (e) { toast(e.message || "Action failed", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Gate" }, { label: "Staff & Vendors" }]} />
      <PageHeader title="Domestic Staff & Vendors" subtitle="Daily entry/exit attendance and vendor verification"
        actions={tab === "workers" ? <Button icon="user-plus" onClick={() => { setForm(EMPTY); setErrors({}); setOpen(true); }}>Register worker</Button> : null} />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented value={tab} onChange={setTab} options={[{ value: "workers", label: "Domestic staff" }, { value: "vendors", label: "Vendors" }]} />
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-64" placeholder="Search name / plot" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </Card>

      {tab === "workers" ? (
        <Card>
          {workers.length === 0 ? (
            <EmptyState icon="users" title="No domestic staff" subtitle="Register maids, drivers, cooks and others." />
          ) : (
            <Table>
              <thead><tr><Th>Worker</Th><Th>Type</Th><Th>Plot</Th><Th>Last seen</Th><Th>Status</Th><Th></Th></tr></thead>
              <tbody>
                {workers.map((w) => (
                  <Tr key={w.dbId}>
                    <Td><span className="font-medium text-slate-800">{w.name}</span>{w.phone && <span className="block text-xs text-slate-400">{w.phone}</span>}</Td>
                    <Td className="text-slate-600">{w.workerType}</Td>
                    <Td className="text-slate-600">{w.plotNo || "—"}</Td>
                    <Td className="text-slate-500">{w.lastSeen ? formatDate(w.lastSeen) : "—"}</Td>
                    <Td><Badge tone={w.inside ? "amber" : "slate"}>{w.inside ? "inside" : "out"}</Badge></Td>
                    <Td>{w.inside
                      ? <Button size="sm" variant="secondary" icon="log-out" loading={busy} onClick={() => move(w, "exit")}>Exit</Button>
                      : <Button size="sm" icon="log-in" loading={busy} onClick={() => move(w, "entry")}>Entry</Button>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : (
        <Card>
          {vendors.length === 0 ? (
            <EmptyState icon="hard-hat" title="No vendors" subtitle="Verified vendors with assignments appear here." />
          ) : (
            <Table>
              <thead><tr><Th>Vendor</Th><Th>Categories</Th><Th>Open orders</Th><Th>Compliance</Th></tr></thead>
              <tbody>
                {vendors.map((v) => (
                  <Tr key={v.id}>
                    <Td><span className="font-medium text-slate-800">{v.name}</span>{v.phone && <span className="block text-xs text-slate-400">{v.phone}</span>}</Td>
                    <Td className="text-slate-600">{(v.categories || []).join(", ") || "—"}</Td>
                    <Td><Badge tone={v.openOrders > 0 ? "green" : "slate"}>{v.openOrders} assigned</Badge></Td>
                    <Td><Badge tone={v.compliant ? "green" : "rose"}>{v.compliant ? "docs valid" : "docs expired"}</Badge></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="p-3 text-xs text-slate-400"><Icon name="info" size={12} className="mr-1 inline" />Allow entry only for vendors with an open assignment and valid documents.</p>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Register domestic worker"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button icon="check" loading={busy} onClick={add}>Register</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required error={errors.name} className="col-span-2"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Type"><select className={inputClass} value={form.workerType} onChange={(e) => setForm({ ...form, workerType: e.target.value })}>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Plot"><input className={inputClass} value={form.plotNo} onChange={(e) => setForm({ ...form, plotNo: e.target.value })} /></Field>
          {form.workerType === "Other" && <Field label="Enter type" error={errors.customWorkerType} className="col-span-2"><input className={inputClass} placeholder="e.g. Tutor" value={form.customWorkerType} onChange={(e) => setForm({ ...form, customWorkerType: e.target.value })} /></Field>}
          <Field label="Phone" error={errors.phone} className="col-span-2"><input className={inputClass} maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
