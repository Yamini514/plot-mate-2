"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getMemberOwner, association } from "@/lib/mock-data";
import { formatINR } from "@/lib/utils";

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate font-medium text-slate-700">{value}</p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
      >
        <Icon name={copied ? "check" : "copy"} size={15} className={copied ? "text-brand-600" : ""} />
      </button>
    </div>
  );
}

export default function DuesPage() {
  const me = getMemberOwner();
  const [payOpen, setPayOpen] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);
  const reference = `GAV-${me.plotNo}-2425`;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dues & Payments" subtitle={`Plot ${me.plotNo} · FY ${association.fy}`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: outstanding + how to pay */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Outstanding balance</p>
                <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                  {formatINR(me.amountDue)}
                </p>
                {me.daysOverdue > 0 && (
                  <Badge tone="amber" className="mt-2">
                    <Icon name="clock" size={12} /> Overdue by {me.daysOverdue} days
                  </Badge>
                )}
              </div>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Icon name="wallet" size={28} />
              </span>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Maintenance fee ({me.sizeSqyd} sqyd × ₹{association.ratePerSqyd})</span>
                <span className="font-medium text-slate-700">{formatINR(me.amountDue)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Late penalty</span>
                <span>₹0</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-800">
                <span>Total due</span>
                <span>{formatINR(me.amountDue)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button icon="zap" onClick={() => setPayOpen(true)}>
                Pay now
              </Button>
              <Button variant="secondary" icon="upload" onClick={() => setDeclareOpen(true)}>
                Declare payment
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="How it's calculated" icon="info" />
            <div className="space-y-3 p-5 text-sm text-slate-600">
              <p>
                Maintenance fees fund road upkeep, security, street lights, plantation
                and common-area cleaning. The fee for FY {association.fy} is{" "}
                <b>₹{association.ratePerSqyd} per sqyd per year</b>.
              </p>
              <p>
                Your plot is <b>{me.sizeSqyd} sqyd</b>, so your annual fee is{" "}
                <b>{formatINR(me.sizeSqyd * association.ratePerSqyd)}</b>. Pay before
                30 June 2025 to avoid a 5% late penalty.
              </p>
            </div>
          </Card>
        </div>

        {/* Right: bank details */}
        <Card className="h-fit">
          <CardHeader title="Pay by bank / UPI" icon="landmark" />
          <div className="p-5">
            <div className="grid place-items-center rounded-xl bg-brand-50 p-4">
              <div className="grid h-32 w-32 place-items-center rounded-xl bg-white shadow-sm">
                <Icon name="qr-code" size={84} className="text-brand-700" />
              </div>
              <p className="mt-2 text-xs text-slate-500">Scan to pay via UPI</p>
              <p className="font-mono text-sm font-medium text-brand-700">
                {association.bank.upi}
              </p>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              <CopyRow label="Account name" value={association.bank.accountName} />
              <CopyRow label="Account number" value={association.bank.accountNo} />
              <CopyRow label="IFSC" value={association.bank.ifsc} />
              <CopyRow label="Bank" value={association.bank.bank} />
              <CopyRow label="Payment reference" value={reference} />
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
              <Icon name="info" size={13} className="mt-0.5 shrink-0" />
              Always add the payment reference so we can match your transfer.
            </p>
          </div>
        </Card>
      </div>

      {/* Pay now modal */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Pay maintenance fee"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button icon="zap" onClick={() => setPayOpen(false)}>Proceed to pay {formatINR(me.amountDue)}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">Amount payable</p>
            <p className="text-2xl font-bold text-slate-900">{formatINR(me.amountDue)}</p>
          </div>
          <Field label="Payment method">
            <select className={inputClass}>
              <option>UPI (GPay / PhonePe / Paytm)</option>
              <option>Net Banking</option>
              <option>Debit / Credit Card</option>
            </select>
          </Field>
          <p className="text-xs text-slate-400">
            This is a demo — no real payment will be processed.
          </p>
        </div>
      </Modal>

      {/* Declare payment modal */}
      <Modal
        open={declareOpen}
        onClose={() => setDeclareOpen(false)}
        title="Declare a payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeclareOpen(false)}>Cancel</Button>
            <Button icon="send" onClick={() => setDeclareOpen(false)}>Submit for verification</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Already paid by bank transfer or UPI? Submit the details and the treasurer
            will verify within 2 working days.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Payment date">
              <input type="date" className={inputClass} />
            </Field>
            <Field label="Amount paid (₹)">
              <input type="number" className={inputClass} defaultValue={me.amountDue} />
            </Field>
          </div>
          <Field label="Transaction ID / UTR">
            <input className={inputClass} placeholder="e.g. UTR1234567890" />
          </Field>
          <div className="grid place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-6 text-center">
            <Icon name="image-up" size={24} className="text-slate-400" />
            <p className="mt-1 text-sm font-medium text-slate-600">Upload screenshot</p>
            <p className="text-xs text-slate-400">PNG or JPG, optional</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
