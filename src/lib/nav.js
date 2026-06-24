// Note: count badges are no longer hardcoded here — they're computed live in
// useNavBadges() and merged in by AppShell (keyed on href).
export const adminNav = [
  { label: "Dashboard", href: "/admin", icon: "layout-dashboard", group: "Overview" },
  { label: "Plot Map", href: "/admin/plot-map", icon: "map", group: "Overview" },
  { label: "Plot Owners", href: "/admin/owners", icon: "users", group: "Community" },
  { label: "Treasury", href: "/admin/treasury", icon: "wallet", group: "Finance" },
  { label: "Reminders", href: "/admin/reminders", icon: "bell-ring", group: "Finance" },
  { label: "Reports", href: "/admin/reports", icon: "bar-chart-3", group: "Finance" },
  // Collections page hosts the billing overview + invoices as tabs.
  { label: "Collections", href: "/admin/billing", icon: "gauge", group: "Billing" },
  { label: "Charges & Fees", href: "/admin/billing/plans", icon: "scroll-text", group: "Billing" },
  // Helpdesk page hosts the analytics overview + tickets as tabs.
  { label: "Helpdesk", href: "/admin/helpdesk", icon: "life-buoy", group: "Support" },
  { label: "Complaints", href: "/admin/complaints", icon: "message-square-warning", group: "Community" },
  { label: "Amenities", href: "/admin/amenities", icon: "calendar-check", group: "Community" },
  { label: "Events", href: "/admin/events", icon: "calendar-days", group: "Community" },
  { label: "Polls", href: "/admin/polls", icon: "vote", group: "Community" },
  // Security page hosts the oversight overview + gate log as tabs.
  { label: "Security & Gate", href: "/admin/security", icon: "shield-check", group: "Operations" },
  { label: "Staff & Vendors", href: "/admin/staff", icon: "hard-hat", group: "Operations" },
  { label: "Site Photos", href: "/admin/photos", icon: "image", group: "Operations" },
  { label: "Announcements", href: "/admin/announcements", icon: "megaphone", group: "Operations" },
  { label: "Documents", href: "/admin/documents", icon: "folder", group: "Operations" },
  { label: "Settings", href: "/admin/settings", icon: "settings", group: "System" },
];

// Platform layer — the super admin sits above all ventures.
export const superAdminNav = [
  { label: "Dashboard", href: "/super-admin", icon: "layout-dashboard", group: "Platform" },
  { label: "Venture Requests", href: "/super-admin/onboarding", icon: "clipboard-check", group: "Ventures" },
  { label: "Ventures", href: "/super-admin/ventures", icon: "building-2", group: "Ventures" },
  { label: "Venture Admins", href: "/super-admin/venture-admins", icon: "user-cog", group: "People" },
  { label: "Users", href: "/super-admin/users", icon: "users", group: "People" },
  { label: "Support Tickets", href: "/super-admin/tickets", icon: "life-buoy", group: "Support" },
  { label: "Audit Logs", href: "/super-admin/audit", icon: "scroll-text", group: "System" },
  { label: "Reports", href: "/super-admin/reports", icon: "bar-chart-3", group: "Insights" },
  { label: "Settings", href: "/super-admin/settings", icon: "settings", group: "System" },
];

export const guardNav = [
  { label: "Dashboard", href: "/guard", icon: "layout-dashboard", group: "Overview" },
  { label: "Visitors", href: "/guard/visitors", icon: "users-round", group: "Gate" },
  { label: "Deliveries", href: "/guard/deliveries", icon: "package", group: "Gate" },
  { label: "Residents", href: "/guard/residents", icon: "car", group: "Gate" },
  { label: "Incidents", href: "/guard/incidents", icon: "shield-alert", group: "Security" },
  { label: "Service Requests", href: "/guard/tickets", icon: "ticket", group: "Security" },
  { label: "Blacklist & Alerts", href: "/guard/blacklist", icon: "ban", group: "Security" },
  { label: "Reports", href: "/guard/reports", icon: "file-text", group: "System" },
  { label: "Profile & Shift", href: "/guard/profile", icon: "id-card", group: "System" },
];

export const memberNav = [
  { label: "My Plot", href: "/member", icon: "home", group: "Me" },
  // Billing & Payments hosts Dues/Pay, Invoices and History as tabs.
  { label: "Billing & Payments", href: "/member/billing", icon: "badge-indian-rupee", group: "Me" },
  { label: "Service Requests", href: "/member/helpdesk", icon: "life-buoy", group: "Me" },
  { label: "Gate & Visitors", href: "/member/visitors", icon: "scan-line", group: "Me" },
  { label: "My Profile", href: "/member/profile", icon: "circle-user", group: "Me" },
  { label: "Treasury", href: "/member/treasury", icon: "landmark", group: "Community" },
  { label: "Complaints", href: "/member/complaints", icon: "message-square-warning", group: "Community" },
  { label: "Amenities", href: "/member/amenities", icon: "calendar-check", group: "Community" },
  { label: "Events", href: "/member/events", icon: "calendar-days", group: "Community" },
  { label: "Polls", href: "/member/polls", icon: "vote", group: "Community" },
  { label: "Site Photos", href: "/member/photos", icon: "image", group: "Community" },
  { label: "Announcements", href: "/member/announcements", icon: "megaphone", group: "Community" },
  { label: "Documents", href: "/member/documents", icon: "folder", group: "Community" },
  { label: "Directory", href: "/member/directory", icon: "contact", group: "Community" },
];
