export const association = {
  name: "Green Aero View",
  type: "Plot Owners' Welfare Association",
  location: "Tukkuguda, Hyderabad, Telangana 501359",
  registrationNo: "TS/HYD/PWA/2022/1184",
  totalPlots: 280,
  establishedOn: "2022-01-15",
  fy: "2024–25",
  ratePerSqyd: 30, // maintenance rate per sqyd per year
  bank: {
    accountName: "Green Aero View Welfare Association",
    accountNo: "50100789456123",
    ifsc: "HDFC0001184",
    bank: "HDFC Bank, Shamshabad Branch",
    upi: "greenaeroview@hdfcbank",
  },
  committee: {
    secretary: { name: "Suresh Kumar", phone: "+91 98480 11223" },
    president: { name: "Ramesh Reddy", phone: "+91 98765 44556" },
    treasurer: { name: "Lakshmi Narayana", phone: "+91 99012 33445" },
  },
};

// ---- deterministic pseudo-random (avoids hydration mismatch) ----
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna",
  "Ishaan", "Rohan", "Lakshmi", "Priya", "Ananya", "Sneha", "Divya", "Kavya",
  "Meera", "Pooja", "Swathi", "Harika", "Naveen", "Suresh", "Ramesh", "Kiran",
  "Mahesh", "Srinivas", "Venkat", "Prasad", "Anil", "Bhaskar",
];
const LAST = [
  "Reddy", "Rao", "Kumar", "Sharma", "Naidu", "Goud", "Chowdary", "Varma",
  "Prasad", "Murthy", "Iyer", "Pillai", "Shetty", "Patel", "Gupta", "Nair",
];
const PHASES = ["Phase 1", "Phase 2", "Phase 3"];
const SIZES = [150, 167, 200, 250, 300, 400];

function genOwners() {
  const owners = [];
  // Status distribution roughly matching the reference: paid / pending / unknown
  for (let i = 1; i <= association.totalPlots; i++) {
    const r = rand();
    let status;
    if (r < 0.318) status = "paid";
    else if (r < 0.536) status = "pending";
    else status = "unknown";

    const size = pick(SIZES);
    const fee = size * association.ratePerSqyd;
    const known = status !== "unknown" || rand() > 0.55;
    const name = known ? `${pick(FIRST)} ${pick(LAST)}` : null;
    const plotNo = `P-${String(i).padStart(3, "0")}`;
    const daysOverdue =
      status === "pending" ? 20 + Math.floor(rand() * 80) : 0;

    owners.push({
      id: plotNo,
      plotNo,
      name,
      phone: known ? `+91 9${Math.floor(700000000 + rand() * 99999999)}` : null,
      email: known && name ? `${name.split(" ")[0].toLowerCase()}@example.com` : null,
      sizeSqyd: size,
      phase: pick(PHASES),
      amountDue: status === "paid" ? 0 : fee,
      paymentStatus: status,
      membership: known && rand() > 0.3 ? "verified" : "unverified",
      daysOverdue,
      lastPaymentDate:
        status === "paid"
          ? `2025-0${1 + Math.floor(rand() * 6)}-${String(1 + Math.floor(rand() * 27)).padStart(2, "0")}`
          : null,
    });
  }
  return owners;
}

export const owners = genOwners();

// ---- derived aggregate stats ----
export const stats = (() => {
  const paid = owners.filter((o) => o.paymentStatus === "paid");
  const pending = owners.filter((o) => o.paymentStatus === "pending");
  const unknown = owners.filter((o) => o.paymentStatus === "unknown");
  const target = owners.reduce(
    (s, o) => s + o.sizeSqyd * association.ratePerSqyd,
    0,
  );
  const collected = paid.reduce(
    (s, o) => s + o.sizeSqyd * association.ratePerSqyd,
    0,
  );
  const outstanding = pending.reduce((s, o) => s + o.amountDue, 0);
  return {
    paidCount: paid.length,
    pendingCount: pending.length,
    unknownCount: unknown.length,
    target,
    collected,
    outstanding,
    collectionRate: Math.round((collected / target) * 1000) / 10,
    treasuryBalance: 785240,
  };
})();

export const payments = [
  { id: "PMT-1042", plotNo: "P-012", ownerName: "Arjun Reddy", date: "2025-05-28", amount: 6000, type: "maintenance", mode: "upi", reference: "UTR9921ABC", fy: "2024–25" },
  { id: "PMT-1041", plotNo: "P-088", ownerName: "Priya Sharma", date: "2025-05-27", amount: 7500, type: "maintenance", mode: "bank", reference: "NEFT77123", fy: "2024–25" },
  { id: "PMT-1040", plotNo: "P-145", ownerName: "Venkat Rao", date: "2025-05-25", amount: 5010, type: "maintenance", mode: "upi", reference: "UTR8810XYZ", fy: "2024–25" },
  { id: "PMT-1039", plotNo: "P-201", ownerName: "Sneha Naidu", date: "2025-05-22", amount: 2000, type: "membership", mode: "cash", reference: "CASH-0091", fy: "2024–25" },
  { id: "PMT-1038", plotNo: "P-033", ownerName: "Mahesh Goud", date: "2025-05-20", amount: 12000, type: "maintenance", mode: "cheque", reference: "CHQ-556712", fy: "2024–25" },
  { id: "PMT-1037", plotNo: "P-167", ownerName: "Kavya Iyer", date: "2025-05-18", amount: 6000, type: "maintenance", mode: "upi", reference: "UTR4456PQR", fy: "2024–25" },
  { id: "PMT-1036", plotNo: "P-099", ownerName: "Srinivas Murthy", date: "2025-05-15", amount: 9000, type: "maintenance", mode: "bank", reference: "NEFT66021", fy: "2024–25" },
  { id: "PMT-1035", plotNo: "P-047", ownerName: "Naveen Varma", date: "2024-04-12", amount: 2000, type: "membership", mode: "upi", reference: "UTR1102MEM", fy: "2024–25" },
];

export const expenses = [
  { id: "EXP-220", date: "2025-05-26", description: "Internal road patchwork – Phase 2", category: "Road work", vendor: "Sri Sai Constructions", amount: 145000, notes: "1.2 km stretch" },
  { id: "EXP-219", date: "2025-05-19", description: "Street light repairs (12 poles)", category: "Street lights", vendor: "Bright Electricals", amount: 38400 },
  { id: "EXP-218", date: "2025-05-10", description: "Security guard salaries – May", category: "Salaries", vendor: "SecureGuard Services", amount: 64000 },
  { id: "EXP-217", date: "2025-05-05", description: "Sapling plantation drive", category: "Plantation", vendor: "Green Earth Nursery", amount: 22500, notes: "300 saplings" },
  { id: "EXP-216", date: "2025-04-28", description: "Compound wall – north boundary", category: "Compound wall", vendor: "Sri Sai Constructions", amount: 210000 },
  { id: "EXP-215", date: "2025-04-22", description: "Drainage de-silting", category: "Drainage", vendor: "AquaClean", amount: 41000 },
  { id: "EXP-214", date: "2025-04-15", description: "Water tanker supply (10 trips)", category: "Water", vendor: "Krishna Water Suppliers", amount: 18000 },
  { id: "EXP-213", date: "2025-04-08", description: "Housekeeping & garbage clearance", category: "Other", vendor: "CleanCity", amount: 27000 },
];

export const monthlyTrend = [
  { month: "Dec", collected: 62000, expenses: 41000 },
  { month: "Jan", collected: 128000, expenses: 88000 },
  { month: "Feb", collected: 156000, expenses: 62000 },
  { month: "Mar", collected: 204000, expenses: 121000 },
  { month: "Apr", collected: 188000, expenses: 314000 },
  { month: "May", collected: 233000, expenses: 285900 },
];

export const announcements = [
  { id: "AN-30", title: "Annual General Body Meeting – 22 June", body: "All plot owners are requested to attend the AGM on Sunday, 22 June 2025 at 10:00 AM at the community hall. Agenda: FY 2024–25 accounts, road work plan, and committee elections.", author: "Suresh Kumar (Secretary)", date: "2025-06-02", type: "meeting", pinned: true },
  { id: "AN-29", title: "Maintenance fee due date extended to 30 June", body: "Owners who have not yet paid the FY 2024–25 maintenance fee can do so without penalty until 30 June 2025. Please clear dues promptly to support ongoing development.", author: "Lakshmi Narayana (Treasurer)", date: "2025-05-29", type: "deadline" },
  { id: "AN-28", title: "Phase 2 road work completed", body: "The internal road patchwork in Phase 2 has been completed. Thank you for your patience during the work.", author: "Suresh Kumar (Secretary)", date: "2025-05-27", type: "progress" },
  { id: "AN-27", title: "New security agency onboarded", body: "SecureGuard Services has taken over gate security from 1 May. Please cooperate with the visitor entry process.", author: "Ramesh Reddy (President)", date: "2025-05-02", type: "general" },
];

const photoColors = ["10b981", "0ea5e9", "f59e0b", "8b5cf6", "ef4444", "14b8a6"];
function ph(category, i, caption, date) {
  const c = photoColors[i % photoColors.length];
  return {
    id: `IMG-${i}`,
    url: `https://placehold.co/600x400/${c}/ffffff?text=${encodeURIComponent(category)}`,
    caption,
    category,
    date,
  };
}
export const sitePhotos = [
  ph("Road work", 1, "Phase 2 main road – before", "2025-05-12"),
  ph("Road work", 2, "Phase 2 main road – after", "2025-05-26"),
  ph("Street lights", 3, "New LED poles on cross road 4", "2025-05-19"),
  ph("Compound wall", 4, "North boundary wall progress", "2025-04-28"),
  ph("Plantation", 5, "Avenue plantation drive", "2025-05-05"),
  ph("Plantation", 6, "Park area saplings", "2025-05-06"),
  ph("Drainage", 7, "Storm-water drain de-silting", "2025-04-22"),
  ph("Compound wall", 8, "Main gate construction", "2025-03-18"),
  ph("Road work", 9, "Cross road 7 leveling", "2025-03-30"),
];

export const documents = [
  { id: "DOC-1", name: "Layout Approval (DTCP).pdf", category: "Legal", size: "2.4 MB", uploadedBy: "Suresh Kumar", date: "2024-02-10" },
  { id: "DOC-2", name: "Association Bye-laws.pdf", category: "Legal", size: "880 KB", uploadedBy: "Ramesh Reddy", date: "2022-01-20" },
  { id: "DOC-3", name: "Audited Accounts FY 2023-24.pdf", category: "Financial", size: "1.1 MB", uploadedBy: "Lakshmi Narayana", date: "2024-07-15" },
  { id: "DOC-4", name: "AGM Minutes 2024.pdf", category: "Meeting Minutes", size: "420 KB", uploadedBy: "Suresh Kumar", date: "2024-06-25" },
  { id: "DOC-5", name: "Master Layout Plan.png", category: "Layout", size: "3.8 MB", uploadedBy: "Suresh Kumar", date: "2022-03-01" },
  { id: "DOC-6", name: "Vendor Agreement – Security.pdf", category: "Other", size: "640 KB", uploadedBy: "Ramesh Reddy", date: "2025-05-01" },
];

export const complaints = [
  { id: "CMP-051", title: "Street light not working near P-120", description: "The pole light at cross road 5 has been off for a week.", category: "Electricity", raisedBy: "Naveen Varma", plotNo: "P-047", status: "open", priority: "medium", createdAt: "2025-06-05", updatedAt: "2025-06-05" },
  { id: "CMP-050", title: "Water stagnation after rain", description: "Drain near Phase 1 entrance overflows during rain.", category: "Water", raisedBy: "Priya Sharma", plotNo: "P-088", status: "in_progress", priority: "high", createdAt: "2025-06-01", updatedAt: "2025-06-04", assignedTo: "AquaClean" },
  { id: "CMP-049", title: "Garbage not collected on time", description: "Garbage clearance has been irregular in Phase 3.", category: "Cleanliness", raisedBy: "Kavya Iyer", plotNo: "P-167", status: "resolved", priority: "low", createdAt: "2025-05-20", updatedAt: "2025-05-24", assignedTo: "CleanCity" },
  { id: "CMP-048", title: "Pothole on cross road 7", description: "Large pothole causing two-wheeler issues.", category: "Roads", raisedBy: "Venkat Rao", plotNo: "P-145", status: "open", priority: "high", createdAt: "2025-06-06", updatedAt: "2025-06-06" },
  { id: "CMP-047", title: "Gate guard absent at night", description: "Night shift guard was missing on 2 June.", category: "Security", raisedBy: "Mahesh Goud", plotNo: "P-033", status: "closed", priority: "medium", createdAt: "2025-06-02", updatedAt: "2025-06-03", assignedTo: "SecureGuard Services" },
];

export const amenities = [
  { id: "AM-1", name: "Community Hall", description: "Air-conditioned hall, seats 150. Ideal for functions & meetings.", capacity: 150, hourlyRate: 1500, icon: "building", status: "available" },
  { id: "AM-2", name: "Open Lawn", description: "Landscaped lawn for outdoor events.", capacity: 300, hourlyRate: 1000, icon: "trees", status: "available" },
  { id: "AM-3", name: "Children's Play Area", description: "Swings, slides and sandpit.", capacity: 40, hourlyRate: 0, icon: "baby", status: "available" },
  { id: "AM-4", name: "Indoor Games Room", description: "Carrom, table tennis and chess.", capacity: 20, hourlyRate: 300, icon: "gamepad-2", status: "maintenance" },
];

export const bookings = [
  { id: "BK-21", amenityId: "AM-1", amenityName: "Community Hall", bookedBy: "Priya Sharma", plotNo: "P-088", date: "2025-06-15", slot: "10:00 – 14:00", status: "confirmed", amount: 6000 },
  { id: "BK-20", amenityId: "AM-2", amenityName: "Open Lawn", bookedBy: "Mahesh Goud", plotNo: "P-033", date: "2025-06-20", slot: "17:00 – 21:00", status: "pending", amount: 4000 },
  { id: "BK-19", amenityId: "AM-1", amenityName: "Community Hall", bookedBy: "Venkat Rao", plotNo: "P-145", date: "2025-06-22", slot: "09:00 – 13:00", status: "confirmed", amount: 6000 },
];

export const events = [
  { id: "EV-12", title: "Annual General Body Meeting", description: "FY accounts review and committee elections.", date: "2025-06-22", time: "10:00 AM", location: "Community Hall", type: "meeting", rsvpCount: 84 },
  { id: "EV-11", title: "Tree Plantation Drive", description: "Plant 200 saplings along the avenue. Volunteers welcome.", date: "2025-06-28", time: "07:00 AM", location: "Phase 2 Avenue", type: "maintenance", rsvpCount: 36 },
  { id: "EV-10", title: "Community Clean-up Sunday", description: "Monthly cleanliness drive across all phases.", date: "2025-07-06", time: "08:00 AM", location: "Main Gate", type: "social", rsvpCount: 22 },
];

export const polls = [
  {
    id: "PL-7",
    question: "Should we install solar street lights in Phase 3?",
    description: "Estimated cost ₹4.2L, funded from the corpus. One-time spend, lower long-term electricity bills.",
    options: [
      { id: "a", label: "Yes, proceed", votes: 96 },
      { id: "b", label: "No, defer to next year", votes: 28 },
      { id: "c", label: "Need more details", votes: 17 },
    ],
    status: "active",
    createdAt: "2025-06-01",
    closesAt: "2025-06-18",
    totalVoters: 141,
  },
  {
    id: "PL-6",
    question: "Preferred date for the annual community day?",
    description: "Pick the date that works best for the family event.",
    options: [
      { id: "a", label: "2nd August", votes: 54 },
      { id: "b", label: "9th August", votes: 71 },
      { id: "c", label: "16th August", votes: 33 },
    ],
    status: "active",
    createdAt: "2025-05-28",
    closesAt: "2025-06-12",
    totalVoters: 158,
  },
];

export const visitors = [
  { id: "VS-301", name: "Amazon Delivery", phone: "+91 90000 12345", visitingPlot: "P-088", purpose: "Parcel delivery", vehicleNo: "TS09 EK 4521", checkIn: "2026-06-09T09:12:00", checkOut: null, status: "inside" },
  { id: "VS-300", name: "Ravi (Plumber)", phone: "+91 90000 99887", visitingPlot: "P-047", purpose: "Plumbing repair", checkIn: "2026-06-09T08:40:00", checkOut: "2026-06-09T10:05:00", status: "left" },
  { id: "VS-299", name: "Guests – Reddy family", phone: "+91 90000 55667", visitingPlot: "P-012", purpose: "Personal visit", vehicleNo: "AP28 BC 1199", checkIn: "2026-06-09T11:00:00", checkOut: null, status: "expected" },
];

export const staff = [
  { id: "ST-1", name: "Govind Singh", role: "Head Security Guard", phone: "+91 98111 22334", monthlySalary: 18000, joinedOn: "2023-03-01", status: "active", type: "staff" },
  { id: "ST-2", name: "Ramu", role: "Gardener", phone: "+91 98222 33445", monthlySalary: 14000, joinedOn: "2022-08-15", status: "active", type: "staff" },
  { id: "ST-3", name: "Sunita", role: "Housekeeping", phone: "+91 98333 44556", monthlySalary: 12000, joinedOn: "2024-01-10", status: "on_leave", type: "staff" },
  { id: "ST-4", name: "SecureGuard Services", role: "Security Agency", phone: "+91 40 2345 6789", monthlySalary: 64000, joinedOn: "2025-05-01", status: "active", type: "vendor" },
  { id: "ST-5", name: "CleanCity", role: "Garbage & Housekeeping", phone: "+91 40 9876 5432", monthlySalary: 27000, joinedOn: "2024-06-01", status: "active", type: "vendor" },
];

export const reminders = owners
  .filter((o) => o.paymentStatus === "pending")
  .slice(0, 8)
  .map((o, i) => ({
    id: `RM-${i + 1}`,
    plotNo: o.plotNo,
    ownerName: o.name ?? "Owner",
    amount: o.amountDue,
    channel: ["whatsapp", "sms", "email"][i % 3],
    scheduledFor: "2026-06-10T09:00:00",
    status: ["scheduled", "sent", "responded"][i % 3],
  }));

export const recentActivity = [
  { id: "AC-1", type: "payment", text: "Arjun Reddy (P-012) paid ₹6,000 maintenance fee", time: "2 hours ago" },
  { id: "AC-2", type: "complaint", text: "New complaint: Pothole on cross road 7 (P-145)", time: "5 hours ago" },
  { id: "AC-3", type: "booking", text: "Priya Sharma booked Community Hall for 15 June", time: "1 day ago" },
  { id: "AC-4", type: "payment", text: "Priya Sharma (P-088) paid ₹7,500 maintenance fee", time: "1 day ago" },
  { id: "AC-5", type: "announcement", text: "AGM announcement posted by Secretary", time: "2 days ago" },
  { id: "AC-6", type: "expense", text: "₹1,45,000 expense added – Phase 2 road patchwork", time: "3 days ago" },
];

// The logged-in member's own plot (for the member panel)
export const currentMemberPlot = "P-047";
export function getMemberOwner() {
  return (
    owners.find((o) => o.plotNo === currentMemberPlot) ?? {
      ...owners[46],
      name: "Naveen Varma",
      phone: association.committee.secretary.phone,
      paymentStatus: "pending",
      amountDue: 6000,
      sizeSqyd: 200,
      daysOverdue: 42,
      phase: "Phase 2",
    }
  );
}

export const memberPayments = [
  { id: "PMT-1035", plotNo: "P-047", ownerName: "Naveen Varma", date: "2024-04-12", amount: 2000, type: "membership", mode: "upi", reference: "UTR1102MEM", fy: "2024–25" },
  { id: "PMT-0921", plotNo: "P-047", ownerName: "Naveen Varma", date: "2024-03-20", amount: 6000, type: "maintenance", mode: "upi", reference: "UTR0098PRV", fy: "2023–24" },
  { id: "PMT-0790", plotNo: "P-047", ownerName: "Naveen Varma", date: "2023-04-05", amount: 6000, type: "maintenance", mode: "bank", reference: "NEFT44120", fy: "2022–23" },
];

export const expenseByCategory = (() => {
  const map = new Map();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  return [...map.entries()].map(([name, value]) => ({ name, value }));
})();
