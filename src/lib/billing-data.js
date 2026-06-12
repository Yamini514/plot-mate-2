// Mock data for Module 1 — Maintenance Billing & Recurring Payments.
// Static literals (no Date.now / Math.random) for hydration safety.

export const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-Time" },
];

export const PROPERTY_TYPES = ["Apartment", "Villa", "Plot"];

// ---- Maintenance plans ----
export const plans = [
  { id: "PLN-01", name: "Monthly Maintenance", description: "Common-area upkeep, housekeeping & admin", amount: 2500, frequency: "monthly", dueDay: 1, lateFeeType: "fixed", lateFeeAmount: 100, propertyTypes: ["Apartment", "Villa", "Plot"], active: true, autoInvoice: true, subscribers: 248 },
  { id: "PLN-02", name: "Security Charges", description: "24×7 manned security & gate management", amount: 800, frequency: "monthly", dueDay: 1, lateFeeType: "fixed", lateFeeAmount: 50, propertyTypes: ["Apartment", "Villa", "Plot"], active: true, autoInvoice: true, subscribers: 248 },
  { id: "PLN-03", name: "Water Charges", description: "Bore-well, tanker & STP water supply", amount: 600, frequency: "monthly", dueDay: 5, lateFeeType: "percentage", lateFeeAmount: 2, propertyTypes: ["Apartment", "Villa"], active: true, autoInvoice: true, subscribers: 132 },
  { id: "PLN-04", name: "Parking Charges", description: "Covered & open parking allotment", amount: 400, frequency: "monthly", dueDay: 1, lateFeeType: "fixed", lateFeeAmount: 25, propertyTypes: ["Apartment"], active: true, autoInvoice: false, subscribers: 96 },
  { id: "PLN-05", name: "Clubhouse Charges", description: "Gym, pool & community hall access", amount: 1500, frequency: "quarterly", dueDay: 10, lateFeeType: "percentage", lateFeeAmount: 5, propertyTypes: ["Apartment", "Villa"], active: true, autoInvoice: true, subscribers: 88 },
  { id: "PLN-06", name: "Generator / Power Backup", description: "DG fuel & maintenance recovery", amount: 350, frequency: "monthly", dueDay: 5, lateFeeType: "fixed", lateFeeAmount: 25, propertyTypes: ["Apartment"], active: true, autoInvoice: true, subscribers: 96 },
  { id: "PLN-07", name: "Sinking Fund", description: "Capital reserve for major repairs", amount: 6000, frequency: "yearly", dueDay: 15, lateFeeType: "percentage", lateFeeAmount: 2, propertyTypes: ["Apartment", "Villa", "Plot"], active: true, autoInvoice: true, subscribers: 248 },
  { id: "PLN-08", name: "Diwali Decoration (One-Time)", description: "Festive lighting & community event", amount: 500, frequency: "one_time", dueDay: 20, lateFeeType: "fixed", lateFeeAmount: 0, propertyTypes: ["Apartment", "Villa", "Plot"], active: false, autoInvoice: false, subscribers: 0 },
];

// ---- Invoices ----
export const invoices = [
  { id: "INV-2026-0412", owner: "Naveen Varma", property: "P-047", type: "Plot", plan: "Monthly Maintenance", amount: 2500, lateFee: 0, paid: 2500, balance: 0, issued: "2026-06-01", dueDate: "2026-06-10", status: "paid", method: "UPI" },
  { id: "INV-2026-0411", owner: "Lakshmi Reddy", property: "A-1102", type: "Apartment", plan: "Monthly Maintenance", amount: 2500, lateFee: 0, paid: 1500, balance: 1000, issued: "2026-06-01", dueDate: "2026-06-10", status: "partially_paid", method: "UPI" },
  { id: "INV-2026-0410", owner: "Suresh Kumar", property: "A-0008", type: "Apartment", plan: "Monthly Maintenance", amount: 2500, lateFee: 100, paid: 0, balance: 2600, issued: "2026-05-01", dueDate: "2026-05-10", status: "overdue", method: "—" },
  { id: "INV-2026-0409", owner: "Meena Joshi", property: "V-203", type: "Villa", plan: "Clubhouse Charges", amount: 1500, lateFee: 0, paid: 0, balance: 1500, issued: "2026-06-01", dueDate: "2026-06-12", status: "sent", method: "—" },
  { id: "INV-2026-0408", owner: "Arjun Mehta", property: "A-1506", type: "Apartment", plan: "Security Charges", amount: 800, lateFee: 0, paid: 800, balance: 0, issued: "2026-06-01", dueDate: "2026-06-10", status: "paid", method: "Card" },
  { id: "INV-2026-0407", owner: "Divya Sharma", property: "V-061", type: "Villa", plan: "Sinking Fund", amount: 6000, lateFee: 0, paid: 0, balance: 6000, issued: "2026-06-01", dueDate: "2026-06-15", status: "generated", method: "—" },
  { id: "INV-2026-0406", owner: "Kiran Patel", property: "A-0098", type: "Apartment", plan: "Water Charges", amount: 600, lateFee: 12, paid: 0, balance: 612, issued: "2026-05-05", dueDate: "2026-05-12", status: "overdue", method: "—" },
  { id: "INV-2026-0405", owner: "Pooja Iyer", property: "A-1134", type: "Apartment", plan: "Monthly Maintenance", amount: 2500, lateFee: 0, paid: 2500, balance: 0, issued: "2026-06-01", dueDate: "2026-06-10", status: "paid", method: "Net banking" },
  { id: "INV-2026-0404", owner: "Rohan Gupta", property: "P-077", type: "Plot", plan: "Monthly Maintenance", amount: 2500, lateFee: 0, paid: 0, balance: 2500, issued: "2026-06-01", dueDate: "2026-06-10", status: "sent", method: "—" },
  { id: "INV-2026-0403", owner: "Harika Rao", property: "A-0019", type: "Apartment", plan: "Parking Charges", amount: 400, lateFee: 0, paid: 400, balance: 0, issued: "2026-06-01", dueDate: "2026-06-10", status: "paid", method: "Cash" },
  { id: "INV-2026-0402", owner: "Sai Teja", property: "V-188", type: "Villa", plan: "Monthly Maintenance", amount: 2500, lateFee: 0, paid: 0, balance: 2500, issued: "2026-06-01", dueDate: "2026-06-10", status: "draft", method: "—" },
  { id: "INV-2026-0401", owner: "Ananya Bose", property: "A-0042", type: "Apartment", plan: "Generator / Power Backup", amount: 350, lateFee: 0, paid: 350, balance: 0, issued: "2026-06-01", dueDate: "2026-06-05", status: "paid", method: "UPI" },
];

// ---- Collection dashboard stats ----
export const billingStats = (() => {
  const totalBilled = invoices.reduce((s, i) => s + i.amount + i.lateFee, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paid, 0);
  const pending = invoices.filter((i) => ["sent", "generated", "partially_paid"].includes(i.status)).reduce((s, i) => s + i.balance, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.balance, 0);
  return {
    totalBilled,
    totalCollected,
    pending,
    overdue,
    collectionRate: Math.round((totalCollected / totalBilled) * 1000) / 10,
    invoiceCount: invoices.length,
    defaulters: invoices.filter((i) => i.status === "overdue").length,
    // Wider month-level numbers for the dashboard headline tiles
    monthBilled: 7_42_000,
    monthCollected: 5_98_400,
    monthPending: 1_43_600,
    monthOverdue: 86_200,
  };
})();

export const collectionTrend = [
  { month: "Jan", billed: 690000, collected: 642000 },
  { month: "Feb", billed: 705000, collected: 668000 },
  { month: "Mar", billed: 712000, collected: 690000 },
  { month: "Apr", billed: 726000, collected: 651000 },
  { month: "May", billed: 738000, collected: 712000 },
  { month: "Jun", billed: 742000, collected: 598400 },
];

export const collectionByCommunity = [
  { name: "Green Aero View", value: 312000 },
  { name: "Lake Vista Apartments", value: 268000 },
  { name: "Palm Meadows Villas", value: 184000 },
  { name: "Sunrise Plots", value: 134400 },
];

export const outstandingAging = [
  { name: "0–15 days", value: 64200, color: "#f59e0b" },
  { name: "16–30 days", value: 41000, color: "#f97316" },
  { name: "31–60 days", value: 28800, color: "#ef4444" },
  { name: "60+ days", value: 9600, color: "#b91c1c" },
];

// ---- Owner portal (member view) ----
export const myInvoices = [
  { id: "INV-2026-0412", plan: "Monthly Maintenance", period: "Jun 2026", amount: 2500, paid: 2500, balance: 0, dueDate: "2026-06-10", status: "paid", method: "UPI", paidOn: "2026-06-03" },
  { id: "INV-2026-0356", plan: "Monthly Maintenance", period: "May 2026", amount: 2500, paid: 2500, balance: 0, dueDate: "2026-05-10", status: "paid", method: "UPI", paidOn: "2026-05-04" },
  { id: "INV-2026-0291", plan: "Sinking Fund", period: "FY 2026", amount: 6000, paid: 6000, balance: 0, dueDate: "2026-04-15", status: "paid", method: "Net banking", paidOn: "2026-04-12" },
  { id: "INV-2026-0288", plan: "Monthly Maintenance", period: "Apr 2026", amount: 2500, paid: 2500, balance: 0, dueDate: "2026-04-10", status: "paid", method: "Card", paidOn: "2026-04-08" },
];

export const myUpcoming = [
  { id: "INV-2026-0467", plan: "Monthly Maintenance", period: "Jul 2026", amount: 2500, dueDate: "2026-07-10", status: "due" },
  { id: "INV-2026-0468", plan: "Security Charges", period: "Jul 2026", amount: 800, dueDate: "2026-07-10", status: "due" },
];

export const myBillingSummary = {
  totalDue: 3300,
  nextDue: "2026-07-10",
  paidThisYear: 13500,
  autopay: false,
};
