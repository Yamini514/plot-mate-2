"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  StatCard,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  Tabs,
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
import { myInvoices, myUpcoming, myBillingSummary } from "@/lib/billing-data";
import { formatINR } from "@/lib/utils";

export default function MemberBilling() {
  const toast = useToast();
  const [tab, setTab] = useState("upcoming");
  const [pay, setPay] = useState(null); // invoice being paid

  const doPay = () => {
    toast(`Payment of ${formatINR(pay.amount)} successful · receipt sent`);
    setPay(null);
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/member" }, { label: "Me" }, { label: "Billing & Invoices" }]} />
      <PageHeader
        title="Billing & Invoices"
        subtitle="Plot P-047 · Naveen Varma"
        actions={
          myBillingSummary.totalDue > 0 && (
            <Button icon="indian-rupee" onClick={() => setPay({ id: "ALL", plan: "All dues", amount: myBillingSummary.totalDue })}>
              Pay all dues
            </Button>
          )
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total due now" value={formatINR(myBillingSummary.totalDue)} icon="badge-indian-rupee" tone={myBillingSummary.totalDue > 0 ? "amber" : "brand"} hint={`Next due ${myBillingSummary.nextDue}`} />
        <StatCard label="Paid this year" value={formatINR(myBillingSummary.paidThisYear)} icon="hand-coins" tone="brand" />
        <StatCard label="Upcoming bills" value={myUpcoming.length} icon="calendar-clock" tone="sky" />
        <StatCard label="Autopay" value={myBillingSummary.autopay ? "On" : "Off"} icon="repeat" tone="violet" hint={myBillingSummary.autopay ? "Enabled" : "Set up to never miss a due"} />
      </div>

      {/* Due banner */}
      {myBillingSummary.totalDue > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
            <Icon name="bell-ring" size={20} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{formatINR(myBillingSummary.totalDue)} due by {myBillingSummary.nextDue}</p>
            <p className="text-xs text-amber-700">Pay before the due date to avoid late fees.</p>
          </div>
          <Button size="sm" onClick={() => setPay({ id: "ALL", plan: "All dues", amount: myBillingSummary.totalDue })}>Pay now</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "upcoming", label: "Upcoming bills", count: myUpcoming.length },
            { value: "history", label: "Payment history", count: myInvoices.length },
          ]}
        />
      </div>

      {tab === "upcoming" && (
        <Card className="mt-4">
          <CardHeader title="Upcoming bills" subtitle="Auto-generated for your plot" icon="calendar-clock" />
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
              {myUpcoming.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-800">{i.id}</Td>
                  <Td className="text-slate-700">{i.plan}</Td>
                  <Td className="text-slate-500">{i.period}</Td>
                  <Td className="text-slate-500">{i.dueDate}</Td>
                  <Td className="text-right font-semibold text-slate-800">{formatINR(i.amount)}</Td>
                  <Td className="text-right">
                    <Button size="sm" onClick={() => setPay(i)}>Pay now</Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === "history" && (
        <Card className="mt-4">
          <CardHeader title="Payment history" subtitle="Paid invoices & receipts" icon="receipt" />
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Plan</Th>
                <Th>Period</Th>
                <Th>Paid on</Th>
                <Th>Method</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th className="text-right">Receipt</Th>
              </tr>
            </thead>
            <tbody>
              {myInvoices.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-800">{i.id}</Td>
                  <Td className="text-slate-700">{i.plan}</Td>
                  <Td className="text-slate-500">{i.period}</Td>
                  <Td className="text-slate-500">{i.paidOn}</Td>
                  <Td className="text-slate-500">{i.method}</Td>
                  <Td className="text-right font-medium text-slate-700">{formatINR(i.amount)}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                  <Td className="text-right">
                    <button onClick={() => toast(`Receipt ${i.id} downloaded`)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                      <Icon name="download" size={13} /> PDF
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Pay modal */}
      <Modal
        open={!!pay}
        onClose={() => setPay(null)}
        title="Pay Maintenance"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPay(null)}>Cancel</Button>
            <Button icon="shield-check" onClick={doPay}>Pay {pay ? formatINR(pay.amount) : ""}</Button>
          </>
        }
      >
        {pay && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{pay.plan}</span>
                <span className="font-semibold text-slate-800">{formatINR(pay.amount)}</span>
              </div>
            </div>
            <Field label="Payment method">
              <select className={inputClass} defaultValue="upi">
                <option value="upi">UPI</option>
                <option value="card">Credit / Debit Card</option>
                <option value="netbanking">Net Banking</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" />
              Enable autopay for future maintenance bills
            </label>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Icon name="lock" size={12} /> Secured demo checkout — no real payment is processed.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
