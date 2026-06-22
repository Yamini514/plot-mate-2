// Payment-slip helpers.
//
// A "payment slip" is the formal, printable document we generate for an invoice.
// Its "executable data" is a real UPI payment intent (the QR/link an owner can
// scan or tap to pay) plus a stable reconciliation reference. These helpers are
// shared by the on-screen preview, the printable document, and both the admin
// (record) and member (pay/declare) flows so the numbers can never drift.

export const PAYMENT_MODES = ["upi", "card", "net_banking", "bank", "cash"];

export const MODE_LABELS = {
  upi: "UPI",
  card: "Card",
  net_banking: "Net banking",
  bank: "Bank transfer",
  cash: "Cash",
};

// Default slip view options. Admins toggle these per slip; the chosen set can be
// saved back to client settings (`settings.slip`) as the association default,
// which the member side then renders read-only.
export const DEFAULT_SLIP_OPTIONS = {
  showHeader: true, // association name / registration / location
  showBank: true, // account + IFSC for NEFT/IMPS
  showQr: true, // executable UPI QR + link
  showBreakdown: true, // base / late fee / tax / discount lines
  showDueDate: true,
  showLateFee: true,
  message: "", // free-text note printed under the breakdown
};

// Merge the association's saved slip defaults over the built-in defaults.
export function slipOptions(settings) {
  const saved = settings?.slip ?? {};
  return { ...DEFAULT_SLIP_OPTIONS, ...saved };
}

// Reconciliation reference an owner should quote with a manual transfer; also
// embedded in the UPI intent so inbound UPI/NEFT can be matched to the invoice.
export function paymentReference(invoice) {
  return invoice?.id || invoice?.number || (invoice?.dbId ? `INV-${invoice.dbId}` : "");
}

// Normalise an invoice row from either the admin list (owner/plan/issued/type)
// or the member overview (ownerName/planName/issuedOn/propertyType) into the one
// shape the slip understands. All money fields are already in rupees.
export function toSlipInvoice(raw = {}) {
  return {
    id: raw.id ?? raw.number,
    dbId: raw.dbId ?? raw.id,
    owner: raw.owner ?? raw.ownerName ?? "",
    property: raw.property ?? "",
    propertyType: raw.type ?? raw.propertyType ?? "",
    plan: raw.plan ?? raw.planName ?? "Maintenance",
    period: raw.period ?? "",
    amount: raw.amount ?? 0,
    lateFee: raw.lateFee ?? 0,
    tax: raw.tax ?? 0,
    discount: raw.discount ?? 0,
    paid: raw.paid ?? 0,
    balance: raw.balance ?? 0,
    issued: raw.issued ?? raw.issuedOn ?? "",
    dueDate: raw.dueDate ?? "",
    status: raw.status ?? "",
  };
}

// Build a real, executable UPI payment URI (NPCI deep-link spec). On mobile this
// opens GPay/PhonePe/Paytm with the amount + note prefilled; rendered as a QR it
// is scannable by any UPI app. Returns null when no payee VPA is configured (so
// callers can hide the QR block gracefully).
//   upi://pay?pa=<vpa>&pn=<payee>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
export function buildUpiUri({ vpa, payeeName, amount, note, reference }) {
  if (!vpa) return null;
  const p = new URLSearchParams();
  p.set("pa", vpa);
  if (payeeName) p.set("pn", payeeName);
  if (Number(amount) > 0) p.set("am", Number(amount).toFixed(2));
  p.set("cu", "INR");
  if (note) p.set("tn", note);
  if (reference) p.set("tr", reference);
  // URLSearchParams encodes spaces as "+"; UPI apps expect %20.
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}

// The slip's money lines. Returns rupee values; `kind` drives the sign styling.
export function breakdownRows(inv, options = DEFAULT_SLIP_OPTIONS) {
  const rows = [{ label: inv.plan || "Maintenance", value: inv.amount || 0, kind: "base" }];
  if (options.showLateFee && (inv.lateFee || 0) > 0)
    rows.push({ label: "Late fee", value: inv.lateFee, kind: "add" });
  if ((inv.tax || 0) > 0) rows.push({ label: "Tax / GST", value: inv.tax, kind: "add" });
  if ((inv.discount || 0) > 0)
    rows.push({ label: "Discount / waiver", value: -inv.discount, kind: "sub" });
  if ((inv.paid || 0) > 0) rows.push({ label: "Already paid", value: -inv.paid, kind: "sub" });
  return rows;
}

// Whether the gateway ("Pay online by card") path should be offered. The actual
// charge still runs through the backend Stripe intent + webhook; we only render
// the button when a publishable key is present so it's never broken in dev.
export function stripeEnabled() {
  return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
