"use client";

import { useState } from "react";
import {
  Card, Button, Badge, Segmented, Table, Th, Td, Tr, Modal, Field, inputClass,
  Pagination, EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
import { usePermissions } from "@/lib/usePermissions";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";
import { number as vnumber, text as vtext, collect, hasErrors } from "@/lib/validate";

const VERIF_TONE = { pending: "amber", verified: "green", rejected: "rose" };
const REFUND_TONE = { pending: "amber", approved: "sky", paid: "green", rejected: "rose" };

export function PaymentsPanel() {
  const [view, setView] = useState("payments"); // payments | refunds
  return (
    <div>
      <div className="mb-4">
        <Segmented
          value={view}
          onChange={setView}
          options={[{ value: "payments", label: "Payments" }, { value: "refunds", label: "Refunds" }]}
        />
      </div>
      {view === "payments" ? <PaymentsView /> : <RefundsView />}
    </div>
  );
}

function PaymentsView() {
  const toast = useToast();
  const { can } = usePermissions();
  const canApprove = can("payments.approve");
  const [verification, setVerification] = useState("all");
  const [search, setSearch] = useState("");
  const c = useListControls();
  const q = useDebounced(search);
  const { data: raw, meta, reload, loading } = useApi("/admin/billing/payments", {
    verification, search: q, ...c.query,
  });
  const payments = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [busyId, setBusyId] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [reason, setReason] = useState("");
  const [refundFor, setRefundFor] = useState(null);
  const [refund, setRefund] = useState({ amount: "", reason: "", method: "bank" });
  const [errors, setErrors] = useState({});

  const run = async (id, fn, label) => {
    setBusyId(id);
    try { await fn(); toast(label); reload(); }
    catch (e) { toast(e.message || "Action failed", "error"); }
    finally { setBusyId(null); }
  };

  const verify = (p) => run(p.dbId, () => api.post(`/admin/billing/payments/${p.dbId}/verify`, {}), "Payment verified");
  const reconcile = (p) => run(p.dbId, () => api.post(`/admin/billing/payments/${p.dbId}/reconcile`, { reconciled: !p.reconciled }), p.reconciled ? "Unreconciled" : "Reconciled");

  const doReject = async () => {
    if (reason.trim().length < 3) { toast("Add a reason (min 3 chars)", "error"); return; }
    await run(rejectFor.dbId, () => api.post(`/admin/billing/payments/${rejectFor.dbId}/reject`, { reason: reason.trim() }), "Payment rejected");
    setRejectFor(null); setReason("");
  };

  const submitRefund = async () => {
    const errs = collect({
      amount: vnumber(refund.amount, { positive: true, label: "Amount" }),
      reason: vtext(refund.reason, { min: 3, max: 500, label: "Reason" }),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    await run(refundFor.dbId, () => api.post("/admin/billing/refunds", {
      paymentId: refundFor.dbId, amount: Number(refund.amount), reason: refund.reason.trim(), method: refund.method,
    }), "Refund requested");
    setRefundFor(null); setRefund({ amount: "", reason: "", method: "bank" });
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={verification}
          onChange={(v) => { setVerification(v); c.setPage(1); }}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "verified", label: "Verified", count: counts.verified },
            { value: "rejected", label: "Rejected", count: counts.rejected },
          ]}
        />
        <div className="flex items-center gap-3">
          {counts.unreconciled > 0 && (
            <span className="text-xs text-amber-600">{counts.unreconciled} unreconciled</span>
          )}
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-56"
              placeholder="Search owner / ref / no." value={search}
              onChange={(e) => { setSearch(e.target.value); c.setPage(1); }} />
          </div>
        </div>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Payment</Th><Th>Owner</Th><Th className="text-right">Amount</Th>
            <Th>Mode</Th><Th>Date</Th><Th>Status</Th><Th>Reconciled</Th><Th></Th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <Tr key={p.dbId}>
              <Td className="font-mono text-xs text-slate-500">{p.number}</Td>
              <Td className="text-slate-700">{p.ownerName}<span className="block text-xs text-slate-400">{p.property}</span></Td>
              <Td className="text-right font-semibold text-slate-800">{formatINR(p.amount)}</Td>
              <Td className="uppercase text-slate-500">{p.mode}</Td>
              <Td className="text-slate-500">{formatDate(p.paidOn)}</Td>
              <Td><Badge tone={VERIF_TONE[p.verificationStatus] ?? "slate"}>{p.verificationStatus}</Badge></Td>
              <Td>
                {p.verificationStatus === "verified" ? (
                  <button onClick={() => reconcile(p)} disabled={busyId === p.dbId}
                    className={`inline-flex items-center gap-1 text-xs font-medium ${p.reconciled ? "text-brand-600" : "text-slate-400 hover:text-slate-600"}`}>
                    <Icon name={p.reconciled ? "check-circle-2" : "circle"} size={14} />
                    {p.reconciled ? "Matched" : "Mark"}
                  </button>
                ) : <span className="text-xs text-slate-300">—</span>}
              </Td>
              <Td>
                <div className="flex justify-end gap-1.5">
                  {p.verificationStatus === "pending" && canApprove && (
                    <>
                      <Button size="sm" icon="check" loading={busyId === p.dbId} onClick={() => verify(p)}>Verify</Button>
                      <Button size="sm" variant="secondary" icon="x" onClick={() => { setRejectFor(p); setReason(""); }}>Reject</Button>
                    </>
                  )}
                  {p.verificationStatus === "pending" && !canApprove && (
                    <span className="text-xs text-slate-400">awaiting approver</span>
                  )}
                  {p.verificationStatus === "verified" && canApprove && (
                    <Button size="sm" variant="ghost" icon="rotate-ccw" onClick={() => { setRefundFor(p); setErrors({}); setRefund({ amount: String(p.amount), reason: "", method: "bank" }); }}>Refund</Button>
                  )}
                </div>
              </Td>
            </Tr>
          ))}
          {payments.length === 0 && (
            <Tr><Td colSpan={8} className="py-10 text-center text-sm text-slate-400">
              {loading ? <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading…</> : "No payments in this view."}
            </Td></Tr>
          )}
        </tbody>
      </Table>
      <Pagination page={c.page} totalPages={meta?.totalPages ?? 1} total={meta?.total} pageSize={c.pageSize} onPage={c.setPage} onPageSize={c.setPageSize} />

      <Modal open={!!rejectFor} onClose={() => setRejectFor(null)} title="Reject payment"
        footer={<><Button variant="secondary" onClick={() => setRejectFor(null)}>Cancel</Button>
          <Button variant="danger" icon="x" loading={busyId === rejectFor?.dbId} onClick={doReject}>Reject</Button></>}>
        <Field label="Reason" hint="Shared in the audit trail.">
          <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this payment being rejected?" />
        </Field>
      </Modal>

      <Modal open={!!refundFor} onClose={() => setRefundFor(null)} title={`Refund · ${refundFor?.number ?? ""}`}
        footer={<><Button variant="secondary" onClick={() => setRefundFor(null)}>Cancel</Button>
          <Button icon="rotate-ccw" loading={busyId === refundFor?.dbId} onClick={submitRefund}>Request refund</Button></>}>
        <div className="space-y-3">
          <Field label="Amount (₹)" required error={errors.amount}>
            <input type="number" className={inputClass} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
          </Field>
          <Field label="Method">
            <select className={inputClass} value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })}>
              {["bank", "upi", "cash", "adjustment"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reason" required error={errors.reason}>
            <textarea className={inputClass} rows={2} value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} placeholder="Why is this being refunded?" />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}

function RefundsView() {
  const toast = useToast();
  const [status, setStatus] = useState("all");
  const c = useListControls();
  const { data: raw, meta, reload, loading } = useApi("/admin/billing/refunds", { status, ...c.query });
  const refunds = normalizeList(raw);
  const counts = meta?.counts ?? {};
  const [busyId, setBusyId] = useState(null);

  const run = async (id, fn, label) => {
    setBusyId(id);
    try { await fn(); toast(label); reload(); }
    catch (e) { toast(e.message || "Action failed", "error"); }
    finally { setBusyId(null); }
  };

  return (
    <Card>
      <div className="border-b border-slate-100 p-4">
        <Segmented value={status} onChange={(v) => { setStatus(v); c.setPage(1); }}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "pending", label: "Pending", count: counts.pending },
            { value: "approved", label: "Approved", count: counts.approved },
            { value: "paid", label: "Paid", count: counts.paid },
          ]} />
      </div>
      {refunds.length === 0 ? (
        <EmptyState icon="rotate-ccw" title="No refunds" subtitle="Refunds you raise against payments appear here." />
      ) : (
        <Table>
          <thead><tr><Th>Refund</Th><Th>Owner</Th><Th className="text-right">Amount</Th><Th>Method</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>
            {refunds.map((rf) => (
              <Tr key={rf.dbId}>
                <Td className="font-mono text-xs text-slate-500">{rf.code}</Td>
                <Td className="text-slate-700">{rf.ownerName}<span className="block text-xs text-slate-400">{rf.paymentNumber}</span></Td>
                <Td className="text-right font-semibold text-slate-800">{formatINR(rf.amount)}</Td>
                <Td className="uppercase text-slate-500">{rf.method}</Td>
                <Td><Badge tone={REFUND_TONE[rf.status] ?? "slate"}>{rf.status}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    {rf.status === "pending" && (
                      <>
                        <Button size="sm" icon="check" loading={busyId === rf.dbId} onClick={() => run(rf.dbId, () => api.post(`/admin/billing/refunds/${rf.dbId}/approve`, {}), "Approved")}>Approve</Button>
                        <Button size="sm" variant="secondary" icon="x" onClick={() => run(rf.dbId, () => api.post(`/admin/billing/refunds/${rf.dbId}/reject`, {}), "Rejected")}>Reject</Button>
                      </>
                    )}
                    {rf.status === "approved" && (
                      <Button size="sm" icon="banknote" loading={busyId === rf.dbId} onClick={() => run(rf.dbId, () => api.post(`/admin/billing/refunds/${rf.dbId}/mark-paid`, {}), "Marked paid")}>Mark paid</Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={c.page} totalPages={meta?.totalPages ?? 1} total={meta?.total} pageSize={c.pageSize} onPage={c.setPage} onPageSize={c.setPageSize} />
      {loading && refunds.length === 0 && <p className="p-4 text-center text-sm text-slate-400"><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading…</p>}
    </Card>
  );
}
