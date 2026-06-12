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
import { visitors as seed, visitorPurposes } from "@/lib/guard-data";

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
  const [rows, setRows] = useState(seed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);

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
      [v.name, v.phone, v.resident, v.flat, v.purpose, v.id]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchF = filter === "all" || v.status === filter;
    return matchQ && matchF;
  });

  const setStatus = (id, status, label) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast(label);
  };

  const register = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newRow = {
      id: `VIS-${2419 + rows.length}`,
      name: f.get("name") || "New Visitor",
      phone: f.get("phone") || "—",
      resident: f.get("resident") || "—",
      flat: f.get("flat") || "—",
      purpose: f.get("purpose") || "Guest",
      checkIn: "Just now",
      checkOut: "—",
      status: "pending",
    };
    setRows((rs) => [newRow, ...rs]);
    setOpen(false);
    toast(`Visitor ${newRow.name} registered — awaiting approval`);
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Gate" }, { label: "Visitors" }]} />
      <PageHeader
        title="Visitor Management"
        subtitle="Register, approve and track visitors across all gates"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast("Visitor log exported as CSV")}>
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
                    <p className="text-slate-700">{v.resident}</p>
                    <p className="text-xs text-slate-400">{v.flat}</p>
                  </Td>
                  <Td className="text-slate-600">{v.purpose}</Td>
                  <Td className="text-slate-500">{v.checkIn}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {v.status === "pending" && (
                        <>
                          <button onClick={() => setStatus(v.id, "approved", `Approved ${v.name}`)} className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100" title="Approve">
                            <Icon name="check" size={15} />
                          </button>
                          <button onClick={() => setStatus(v.id, "rejected", `Rejected ${v.name}`)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100" title="Reject">
                            <Icon name="x" size={15} />
                          </button>
                        </>
                      )}
                      {(v.status === "approved" || v.status === "inside") && (
                        <button onClick={() => setStatus(v.id, "checked_out", `${v.name} checked out`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-200" title="Check out">
                          <Icon name="log-out" size={14} /> Check out
                        </button>
                      )}
                      <button onClick={() => toast(`Calling ${v.resident}…`, "info")} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Call resident">
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
            <Button type="submit" form="register-visitor" icon="user-plus">Register</Button>
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
