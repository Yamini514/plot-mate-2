"use client";

import { useState } from "react";
import {
  PageHeader,
  StatCard,
  Card,
  CardHeader,
  Button,
  Table,
  Th,
  Td,
  Tr,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { PaymentSlipModal } from "@/components/PaymentSlip";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

export function InvoicesPanel() {
  const toast = useToast();
  const { user } = useAuth();
  const { data: overview, reload } = useApi("/member/billing");
  const [pay, setPay] = useState(null); // invoice being paid
  const [slipFor, setSlipFor] = useState(null); // invoice shown as a payment slip
  const [method, setMethod] = useState("upi");
  const [autopay, setAutopay] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);

  const summary = overview?.summary ?? { totalDue: 0, nextDue: "—", paidThisYear: 0 };
  // Keep `amount` as the true base charge (the slip needs it for the breakdown);
  // `balance` is what's payable now.
  const upcoming = normalizeList(overview?.upcoming).map((i) => ({
    ...i, plan: i.planName,
  }));

  const doPay = async () => {
    if (!pay) return;
    const bills = pay.id === "ALL" ? upcoming : upcoming.filter((i) => i.id === pay.id);
    if (bills.length === 0) {
      toast("Nothing due", "info");
      setPay(null);
      return;
    }
    setSaving(true);
    try {
      let last;
      for (const b of bills) {
        const { data } = await api.post("/member/billing/pay", { invoiceId: b.dbId, mode: method });
        last = data;
      }
      const total = bills.reduce((s, b) => s + b.balance, 0);
      setReceipt({ id: last?.receiptNumber, amount: total, method, paidOn: today(), count: bills.length });
      if (autopay) toast("Autopay enabled for future bills", "info");
      setPay(null);
      reload();
    } catch (e) {
      toast(e.message || "Payment failed", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Invoices & Bills"
        subtitle={`${user?.plotNo ? `Plot ${user.plotNo} · ` : ""}${user?.name ?? "Member"}`}
        actions={
          summary.totalDue > 0 && (
            <Button icon="indian-rupee" onClick={() => setPay({ id: "ALL", plan: "All dues", amount: summary.totalDue })}>
              Pay all dues
            </Button>
          )
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total due now" value={formatINR(summary.totalDue)} icon="badge-indian-rupee" tone={summary.totalDue > 0 ? "amber" : "brand"} hint={`Next due ${summary.nextDue}`} />
        <StatCard label="Paid this year" value={formatINR(summary.paidThisYear)} icon="hand-coins" tone="brand" />
        <StatCard label="Upcoming bills" value={upcoming.length} icon="calendar-clock" tone="sky" />
        <StatCard label="Autopay" value={autopay ? "On" : "Off"} icon="repeat" tone="violet" hint={autopay ? "Enabled" : "Set up to never miss a due"} />
      </div>

      {/* Due banner */}
      {summary.totalDue > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <Icon name="bell-ring" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{formatINR(summary.totalDue)} due by {summary.nextDue}</p>
            <p className="text-xs text-amber-700">Pay before the due date to avoid late fees.</p>
          </div>
          <Button size="sm" onClick={() => setPay({ id: "ALL", plan: "All dues", amount: summary.totalDue })}>Pay now</Button>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title="Upcoming bills" subtitle="Auto-generated for your plot" icon="calendar-clock" />
        {upcoming.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">All caught up — no dues 🎉</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Plan</Th>
                <Th>Period</Th>
                <Th>Due date</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-800">{i.id}</Td>
                  <Td className="text-slate-700">{i.plan}</Td>
                  <Td className="text-slate-500">{i.period}</Td>
                  <Td className="text-slate-500">{i.dueDate}</Td>
                  <Td className="text-right font-semibold text-slate-800">{formatINR(i.balance)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" icon="receipt-indian-rupee" onClick={() => setSlipFor(i)}>Slip</Button>
                      <Button size="sm" onClick={() => setPay(i)}>Pay now</Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Payment slip — view, scan/tap UPI, or confirm a paid transfer */}
      <PaymentSlipModal
        open={!!slipFor}
        onClose={() => setSlipFor(null)}
        invoice={slipFor}
        role="member"
        onPaid={reload}
      />

      {/* Pay modal */}
      <Modal
        open={!!pay}
        onClose={() => setPay(null)}
        title="Pay Maintenance"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPay(null)}>Cancel</Button>
            <Button icon="shield-check" loading={saving} onClick={doPay}>Pay {pay ? formatINR(pay.id === "ALL" ? pay.amount : pay.balance) : ""}</Button>
          </>
        }
      >
        {pay && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{pay.plan}</span>
                <span className="font-semibold text-slate-800">{formatINR(pay.id === "ALL" ? pay.amount : pay.balance)}</span>
              </div>
            </div>
            <Field label="Payment method">
              <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="upi">UPI</option>
                <option value="card">Credit / Debit Card</option>
                <option value="net_banking">Net Banking</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} className="h-4 w-4 accent-brand-600" />
              Enable autopay for future maintenance bills
            </label>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Icon name="lock" size={12} /> Secured demo checkout — no real payment is processed.
            </p>
          </div>
        )}
      </Modal>

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
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm">
                <span className="text-slate-500">Bills paid</span>
                <span className="font-medium text-slate-700">{receipt.count}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm">
                <span className="text-slate-500">Method</span>
                <span className="font-medium uppercase text-slate-700">{receipt.method}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-700">{receipt.paidOn}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-slate-800">Amount paid</span>
                <span className="text-base font-bold text-brand-700">{formatINR(receipt.amount)}</span>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400">Thank you · a copy has been emailed to you.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
