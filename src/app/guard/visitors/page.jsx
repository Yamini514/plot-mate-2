"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  Button,
  StatusBadge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  Modal,
  Field,
  inputClass,
  Avatar,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { visitorPurposes } from "@/lib/guard-data";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const STATUS_ACTION = { approved: "approve", rejected: "reject", inside: "checkin", checked_out: "checkout" };

function downloadCSV(filename, rows, columns) {
  const head = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows.map((r) => columns.map((c) => `"${String(c.get(r) ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Check-in may be ISO (admin/store), a label ("08:12 AM", guard seed), or null.
function fmtTime(t) {
  if (!t) return "—";
  const d = new Date(t);
  return isNaN(d.getTime()) ? t : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "inside", label: "Inside" },
  { value: "checked_out", label: "Checked out" },
  { value: "rejected", label: "Rejected" },
];

export default function VisitorManagement() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/guard/visitors", { page_size: 300 });
  const rows = normalizeList(raw).map((v) => ({ ...v, resident: v.residentName }));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Open the register modal automatically when linked from a quick action.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open modal on arrival from a quick action
    if (params.get("new") === "1") setOpen(true);
  }, []);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const filtered = rows.filter((v) => {
    const matchQ =
      !query ||
      [v.name, v.phone, v.resident, v.plotNo, v.purpose, v.id]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchF = filter === "all" || v.status === filter;
    return matchQ && matchF;
  });

  const setStatus = async (id, status, label) => {
    const v = rows.find((r) => r.id === id);
    setBusyId(id);
    try {
      await api.post(`/guard/visitors/${v.dbId}/action`, { action: STATUS_ACTION[status] });
      toast(label);
      reload();
    } catch (e) {
      toast(e.message || "Could not update visitor", "error");
    } finally {
      setBusyId(null);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const { data } = await api.post("/guard/visitors", {
        name: f.get("name") || "New Visitor",
        phone: f.get("phone") || "—",
        residentName: f.get("resident") || "—",
        plotNo: f.get("flat") || "—",
        purpose: f.get("purpose") || "Guest",
        vehicleNo: f.get("vehicle") || null,
      });
      setOpen(false);
      toast(`Visitor ${data.name} registered — awaiting approval`);
      reload();
    } catch (err) {
      toast(err.message || "Could not register visitor", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Gate" }, { label: "Visitors" }]} />
      <PageHeader
        title="Visitor Management"
        subtitle="Register, approve and track visitors across all gates"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => {
              downloadCSV("visitors.csv", filtered, [
                { label: "Visitor ID", get: (r) => r.id },
                { label: "Name", get: (r) => r.name },
                { label: "Phone", get: (r) => r.phone },
                { label: "Visiting", get: (r) => r.resident },
                { label: "Flat / Plot", get: (r) => r.plotNo },
                { label: "Purpose", get: (r) => r.purpose },
                { label: "Check-in", get: (r) => fmtTime(r.checkIn) },
                { label: "Status", get: (r) => r.status },
              ]);
              toast("Visitor log exported as CSV");
            }}>
              Export
            </Button>
            <Button icon="user-plus" onClick={() => setOpen(true)}>
              Register Visitor
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Icon name="search" size={16} className="text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone, flat, purpose…"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <Icon name="calendar" size={16} className="text-slate-400" />
              <input type="date" defaultValue="2026-06-12" className="bg-transparent text-sm text-slate-600 focus:outline-none" />
              <span className="text-slate-300">→</span>
              <input type="date" defaultValue="2026-06-12" className="bg-transparent text-sm text-slate-600 focus:outline-none" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Segmented
            options={FILTERS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))}
            value={filter}
            onChange={setFilter}
          />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="users-round" title="No visitors found" subtitle="Try a different search term or filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Visitor</Th>
                <Th>Phone</Th>
                <Th>Visiting</Th>
                <Th>Purpose</Th>
                <Th>Check-in</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <Tr key={v.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={v.name} size={34} />
                      <div>
                        <p className="font-medium text-slate-800">{v.name}</p>
                        <p className="text-xs text-slate-400">{v.id}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-slate-500">{v.phone}</Td>
                  <Td>
                    <p className="text-slate-700">{v.resident ?? "—"}</p>
                    <p className="text-xs text-slate-400">{v.plotNo}</p>
                  </Td>
                  <Td className="text-slate-600">{v.purpose}</Td>
                  <Td className="text-slate-500">{fmtTime(v.checkIn)}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {v.status === "pending" && (
                        <>
                          <button onClick={() => setStatus(v.id, "approved", `Approved ${v.name}`)} disabled={busyId === v.id} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 disabled:opacity-50" title="Approve">
                            <Icon name={busyId === v.id ? "loader-circle" : "check"} size={15} className={busyId === v.id ? "animate-spin" : undefined} />
                          </button>
                          <button onClick={() => setStatus(v.id, "rejected", `Rejected ${v.name}`)} disabled={busyId === v.id} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50" title="Reject">
                            <Icon name={busyId === v.id ? "loader-circle" : "x"} size={15} className={busyId === v.id ? "animate-spin" : undefined} />
                          </button>
                        </>
                      )}
                      {(v.status === "approved" || v.status === "inside") && (
                        <button onClick={() => setStatus(v.id, "checked_out", `${v.name} checked out`)} disabled={busyId === v.id} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50" title="Check out">
                          <Icon name={busyId === v.id ? "loader-circle" : "log-out"} size={14} className={busyId === v.id ? "animate-spin" : undefined} /> Check out
                        </button>
                      )}
                      <button onClick={() => { window.location.href = `tel:${String(v.phone).replace(/\s/g, "")}`; }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Call resident">
                        <Icon name="phone" size={15} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Register modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Register New Visitor"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="register-visitor" icon="user-plus" loading={saving}>Register</Button>
          </>
        }
      >
        <form id="register-visitor" onSubmit={register} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Visitor name">
            <input name="name" required className={inputClass} placeholder="e.g. Anil Deshmukh" />
          </Field>
          <Field label="Phone number">
            <input name="phone" required className={inputClass} placeholder="+91 9XXXX XXXXX" />
          </Field>
          <Field label="Visiting resident">
            <input name="resident" required className={inputClass} placeholder="e.g. Naveen Varma" />
          </Field>
          <Field label="Flat / Plot no.">
            <input name="flat" required className={inputClass} placeholder="e.g. P-047" />
          </Field>
          <Field label="Purpose of visit">
            <select name="purpose" className={inputClass} defaultValue="Guest">
              {visitorPurposes.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Vehicle number (optional)">
            <input name="vehicle" className={inputClass} placeholder="e.g. TS 09 GK 4412" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes (optional)">
              <textarea name="notes" rows={2} className={inputClass} placeholder="Any extra details for the resident…" />
            </Field>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 sm:col-span-2">
            <Icon name="info" size={14} />
            The visitor stays in <strong>Pending</strong> until the resident approves the entry.
          </div>
        </form>
      </Modal>
    </div>
  );
}
