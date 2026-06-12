// Multi-plot owner view for the Plot Owner (member) role.
// One logged-in owner can hold several plots, some jointly registered under
// more than one name. Each plot carries its own charges + security summary.
// Static literals (no Date.now / Math.random) for hydration safety.

export const myProfile = {
  name: "Naveen Varma",
  memberId: "MEM-047",
  phone: "+91 98480 11223",
  email: "naveen@example.com",
  membership: "verified",
  since: "2022-03-10",
};

export const myPlots = [
  {
    id: "P-047",
    plotNo: "P-047",
    type: "Plot",
    size: 200,
    phase: "Phase 2",
    facing: "East",
    registeredNames: [
      { name: "Naveen Varma", share: "Primary owner", primary: true },
      { name: "Sunita Varma", share: "Joint owner (spouse)", primary: false },
    ],
    paymentStatus: "pending",
    amountDue: 3300,
    dueDate: "2026-07-10",
    daysOverdue: 0,
    charges: [
      { id: "C1", plan: "Monthly Maintenance", amount: 2500, frequency: "Monthly", status: "due", dueDate: "2026-07-10" },
      { id: "C2", plan: "Security Charges", amount: 800, frequency: "Monthly", status: "due", dueDate: "2026-07-10" },
      { id: "C3", plan: "Sinking Fund", amount: 6000, frequency: "Yearly", status: "paid", dueDate: "2026-04-15" },
    ],
    security: {
      visitorsThisMonth: 12,
      deliveriesPending: 1,
      openIncidents: 0,
      lastEntry: "Today · 08:12 AM",
      registeredVehicles: ["TS 09 GK 4412"],
      activity: [
        { type: "visitor", text: "Anil Deshmukh checked in (guest)", time: "08:12 AM" },
        { type: "delivery", text: "Amazon package held at gate", time: "09:41 AM" },
        { type: "vehicle", text: "Vehicle TS 09 GK 4412 entry", time: "2 min ago" },
        { type: "visitor", text: "Geeta Aunty checked in (family)", time: "Yesterday" },
      ],
    },
  },
  {
    id: "P-112",
    plotNo: "P-112",
    type: "Plot",
    size: 167,
    phase: "Phase 1",
    facing: "North",
    registeredNames: [{ name: "Naveen Varma", share: "Sole owner", primary: true }],
    paymentStatus: "paid",
    amountDue: 0,
    dueDate: "2026-07-10",
    daysOverdue: 0,
    charges: [
      { id: "C1", plan: "Monthly Maintenance", amount: 2500, frequency: "Monthly", status: "paid", dueDate: "2026-06-10" },
      { id: "C2", plan: "Security Charges", amount: 800, frequency: "Monthly", status: "paid", dueDate: "2026-06-10" },
    ],
    security: {
      visitorsThisMonth: 3,
      deliveriesPending: 0,
      openIncidents: 0,
      lastEntry: "3 days ago",
      registeredVehicles: [],
      activity: [
        { type: "visitor", text: "Aqua RO service technician", time: "3 days ago" },
        { type: "delivery", text: "Flipkart package delivered", time: "5 days ago" },
      ],
    },
  },
  {
    id: "V-203",
    plotNo: "V-203",
    type: "Villa",
    size: 320,
    phase: "Phase 3",
    facing: "West",
    registeredNames: [
      { name: "Naveen Varma", share: "Co-owner (50%)", primary: true },
      { name: "Sunita Varma", share: "Co-owner (30%)", primary: false },
      { name: "Rohit Varma", share: "Co-owner (20%)", primary: false },
    ],
    paymentStatus: "overdue",
    amountDue: 3900,
    dueDate: "2026-06-10",
    daysOverdue: 9,
    charges: [
      { id: "C1", plan: "Monthly Maintenance", amount: 2500, frequency: "Monthly", status: "overdue", dueDate: "2026-06-10" },
      { id: "C2", plan: "Security Charges", amount: 800, frequency: "Monthly", status: "overdue", dueDate: "2026-06-10" },
      { id: "C3", plan: "Water Charges", amount: 600, frequency: "Monthly", status: "due", dueDate: "2026-06-12" },
      { id: "C4", plan: "Clubhouse Charges", amount: 1500, frequency: "Quarterly", status: "paid", dueDate: "2026-04-10" },
    ],
    security: {
      visitorsThisMonth: 18,
      deliveriesPending: 2,
      openIncidents: 1,
      lastEntry: "Today · 07:48 AM",
      registeredVehicles: ["TS 07 HB 8890", "TS 11 KL 0042"],
      activity: [
        { type: "incident", text: "Water leakage reported — TKT-4811 in progress", time: "Today · 09:10 AM" },
        { type: "visitor", text: "Dr. Karthik Rao (home visit)", time: "07:48 AM" },
        { type: "delivery", text: "Blue Dart parcel awaiting pickup", time: "08:25 AM" },
        { type: "vehicle", text: "Vehicle TS 07 HB 8890 exit", time: "11 min ago" },
      ],
    },
  },
];

// ---- Roll-up summary across all plots ----
export const myPortfolio = (() => {
  const totalDue = myPlots.reduce((s, p) => s + p.amountDue, 0);
  const visitors = myPlots.reduce((s, p) => s + p.security.visitorsThisMonth, 0);
  const deliveries = myPlots.reduce((s, p) => s + p.security.deliveriesPending, 0);
  const incidents = myPlots.reduce((s, p) => s + p.security.openIncidents, 0);
  const jointPlots = myPlots.filter((p) => p.registeredNames.length > 1).length;
  return {
    plots: myPlots.length,
    totalDue,
    visitors,
    deliveries,
    incidents,
    jointPlots,
    nextDue: "2026-06-12",
  };
})();
