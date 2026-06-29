"use client";

import { useState } from "react";
import {
  PageHeader, Breadcrumbs, Card, Button, Badge, Segmented, Table, Th, SortTh, Td, Tr,
  Modal, Field, inputClass, Pagination, EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
import { useSettings } from "@/lib/useSettings";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { collect, hasErrors, presence } from "@/lib/validate";

const EMPTY = { vehicleNo: "", vehicleType: "Car", ownerKind: "visitor", plotNo: "", driverName: "", phone: "", parkingSlot: "" };

export default function GuardVehiclesPage() {
  const toast = useToast();
  const { settings } = useSettings();
  const types = settings.lists?.vehicleTypes?.length ? settings.lists.vehicleTypes : ["Car", "Bike", "Commercial", "Emergency", "Other"];
  const [status, setStatus] = useState("inside");
  const [search, setSearch] = useState("");
  const c = useListControls();
  const q = useDebounced(search);
  const { data: raw, meta, reload } = useApi("/guard/vehicles", { status, search: q, ...c.query });
  const rows = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const logIn = async () => {
    const errs = collect({ vehicleNo: presence(form.vehicleNo, "Vehicle number") });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try { await api.post("/guard/vehicles", form); toast("Vehicle logged in"); setForm(EMPTY); setOpen(false); reload(); }
    catch (e) { toast(e.message || "Could not log vehicle", "error"); }
    finally { setBusy(false); }
  };

  const exit = async (v) => {
    setBusy(true);
    try { await api.post(`/guard/vehicles/${v.dbId}/exit`, {}); toast("Exit logged"); reload(); }
    catch (e) { toast(e.message || "Could not log exit", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Gate" }, { label: "Vehicles" }]} />
      <PageHeader title="Vehicle Register" subtitle="Log vehicles in and out at the gate"
        actions={<Button icon="car" onClick={() => { setForm(EMPTY); setErrors({}); setOpen(true); }}>Log vehicle</Button>} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented value={status} onChange={(v) => { setStatus(v); c.setPage(1); }}
            options={[
              { value: "inside", label: "Inside", count: counts.inside },
              { value: "exited", label: "Exited", count: counts.exited },
              { value: "all", label: "All", count: counts.all },
            ]} />
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-64"
              placeholder="Search number / plot / driver" value={search}
              onChange={(e) => { setSearch(e.target.value); c.setPage(1); }} />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="car" title="No vehicles" subtitle="Logged vehicles appear here." />
        ) : (
          <Table>
            <thead><tr>
              <SortTh sortKey="vehicle_no" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Vehicle</SortTh>
              <Th>Type</Th><Th>For</Th><Th>Parking</Th><Th>Entry</Th><Th>Status</Th><Th></Th>
            </tr></thead>
            <tbody>
              {rows.map((v) => (
                <Tr key={v.dbId}>
                  <Td><span className="font-medium text-slate-800">{v.vehicleNo}</span>{v.driverName && <span className="block text-xs text-slate-400">{v.driverName}</span>}</Td>
                  <Td className="text-slate-600">{v.vehicleType}</Td>
                  <Td className="text-slate-600">{v.ownerKind === "owner" ? `Owner · ${v.plotNo || "—"}` : `Visitor${v.plotNo ? ` · ${v.plotNo}` : ""}`}</Td>
                  <Td className="text-slate-500">{v.parkingSlot || "—"}</Td>
                  <Td className="text-slate-500">{v.entryAt ? formatDate(v.entryAt) : "—"}</Td>
                  <Td><Badge tone={v.status === "inside" ? "amber" : "slate"}>{v.status}</Badge></Td>
                  <Td>{v.status === "inside" && <Button size="sm" variant="secondary" icon="log-out" loading={busy} onClick={() => exit(v)}>Exit</Button>}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={c.page} totalPages={meta?.totalPages ?? 1} total={meta?.total} pageSize={c.pageSize} onPage={c.setPage} onPageSize={c.setPageSize} />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log vehicle entry"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button icon="log-in" loading={busy} onClick={logIn}>Log in</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vehicle number" required error={errors.vehicleNo} className="col-span-2">
            <input className={inputClass} value={form.vehicleNo} onChange={(e) => setForm({ ...form, vehicleNo: e.target.value.toUpperCase() })} placeholder="TS 09 GK 4412" />
          </Field>
          <Field label="Type"><select className={inputClass} value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="For"><select className={inputClass} value={form.ownerKind} onChange={(e) => setForm({ ...form, ownerKind: e.target.value })}><option value="visitor">Visitor</option><option value="owner">Owner</option></select></Field>
          <Field label="Plot (optional)"><input className={inputClass} value={form.plotNo} onChange={(e) => setForm({ ...form, plotNo: e.target.value })} /></Field>
          <Field label="Parking slot (optional)"><input className={inputClass} value={form.parkingSlot} onChange={(e) => setForm({ ...form, parkingSlot: e.target.value })} /></Field>
          <Field label="Driver name (optional)"><input className={inputClass} value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} /></Field>
          <Field label="Phone (optional)" error={errors.phone}><input className={inputClass} maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
