"use client";

import { useMemo, useState } from "react";
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
  Drawer,
  Avatar,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { invoices as seed } from "@/lib/billing-data";
import { formatINR } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "generated", label: "Generated" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export default function Invoices() {
  const toast = useToast();
  const [rows, setRows] = useState(seed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [picked, setPicked] = useState(() => new Set());
  const [active, setActive] = useState(null); // drawer invoice

  const counts = useMemo(() => {
    const c = { all: rows.length };
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const filtered = rows.filter((i) => {
    const q = !query || [i.id, i.owner, i.property, i.plan].join(" ").toLowerCase().includes(query.toLowerCase());
    const f = filter === "all" || i.status === filter;
    return q && f;
  });

  const allChecked = filtered.length > 0 && filtered.every((i) => picked.has(i.id));
  const toggleAll = () =>
    setPicked((p) => {
      const next = new Set(p);
      if (allChecked) filtered.forEach((i) => next.delete(i.id));
      else filtered.forEach((i) => next.add(i.id));
      return next;
    });
  const toggle = (id) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setStatus = (ids, status, verb) => {
    setRows((rs) =>
      rs.map((r) =>
        ids.includes(r.id)
          ? {
              ...r,
              status,
              paid: status === "paid" ? r.amount + r.lateFee : r.paid,
              balance: status === "paid" ? 0 : r.balance,
            }
          : r,
      ),
    );
    toast(`${ids.length} invoice${ids.length > 1 ? "s" : ""} ${verb}`);
    setPicked(new Set());
    setActive((a) => (a && ids.includes(a.id) ? { ...a, status } : a));
  };

  const generate = () => {
    setRows((rs) => rs.map((r) => (r.status === "draft" ? { ...r, status: "generated" } : r)));
    toast(`Auto-generated invoices for ${counts.draft ?? 0} draft + eligible owners`);
  };

  const pickedIds = [...picked];

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/admin/billing" }, { label: "Billing" }, { label: "Invoices" }]} />
      <PageHeader
        title="Invoices"
        subtitle="Generated maintenance invoices · payment tracking & status workflow"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast(`Exported ${filtered.length} invoices (CSV)`)}>Export</Button>
            <Button icon="file-plus" onClick={generate}>Generate invoices</Button>
          </>
        }
      />

      {/* Toolbar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 lg:max-w-sm">
            <Icon name="search" size={16} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, owner, property…" className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
          </div>
          <Segmented options={FILTERS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))} value={filter} onChange={setFilter} />
        </div>
      </Card>

      {/* Bulk action bar */}
      {pickedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-800">{pickedIds.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon="send" onClick={() => setStatus(pickedIds, "sent", "sent to owners")}>Send</Button>
            <Button size="sm" variant="secondary" icon="check-check" onClick={() => setStatus(pickedIds, "paid", "marked paid")}>Mark paid</Button>
            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-100" icon="x" onClick={() => setStatus(pickedIds, "cancelled", "cancelled")}>Cancel</Button>
          </div>
        </div>
      )}

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="file-text" title="No invoices" subtitle="Adjust the search or filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 accent-brand-600" />
                </Th>
                <Th>Invoice</Th>
                <Th>Owner / Property</Th>
                <Th>Plan</Th>
                <Th>Due date</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Balance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <Tr key={i.id} onClick={() => setActive(i)}>
                  <Td>
                    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                      <input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)} className="h-4 w-4 accent-brand-600" />
                    </span>
                  </Td>
                  <Td className="font-medium text-slate-800">{i.id}</Td>
                  <Td>
                    <p className="text-slate-700">{i.owner}</p>
                    <p className="text-xs text-slate-400">{i.property} · {i.type}</p>
                  </Td>
                  <Td className="text-slate-600">{i.plan}</Td>
                  <Td className="text-slate-500">{i.dueDate}</Td>
                  <Td className="text-right font-medium text-slate-700">{formatINR(i.amount + i.lateFee)}</Td>
                  <Td className="text-right font-semibold text-slate-800">{i.balance > 0 ? formatINR(i.balance) : "—"}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Detail drawer */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active?.id}
        subtitle={active ? `${active.plan} · ${active.property}` : ""}
        footer={
          active && (
            <>
              <Button variant="secondary" icon="printer" onClick={() => toast("Invoice PDF generated")}>Download</Button>
              {active.status !== "paid" && active.status !== "cancelled" && (
                <>
                  {(active.status === "draft" || active.status === "generated") && (
                    <Button variant="secondary" icon="send" onClick={() => setStatus([active.id], "sent", "sent to owner")}>Send</Button>
                  )}
                  <Button icon="check-check" onClick={() => setStatus([active.id], "paid", "marked paid")}>Record payment</Button>
                </>
              )}
            </>
          )
        }
      >
        {active && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={active.owner} size={44} />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{active.owner}</p>
                <p className="text-sm text-slate-500">{active.property} · {active.type}</p>
              </div>
              <span className="ml-auto"><StatusBadge status={active.status} /></span>
            </div>

            {/* Amount breakdown */}
            <div className="rounded-xl border border-slate-200">
              <Row label="Plan" value={active.plan} />
              <Row label="Base amount" value={formatINR(active.amount)} />
              <Row label="Late fee" value={active.lateFee > 0 ? formatINR(active.lateFee) : "—"} />
              <Row label="Amount paid" value={formatINR(active.paid)} />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">Balance due</span>
                <span className={`text-base font-bold ${active.balance > 0 ? "text-rose-600" : "text-brand-700"}`}>
                  {active.balance > 0 ? formatINR(active.balance) : "Cleared"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Issued" value={active.issued} />
              <Meta label="Due date" value={active.dueDate} />
              <Meta label="Payment method" value={active.method} />
              <Meta label="Invoice no." value={active.id} />
            </div>

            {/* Status timeline */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {["Draft", "Generated", "Sent", "Paid"].map((s, idx) => (
                  <span key={s} className="flex items-center gap-1.5">
                    {idx > 0 && <Icon name="chevron-right" size={12} className="text-slate-300" />}
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">{s}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Record partial payment */}
            {active.balance > 0 && active.status !== "cancelled" && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-800">Record a payment</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label="Amount">
                      <input type="number" defaultValue={active.balance} className={inputClass} />
                    </Field>
                  </div>
                  <Button icon="hand-coins" onClick={() => setStatus([active.id], "paid", "payment recorded")}>Record</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}
