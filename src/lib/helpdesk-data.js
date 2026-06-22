// Static configuration for the Complaint / Helpdesk / Service Request module
// (categories, priorities, SLA, workflow columns, quick templates).
// No sample records — all tickets come from the backend API.

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
