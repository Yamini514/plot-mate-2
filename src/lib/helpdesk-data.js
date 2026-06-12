// Mock data for Module 2 — Complaint / Helpdesk / Service Request Management.
// Static literals (no Date.now / Math.random) for hydration safety.

export const CATEGORIES = [
  { value: "maintenance", label: "Maintenance", icon: "wrench", team: "Maintenance Team" },
  { value: "security", label: "Security", icon: "shield", team: "Security Manager" },
  { value: "electrical", label: "Electrical", icon: "zap", team: "Electrician" },
  { value: "plumbing", label: "Plumbing", icon: "droplets", team: "Plumber" },
  { value: "cleaning", label: "Cleaning", icon: "brush", team: "Housekeeping" },
  { value: "amenities", label: "Amenities", icon: "dumbbell", team: "Community Manager" },
  { value: "parking", label: "Parking", icon: "car", team: "Facility Team" },
  { value: "documentation", label: "Documentation", icon: "folder", team: "Front Office" },
  { value: "billing", label: "Billing", icon: "receipt", team: "Accountant" },
  { value: "community", label: "Community Issues", icon: "users", team: "Community Manager" },
  { value: "other", label: "Other", icon: "circle-help", team: "Front Office" },
];

// SLA (hours) by priority — configurable in real product.
export const SLA_HOURS = { low: 72, medium: 24, high: 8, critical: 1 };

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

// Auto-assignment map (category → default assignee / team).
export const ASSIGNMENT_MAP = {
  electrical: "Ramesh (Electrician)",
  plumbing: "Mahesh (Plumber)",
  security: "Suraj (Security Manager)",
  billing: "Lakshmi (Accountant)",
  amenities: "Priya (Community Manager)",
  community: "Priya (Community Manager)",
  maintenance: "Vendor — FixIt Facilities",
  cleaning: "Housekeeping Supervisor",
  parking: "Facility Desk",
  documentation: "Front Office",
  other: "Front Office",
};

// ---- Tickets ----
// slaState: ok | due_soon | breached ; remaining is a display string.
export const tickets = [
  { id: "TKT-4821", subject: "Lift not working in B-block", description: "Elevator in Block B stuck at 3rd floor since morning; residents using stairs.", category: "maintenance", priority: "high", status: "in_progress", location: "Block B Lobby", createdBy: "Lakshmi Reddy (Owner)", assignee: "Vendor — FixIt Facilities", created: "2026-06-12 08:10", slaRemaining: "4h 12m", slaState: "due_soon", reopenCount: 0, rating: null },
  { id: "TKT-4820", subject: "No water supply on 5th floor", description: "Overhead tank not pumping to 5th floor flats since last night.", category: "plumbing", priority: "critical", status: "assigned", location: "A-Block 5th floor", createdBy: "Arjun Mehta (Tenant)", assignee: "Mahesh (Plumber)", created: "2026-06-12 07:40", slaRemaining: "12m", slaState: "breached", reopenCount: 0, rating: null },
  { id: "TKT-4819", subject: "Corridor light flickering", description: "Tube light near A-1102 flickers constantly.", category: "electrical", priority: "low", status: "resolved", location: "A-Block corridor", createdBy: "Pooja Iyer (Resident)", assignee: "Ramesh (Electrician)", created: "2026-06-11 18:20", slaRemaining: "Resolved in 3h", slaState: "ok", reopenCount: 0, rating: null },
  { id: "TKT-4818", subject: "Broken gate sensor at main entrance", description: "Boom barrier sensor not detecting vehicles; manual operation needed.", category: "security", priority: "high", status: "escalated", location: "Main Gate", createdBy: "Rajappa Gowda (Security)", assignee: "Suraj (Security Manager)", created: "2026-06-11 21:05", slaRemaining: "Breached 2h ago", slaState: "breached", reopenCount: 1, rating: null },
  { id: "TKT-4817", subject: "Incorrect maintenance amount in invoice", description: "Charged parking fee though I have no allotted parking.", category: "billing", priority: "medium", status: "pending_approval", location: "A-0098", createdBy: "Kiran Patel (Owner)", assignee: "Lakshmi (Accountant)", created: "2026-06-11 14:30", slaRemaining: "9h 40m", slaState: "ok", reopenCount: 0, rating: null },
  { id: "TKT-4816", subject: "Gym treadmill not working", description: "Treadmill #2 belt slipping, unsafe to use.", category: "amenities", priority: "medium", status: "accepted", location: "Clubhouse Gym", createdBy: "Divya Sharma (Owner)", assignee: "Priya (Community Manager)", created: "2026-06-11 11:15", slaRemaining: "6h 05m", slaState: "due_soon", reopenCount: 0, rating: null },
  { id: "TKT-4815", subject: "Garbage not collected for 2 days", description: "Wet-waste bins overflowing near Block C.", category: "cleaning", priority: "medium", status: "created", location: "Block C", createdBy: "Meena Joshi (Resident)", assignee: null, created: "2026-06-12 06:50", slaRemaining: "23h 50m", slaState: "ok", reopenCount: 0, rating: null },
  { id: "TKT-4814", subject: "Unauthorized vehicle parked in visitor slot", description: "Silver Ertiga KA-05-MN-1102 parked 3 days, no resident match.", category: "parking", priority: "low", status: "closed", location: "Visitor Parking", createdBy: "Rajappa Gowda (Security)", assignee: "Facility Desk", created: "2026-06-09 16:00", slaRemaining: "Resolved in 1d", slaState: "ok", reopenCount: 0, rating: 5 },
  { id: "TKT-4813", subject: "Share society NOC document", description: "Need NOC for home-loan top-up.", category: "documentation", priority: "low", status: "resolved", location: "Front Office", createdBy: "Naveen Varma (Owner)", assignee: "Front Office", created: "2026-06-10 10:25", slaRemaining: "Resolved in 6h", slaState: "ok", reopenCount: 0, rating: null },
  { id: "TKT-4812", subject: "CCTV camera offline at parking L2", description: "Camera feed black since maintenance.", category: "security", priority: "high", status: "in_progress", location: "Parking Level 2", createdBy: "Rajappa Gowda (Security)", assignee: "Suraj (Security Manager)", created: "2026-06-11 17:30", slaRemaining: "1h 30m", slaState: "due_soon", reopenCount: 0, rating: null },
  { id: "TKT-4811", subject: "Water leakage from ceiling", description: "Seepage from flat above into A-0042 bedroom.", category: "plumbing", priority: "high", status: "closed", location: "A-0042", createdBy: "Ananya Bose (Owner)", assignee: "Mahesh (Plumber)", created: "2026-06-08 09:10", slaRemaining: "Resolved in 7h", slaState: "ok", reopenCount: 0, rating: 4 },
  { id: "TKT-4810", subject: "Streetlight failure near Block A", description: "Two poles dark on the approach road.", category: "electrical", priority: "medium", status: "reopened", location: "Block A approach", createdBy: "Rajappa Gowda (Security)", assignee: "Ramesh (Electrician)", created: "2026-06-10 20:15", slaRemaining: "5h 20m", slaState: "ok", reopenCount: 2, rating: null },
];

// Status columns for the Kanban board (workflow order).
export const KANBAN_COLUMNS = [
  { key: "created", label: "Created" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

// Security-guard quick ticket templates.
export const guardTicketTemplates = [
  { label: "Broken Gate", category: "security", priority: "high", icon: "door-closed" },
  { label: "Visitor Misconduct", category: "security", priority: "high", icon: "user-x" },
  { label: "CCTV Issue", category: "security", priority: "high", icon: "cctv" },
  { label: "Unauthorized Vehicle", category: "parking", priority: "medium", icon: "car" },
  { label: "Security Breach", category: "security", priority: "critical", icon: "shield-alert" },
  { label: "Street Light Failure", category: "electrical", priority: "medium", icon: "lightbulb" },
  { label: "Emergency Incident", category: "security", priority: "critical", icon: "siren" },
];

// ---- Dashboard widgets ----
export const helpdeskStats = (() => {
  const by = (s) => tickets.filter((t) => t.status === s).length;
  const open = tickets.filter((t) => ["created", "assigned", "accepted", "in_progress", "pending_approval"].includes(t.status)).length;
  return {
    total: tickets.length,
    open,
    inProgress: by("in_progress"),
    resolved: by("resolved"),
    closed: by("closed"),
    escalatedCount: by("escalated"),
    overdue: tickets.filter((t) => t.slaState === "breached").length,
    reopened: tickets.filter((t) => t.reopenCount > 0).length,
    slaCompliance: 92,
    avgResolutionHrs: 9.4,
  };
})();

// ---- Analytics ----
export const categoryTrend = [
  { name: "Plumbing", value: 28, color: "#0ea5e9" },
  { name: "Electrical", value: 24, color: "#f59e0b" },
  { name: "Maintenance", value: 21, color: "#059669" },
  { name: "Security", value: 17, color: "#8b5cf6" },
  { name: "Cleaning", value: 14, color: "#14b8a6" },
  { name: "Billing", value: 9, color: "#ef4444" },
  { name: "Amenities", value: 7, color: "#ec4899" },
];

export const staffPerformance = [
  { name: "Ramesh (Elec.)", value: 41, color: "#059669" },
  { name: "Mahesh (Plumb.)", value: 38, color: "#0ea5e9" },
  { name: "Suraj (Security)", value: 26, color: "#8b5cf6" },
  { name: "Priya (CM)", value: 22, color: "#f59e0b" },
  { name: "FixIt Facilities", value: 19, color: "#14b8a6" },
];

export const slaComplianceTrend = [
  { name: "Critical", value: 88, color: "#ef4444" },
  { name: "High", value: 90, color: "#f97316" },
  { name: "Medium", value: 94, color: "#f59e0b" },
  { name: "Low", value: 97, color: "#94a3b8" },
];

export const statusDistribution = [
  { name: "Open", value: helpdeskStats.open, color: "#0ea5e9" },
  { name: "Resolved", value: helpdeskStats.resolved, color: "#059669" },
  { name: "Closed", value: helpdeskStats.closed, color: "#94a3b8" },
  { name: "Escalated", value: helpdeskStats.escalatedCount, color: "#ef4444" },
];

// ---- Owner / resident view ----
export const myTickets = tickets.filter((t) =>
  ["Naveen Varma (Owner)", "Pooja Iyer (Resident)"].includes(t.createdBy),
);
