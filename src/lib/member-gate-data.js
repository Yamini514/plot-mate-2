// Owner-facing Gate & Visitor management (resident side of the gate flow).
// Pre-register guests → QR gate pass; approve live walk-ins; manage frequent
// help passes and deliveries. Static literals for hydration safety.

// Properties the owner can pre-register against (mirrors member-data plots).
export const myProperties = [
  { id: "P-047", label: "P-047 · Plot (Phase 2)" },
  { id: "P-112", label: "P-112 · Plot (Phase 1)" },
  { id: "V-203", label: "V-203 · Villa (Phase 3)" },
];

// Live gate requests waiting for the owner's approval (guard raised these).
export const pendingApprovals = [
  { id: "REQ-9012", name: "Priya Nair", phone: "+91 98230 55471", property: "P-047", purpose: "Family visit", type: "visitor", vehicle: "TS 10 CD 2231", requestedAt: "Just now", gate: "Main Gate" },
  { id: "REQ-9011", name: "Amazon — Sameer", phone: "+91 90090 11220", property: "V-203", purpose: "Package delivery", type: "delivery", vehicle: "—", requestedAt: "2 min ago", gate: "Main Gate" },
];

// Pre-registered upcoming guests (each carries a QR gate pass).
export const expectedVisitors = [
  { id: "EXP-3301", name: "Anil Deshmukh", phone: "+91 99632 41102", property: "P-047", purpose: "Guest", date: "Today", window: "06:00 PM – 09:00 PM", pass: "GAV-8842-XK", status: "expected", vehicle: "TS 10 CD 2231" },
  { id: "EXP-3302", name: "Dr. Karthik Rao", phone: "+91 97400 18820", property: "V-203", purpose: "Home visit (doctor)", date: "Today", window: "11:00 AM – 12:00 PM", pass: "GAV-7741-Q2", status: "arrived", vehicle: "TS 11 KL 0042" },
  { id: "EXP-3303", name: "Sneha Kulkarni", phone: "+91 98765 30021", property: "P-047", purpose: "Guest", date: "Tomorrow", window: "All day", pass: "GAV-6610-MM", status: "expected", vehicle: "—" },
  { id: "EXP-3304", name: "Catering — FreshBites", phone: "+91 91234 88990", property: "V-203", purpose: "Event setup", date: "14 Jun 2026", window: "08:00 AM – 02:00 PM", pass: "GAV-5521-ZA", status: "expected", vehicle: "TS 09 TR 4410" },
];

// Recurring daily/weekly help with standing passes.
export const frequentPasses = [
  { id: "FRQ-21", name: "Lakshmamma", role: "Maid", property: "P-047", window: "07:00 AM – 09:00 AM", days: "Mon–Sat", pass: "GAV-DM-2201", active: true },
  { id: "FRQ-22", name: "Ravi Kumar", role: "Driver", property: "P-047", window: "08:00 AM – 08:00 PM", days: "Daily", pass: "GAV-DR-4412", active: true },
  { id: "FRQ-23", name: "Sarayu", role: "Cook", property: "V-203", window: "06:30 AM – 08:00 AM, 06:00 PM – 08:00 PM", days: "Daily", pass: "GAV-CK-8890", active: true },
  { id: "FRQ-24", name: "Mr. Iqbal", role: "Tutor", property: "V-203", window: "05:00 PM – 06:30 PM", days: "Mon, Wed, Fri", pass: "GAV-TU-1102", active: false },
];

// Deliveries grouped by state.
export const deliveries = {
  awaiting: [
    { id: "PKG-7742", courier: "Flipkart", property: "P-047", received: "08:10 AM", note: "Held at gate desk" },
    { id: "PKG-7747", courier: "Blue Dart", property: "V-203", received: "09:30 AM", note: "Held at gate desk" },
  ],
  expected: [
    { id: "EXP-AMZ-01", courier: "Amazon", property: "P-047", eta: "Today, by 6 PM", note: "Leave at gate enabled" },
    { id: "EXP-ZEP-02", courier: "Zepto", property: "V-203", eta: "Today, ~30 min", note: "Call on arrival" },
  ],
  recent: [
    { id: "PKG-7748", courier: "Zepto", property: "P-047", delivered: "Yesterday · 09:58 AM" },
    { id: "PKG-7701", courier: "DTDC", property: "V-203", delivered: "10 Jun · 04:12 PM" },
  ],
};

export const visitorHistory = [
  { id: "VIS-2418", name: "Anil Deshmukh", property: "P-047", purpose: "Guest", in: "Today 08:12 AM", out: "—", status: "inside" },
  { id: "VIS-2409", name: "Geeta Aunty", property: "P-047", purpose: "Family", in: "Yesterday 06:20 AM", out: "Yesterday 08:00 PM", status: "left" },
  { id: "VIS-2390", name: "Mohan Electricals", property: "V-203", purpose: "Maintenance", in: "10 Jun 10:05 AM", out: "10 Jun 11:40 AM", status: "left" },
  { id: "VIS-2375", name: "Swiggy — Rohit", property: "P-047", purpose: "Food delivery", in: "09 Jun 08:05 PM", out: "09 Jun 08:21 PM", status: "left" },
];

export const PURPOSES = ["Guest", "Family visit", "Maintenance", "Food delivery", "Package delivery", "Cab pickup", "Home visit (doctor)", "Event setup", "Other"];
export const HELP_ROLES = ["Maid", "Cook", "Driver", "Tutor", "Nanny", "Gardener", "Other"];
