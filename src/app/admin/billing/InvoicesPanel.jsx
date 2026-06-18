"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
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
  Modal,
  Avatar,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { PaymentSlipModal } from "@/components/PaymentSlip";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
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

const PAYMENT_MODES = ["upi", "card", "net_banking", "bank", "cash"];

function csvEscape(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function InvoicesPanel() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/admin/billing/invoices", { page_size: 300 });
  // Map backend fields to the labels this page uses (owner/plan/issued/type).
  const rows = normalizeList(raw).map((i) => ({
    ...i, owner: i.ownerName, plan: i.planName, issued: i.issuedOn, type: i.propertyType,
  }));
  const dbIdOf = (id) => rows.find((r) => r.id === id)?.dbId;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [picked, setPicked] = useState(() => new Set());
  const [active, setActive] = useState(null); // drawer invoice
  const [slipFor, setSlipFor] = useState(null); // invoice shown as a payment slip
  const [receipt, setReceipt] = useState(null); // receipt to display
  const [waiveFor, setWaiveFor] = useState(null); // invoice being waived
  const [statusSaving, setStatusSaving] = useState(false); // bulk/workflow status transition
  const [recordSaving, setRecordSaving] = useState(false); // record-payment submit
  const [waiveSaving, setWaiveSaving] = useState(false); // waiver submit
  const [lateFeeSaving, setLateFeeSaving] = useState(false); // apply late fees

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

  // Bulk send / cancel / generate (workflow status transition).
  const setStatus = async (ids, status, verb) => {
    setStatusSaving(true);
    try {
      await api.post("/admin/billing/invoices/status", { ids: ids.map(dbIdOf), status });
      toast(`${ids.length} invoice${ids.length > 1 ? "s" : ""} ${verb}`);
      setPicked(new Set());
      setActive(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not update", "error");
    } finally {
      setStatusSaving(false);
    }
  };

  // Record a real (possibly partial) payment — backend issues the receipt,
  // updates the balance/status and posts to the treasury ledger.
  const recordPayment = async ({ invoice, amount, mode, date }) => {
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    setRecordSaving(true);
    try {
      const { data } = await api.post("/admin/billing/payments", {
        invoiceId: invoice.dbId, amount: amt, mode, paidOn: date,
      });
      setReceipt({
        id: data.receiptNumber, owner: invoice.owner, property: invoice.property,
        plan: invoice.plan, mode, date, amount: amt, balanceAfter: data.invoice?.balance ?? 0,
      });
      toast(`Payment of ${formatINR(amt)} recorded · ${data.receiptNumber}`);
      reload();
    } catch (e) {
      toast(e.message || "Payment failed", "error");
    } finally {
      setRecordSaving(false);
    }
  };

  // Waiver / discount — reduces the balance, logged with a reason.
  const applyWaiver = async ({ invoice, amount, reason }) => {
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }
    setWaiveSaving(true);
    try {
      await api.post(`/admin/billing/invoices/${invoice.dbId}/adjust`, { kind: "waiver", amount: amt, reason });
      toast(`Waived ${formatINR(amt)} on ${invoice.id}`);
      setWaiveFor(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not apply", "error");
    } finally {
      setWaiveSaving(false);
    }
  };

  // Apply each overdue invoice's plan late-fee rule (idempotent, server-side).
  const applyLateFees = async () => {
    setLateFeeSaving(true);
    try {
      const { data } = await api.post("/admin/billing/invoices/apply-late-fees");
      toast(`Late fee applied to ${data.applied} invoice(s)`);
      reload();
    } catch (e) {
      toast(e.message || "Could not apply late fees", "error");
    } finally {
      setLateFeeSaving(false);
    }
  };

  // Move draft invoices to "generated".
  const generate = () => {
    const draftIds = rows.filter((r) => r.status === "draft").map((r) => r.id);
    if (!draftIds.length) {
      toast("No draft invoices to generate", "info");
      return;
    }
    setStatus(draftIds, "generated", "generated");
  };

  const exportCSV = () => {
    const cols = [
      ["id", "Invoice"], ["owner", "Owner"], ["property", "Property"], ["plan", "Plan"],
      ["issued", "Issued"], ["dueDate", "Due"], ["amount", "Amount"], ["lateFee", "Late fee"],
      ["paid", "Paid"], ["balance", "Balance"], ["status", "Status"],
    ];
    const header = cols.map((c) => csvEscape(c[1])).join(",");
    const body = filtered.map((i) => cols.map((c) => csvEscape(i[c[0]])).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plotmate-invoices.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} invoices (CSV)`);
  };

  const pickedIds = [...picked];

  // Payments recorded against the active invoice. The detailed payment history
  // endpoint isn't wired yet, so this stays empty (the section hides itself).
  const payments = [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Invoices"
        subtitle="Generated maintenance invoices · payment tracking & status workflow"
        actions={
          <>
            <Button variant="secondary" icon="alarm-clock" loading={lateFeeSaving} onClick={applyLateFees}>Apply late fees</Button>
            <Button variant="secondary" icon="download" onClick={exportCSV}>Export</Button>
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
            <Button size="sm" variant="secondary" icon="send" loading={statusSaving} onClick={() => setStatus(pickedIds, "sent", "sent to owners")}>Send</Button>
            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-100" icon="x" loading={statusSaving} onClick={() => setStatus(pickedIds, "cancelled", "cancelled")}>Cancel</Button>
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
                <Th className="text-right">Slip</Th>
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
                  <Td className="text-right">
                    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                      <Button size="sm" variant="ghost" icon="receipt-indian-rupee" onClick={() => setSlipFor(i)}>Slip</Button>
                    </span>
                  </Td>
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
              <Button variant="secondary" icon="receipt-indian-rupee" onClick={() => setSlipFor(active)}>Payment slip</Button>
              {active.status !== "paid" && active.status !== "cancelled" && (active.status === "draft" || active.status === "generated") && (
                <Button variant="secondary" icon="send" loading={statusSaving} onClick={() => setStatus([active.id], "sent", "sent to owner")}>Send</Button>
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

            {/* Payments recorded against this invoice */}
            {payments.filter((p) => p.invoiceId === active.id).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Payments</p>
                <div className="space-y-1.5">
                  {payments.filter((p) => p.invoiceId === active.id).map((p) => (
                    <button key={p.id} onClick={() => setReceipt(p)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">
                      <span className="flex items-center gap-2 text-slate-600"><Icon name="receipt" size={14} /> {p.id} · {p.mode}</span>
                      <span className="font-semibold text-slate-700">{formatINR(p.amount)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Record a payment (real, partial-aware) */}
            {active.balance > 0 && active.status !== "cancelled" && (
              <PaymentForm invoice={active} onRecord={recordPayment} onWaive={() => setWaiveFor(active)} saving={recordSaving} />
            )}
          </div>
        )}
      </Drawer>

      {/* Receipt */}
      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Payment receipt"
        footer={<Button icon="printer" onClick={() => window.print()}>Print / Save PDF</Button>}
      >
        {receipt && (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-brand-600">Receipt no.</p>
              <p className="text-lg font-bold text-brand-800">{receipt.id}</p>
            </div>
            <div className="rounded-xl border border-slate-200">
              <Row label="Owner" value={receipt.owner} />
              <Row label="Property" value={receipt.property} />
              <Row label="Plan" value={receipt.plan} />
              <Row label="Mode" value={receipt.mode} />
              <Row label="Date" value={receipt.date} />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">Amount paid</span>
                <span className="text-base font-bold text-brand-700">{formatINR(receipt.amount)}</span>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400">
              {receipt.balanceAfter > 0 ? `Remaining balance ${formatINR(receipt.balanceAfter)}` : "Invoice fully paid · thank you"}
            </p>
          </div>
        )}
      </Modal>

      {/* Payment slip — generate, customize view, share/print, record payment */}
      <PaymentSlipModal
        open={!!slipFor}
        onClose={() => setSlipFor(null)}
        invoice={slipFor}
        role="admin"
        onPaid={reload}
      />

      {/* Waiver / discount */}
      <WaiveModal invoice={waiveFor} onClose={() => setWaiveFor(null)} onApply={applyWaiver} saving={waiveSaving} />
    </div>
  );
}

function PaymentForm({ invoice, onRecord, onWaive, saving }) {
  const [amount, setAmount] = useState(invoice.balance);
  const [mode, setMode] = useState("upi");
  const [date, setDate] = useState("");

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">Record a payment</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)">
          <input type="number" min="0" max={invoice.balance} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Mode">
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>{m.replace("_", " ").toUpperCase()}</option>
            ))}
          </select>
        </Field>
        <Field label="Paid on">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <div className="flex items-end">
          <p className="text-xs text-slate-400">Partial payments mark the invoice <span className="font-medium text-slate-600">Partial</span> until cleared.</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button icon="hand-coins" className="flex-1" loading={saving} onClick={() => onRecord({ invoice, amount, mode, date: date || new Date().toISOString().slice(0, 10) })}>
          Record {formatINR(Number(amount) || 0)}
        </Button>
        <Button variant="ghost" icon="badge-percent" onClick={onWaive}>Waive / discount</Button>
      </div>
    </div>
  );
}

function WaiveModal({ invoice, onClose, onApply, saving }) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title="Waiver / discount"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="badge-percent" loading={saving} onClick={() => onApply({ invoice, amount, reason })}>Apply</Button>
        </>
      }
    >
      {invoice && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Reduce the balance on <span className="font-semibold text-slate-700">{invoice.id}</span> (currently {formatINR(invoice.balance)}).</p>
          <Field label="Amount to waive (₹)">
            <input type="number" min="0" max={invoice.balance} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Reason">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Late fee waived — first default" className={inputClass} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value ?? "—"}</span>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value ?? "—"}</p>
    </div>
  );
}
