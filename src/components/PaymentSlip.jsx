"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Field, inputClass } from "./ui";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { qrPngFile } from "./Qr";
import { PaymentQr } from "./PaymentQr";
import { ShareModal } from "./ShareModal";
import { StripeCardButton } from "./StripeCardButton";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/useSettings";
import { formatINR } from "@/lib/utils";
import {
  PAYMENT_MODES,
  MODE_LABELS,
  slipOptions,
  toSlipInvoice,
  paymentReference,
  buildUpiUri,
  breakdownRows,
} from "@/lib/payments";

const today = () => new Date().toISOString().slice(0, 10);

/* ============================ Printable document ===========================
 * Carries the `slip-print` class — the @media print rules in globals.css hide
 * everything else on the page and lay this out full-width for a clean PDF.
 */
function SlipDocument({ inv, org, options, upiUri, reference }) {
  const rows = breakdownRows(inv, options);
  return (
    <div className="slip-print rounded-2xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="min-w-0">
          {options.showHeader ? (
            <>
              <p className="truncate text-lg font-bold text-slate-900">{org.name}</p>
              {org.location && <p className="text-xs text-slate-500">{org.location}</p>}
              {org.registrationNo && (
                <p className="text-xs text-slate-400">Reg. {org.registrationNo}</p>
              )}
            </>
          ) : (
            <p className="text-lg font-bold text-slate-900">Payment slip</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Payment slip</p>
          <p className="font-semibold text-slate-800">{inv.id}</p>
          {org.fy && <p className="text-xs text-slate-400">FY {org.fy}</p>}
        </div>
      </div>

      {/* Bill-to + meta */}
      <div className="grid grid-cols-2 gap-4 p-5 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Billed to</p>
          <p className="font-semibold text-slate-800">{inv.owner || "—"}</p>
          <p className="text-slate-500">
            {inv.property}
            {inv.propertyType ? ` · ${inv.propertyType}` : ""}
          </p>
        </div>
        <div className="text-right">
          {inv.period && (
            <p className="text-slate-500">
              Period <span className="font-medium text-slate-700">{inv.period}</span>
            </p>
          )}
          {inv.issued && (
            <p className="text-slate-500">
              Issued <span className="font-medium text-slate-700">{inv.issued}</span>
            </p>
          )}
          {options.showDueDate && inv.dueDate && (
            <p className="text-slate-500">
              Due <span className="font-medium text-rose-600">{inv.dueDate}</span>
            </p>
          )}
        </div>
      </div>

      {/* Breakdown */}
      {options.showBreakdown && (
        <div className="px-5">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-0"
              >
                <span className="text-slate-600">{row.label}</span>
                <span
                  className={
                    row.kind === "sub" ? "font-medium text-slate-400" : "font-medium text-slate-700"
                  }
                >
                  {row.kind === "sub" ? "− " : ""}
                  {formatINR(Math.abs(row.value))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Amount due */}
      <div className="m-5 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
        <span className="text-sm font-semibold text-brand-800">Amount payable</span>
        <span className="text-xl font-bold text-brand-700">
          {inv.balance > 0 ? formatINR(inv.balance) : "Cleared"}
        </span>
      </div>

      {/* QR + bank details */}
      {(options.showQr || options.showBank) && inv.balance > 0 && (
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-[auto_1fr]">
          {options.showQr && (upiUri || org.bank?.qrImageUrl) && (
            <div className="grid place-items-center rounded-xl border border-slate-200 p-4">
              <PaymentQr imageUrl={org.bank?.qrImageUrl} value={upiUri} size={132} />
              <p className="mt-2 text-[11px] text-slate-500">{org.bank?.qrImageUrl ? "Scan to pay" : "Scan with any UPI app"}</p>
              {org.bank?.upi && !org.bank?.qrImageUrl && (
                <p className="font-mono text-xs font-medium text-brand-700">{org.bank.upi}</p>
              )}
            </div>
          )}
          {options.showBank && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-400">
                Bank transfer (NEFT / IMPS)
              </p>
              <BankRow label="Account" value={org.bank?.accountName} />
              <BankRow label="A/C no." value={org.bank?.accountNo} mono />
              <BankRow label="IFSC" value={org.bank?.ifsc} mono />
              <BankRow label="Bank" value={org.bank?.bank} />
              <BankRow label="Reference" value={reference} mono highlight />
            </div>
          )}
        </div>
      )}

      {options.message && (
        <p className="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
          {options.message}
        </p>
      )}

      <p className="border-t border-slate-100 px-5 py-3 text-center text-[11px] text-slate-400">
        Always quote reference <span className="font-medium text-slate-500">{reference}</span> so
        your payment can be matched. This slip is computer-generated.
      </p>
    </div>
  );
}

function BankRow({ label, value, mono, highlight }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-400">{label}</span>
      <span
        className={`${mono ? "font-mono " : ""}${
          highlight ? "font-semibold text-brand-700" : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ============================ View-options panel ===========================
 * The "edit / modify view options" surface — admins toggle blocks + add a note.
 */
const TOGGLES = [
  { key: "showHeader", label: "Association header" },
  { key: "showBreakdown", label: "Charge breakdown" },
  { key: "showLateFee", label: "Late-fee line" },
  { key: "showDueDate", label: "Due date" },
  { key: "showQr", label: "UPI QR / pay link" },
  { key: "showBank", label: "Bank details" },
];

function OptionsPanel({ options, onChange }) {
  const set = (key, value) => onChange({ ...options, [key]: value });
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Icon name="sliders-horizontal" size={13} /> Slip layout
      </p>
      <div className="grid grid-cols-1 gap-1.5">
        {TOGGLES.map((t) => (
          <label
            key={t.key}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            {t.label}
            <input
              type="checkbox"
              checked={!!options[t.key]}
              onChange={(e) => set(t.key, e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
          </label>
        ))}
      </div>
      <Field label="Note on slip (optional)">
        <textarea
          rows={2}
          value={options.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="e.g. Pay before the due date to avoid a 2% late penalty."
          className={`${inputClass} resize-none`}
        />
      </Field>
    </div>
  );
}

/* ============================ Inline pay: admin ============================
 * Admin records money actually received (cash/transfer/UPI). Hits the immutable
 * payments endpoint, which issues a receipt + posts to the treasury ledger.
 */
function AdminRecordForm({ inv, onPaid, onClose }) {
  const toast = useToast();
  const [amount, setAmount] = useState(inv.balance);
  const [mode, setMode] = useState("upi");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const record = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return toast("Enter a valid amount", "error");
    setSaving(true);
    try {
      const { data } = await api.post("/admin/billing/payments", {
        invoiceId: inv.dbId,
        amount: amt,
        mode,
        reference,
        paidOn: date,
      });
      setDone({ receipt: data.receiptNumber, balance: data.invoice?.balance ?? 0 });
      toast(`Recorded ${formatINR(amt)} · ${data.receiptNumber}`);
      onPaid?.();
    } catch (e) {
      toast(e.message || "Could not record payment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm">
        <Icon name="check-circle-2" size={22} className="mx-auto text-brand-600" />
        <p className="mt-1 font-semibold text-brand-800">Payment recorded · {done.receipt}</p>
        <p className="text-brand-700">
          {done.balance > 0 ? `Balance ${formatINR(done.balance)}` : "Invoice fully paid"}
        </p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-800">Record a payment</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)">
          <input
            type="number"
            min="0"
            max={inv.balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Mode">
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Paid on">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Reference / UTR">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="optional"
            className={inputClass}
          />
        </Field>
      </div>
      <Button icon="hand-coins" className="w-full" loading={saving} onClick={record}>
        Record {formatINR(Number(amount) || 0)}
      </Button>
    </div>
  );
}

/* ============================ Inline pay: member ==========================
 * Tap-to-pay via the executable UPI link (mobile), or scan the QR on the slip.
 * After paying, the member confirms with the UTR — recorded as a real payment.
 * If Stripe is configured, an online card option is offered too.
 */
function MemberPaySection({ inv, upiUri, onPaid }) {
  const toast = useToast();
  const [amount, setAmount] = useState(inv.balance);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const confirm = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return toast("Enter a valid amount", "error");
    setSaving(true);
    try {
      const { data } = await api.post("/member/billing/pay", {
        invoiceId: inv.dbId,
        amount: amt,
        mode: "upi",
        reference,
      });
      setDone(data?.receiptNumber || "recorded");
      toast(`Payment confirmed${data?.receiptNumber ? ` · ${data.receiptNumber}` : ""}`);
      onPaid?.();
    } catch (e) {
      toast(e.message || "Could not confirm payment", "error");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm">
        <Icon name="check-circle-2" size={22} className="mx-auto text-brand-600" />
        <p className="mt-1 font-semibold text-brand-800">Thank you — payment confirmed</p>
        {done !== "recorded" && <p className="text-brand-700">Receipt {done}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-800">Pay {formatINR(inv.balance)}</p>
      {upiUri ? (
        <a href={upiUri} className="block">
          <Button icon="smartphone" className="w-full">
            Pay via UPI app
          </Button>
        </a>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          UPI isn’t configured yet — use the bank details on the slip, then confirm below.
        </p>
      )}

      <StripeCardButton invoice={inv} onPaid={onPaid} />

      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">Already paid? Confirm it here</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Amount (₹)">
            <input
              type="number"
              min="0"
              max={inv.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="UPI / UTR ref">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 4012…"
              className={inputClass}
            />
          </Field>
        </div>
        <Button variant="secondary" icon="check" className="mt-2 w-full" loading={saving} onClick={confirm}>
          I’ve paid — confirm
        </Button>
      </div>
    </div>
  );
}

/* ================================ The modal ================================ */
export function PaymentSlipModal({ open, onClose, invoice, role = "admin", onPaid }) {
  const toast = useToast();
  const { settings } = useSettings();
  const inv = useMemo(() => toSlipInvoice(invoice ?? {}), [invoice]);
  const [options, setOptions] = useState(() => slipOptions(settings));
  const [shareOpen, setShareOpen] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);

  // Adopt the association's saved defaults once settings load. Stringify so a new
  // settings object with identical content doesn't clobber in-progress edits.
  const savedKey = JSON.stringify(settings?.slip ?? {});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync defaults on open
    if (open) setOptions(slipOptions(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, savedKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const org = {
    name: settings.name,
    location: settings.location,
    registrationNo: settings.registrationNo,
    fy: settings.fy,
    bank: settings.bank,
  };
  const reference = paymentReference(inv);
  const payeeName = settings.bank?.qrPayeeName || settings.bank?.accountName || settings.name;
  const note = `${inv.id} ${inv.plan}`.trim();
  const upiUri = buildUpiUri({
    vpa: settings.bank?.upi,
    payeeName,
    amount: inv.balance,
    note,
    reference,
  });

  const saveDefault = async () => {
    setSavingDefault(true);
    try {
      await api.put("/admin/settings", { slip: options });
      toast("Saved as the association default");
    } catch (e) {
      toast(e.message || "Could not save default", "error");
    } finally {
      setSavingDefault(false);
    }
  };

  const shareText = [
    `Payment slip ${inv.id} — ${org.name}`,
    `${inv.owner}${inv.property ? ` · ${inv.property}` : ""}`,
    `Amount payable: ${formatINR(inv.balance)}${inv.dueDate ? ` (due ${inv.dueDate})` : ""}`,
    settings.bank?.upi ? `Pay to UPI: ${settings.bank.upi}` : "",
    `Reference: ${reference}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!open || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-4xl sm:rounded-2xl">
        {/* Header (not printed) */}
        <div className="no-print flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon name="receipt-indian-rupee" size={18} className="text-brand-600" />
            <h3 className="text-base font-semibold text-slate-800">Payment slip · {inv.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body: slip preview + controls */}
        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_300px]">
          <SlipDocument inv={inv} org={org} options={options} upiUri={upiUri} reference={reference} />

          <div className="no-print space-y-5">
            {role === "admin" && <OptionsPanel options={options} onChange={setOptions} />}

            <div className="border-t border-slate-100 pt-4">
              {!inv.dbId ? (
                // Synthesized "sample bill" — no real invoice to record against yet.
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Icon name="file-text" size={16} /> Sample bill
                  </p>
                  <p className="mt-1 leading-relaxed text-amber-700">
                    This is a preview the owner can pay from. To record payments against it,
                    generate a real invoice from <span className="font-medium">Billing → Invoices</span>.
                  </p>
                </div>
              ) : inv.balance > 0 ? (
                role === "admin" ? (
                  <AdminRecordForm inv={inv} onPaid={onPaid} onClose={onClose} />
                ) : (
                  <MemberPaySection inv={inv} upiUri={upiUri} onPaid={onPaid} />
                )
              ) : (
                <div className="rounded-xl bg-brand-50 p-4 text-center text-sm font-medium text-brand-700">
                  <Icon name="check-circle-2" size={22} className="mx-auto" />
                  This invoice is fully paid.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions (not printed) */}
        <div className="no-print flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          {role === "admin" && (
            <Button
              variant="ghost"
              icon="save"
              className="mr-auto"
              loading={savingDefault}
              onClick={saveDefault}
            >
              Save layout as default
            </Button>
          )}
          <Button variant="secondary" icon="share-2" onClick={() => setShareOpen(true)}>
            Share
          </Button>
          <Button icon="printer" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`Share slip · ${inv.id}`}
        shareTitle={`Payment slip ${inv.id}`}
        text={shareText}
        getFile={upiUri ? () => qrPngFile(upiUri, `pay-${inv.id}.png`) : undefined}
      />
    </div>
  );
}
