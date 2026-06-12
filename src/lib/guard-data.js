// Mock data for the Security Guard dashboard.
// All values are static literals (no Date.now / Math.random) so server and
// client render identically — same approach as the rest of Plotmate's mock layer.

export const guardProfile = {
  name: "Rajappa Gowda",
  guardId: "GRD-04",
  phone: "+91 90087 55412",
  email: "guard@greenaeroview.in",
  agency: "SafeGuard Security Services",
  gate: "Main Gate · Block A",
  shift: "Morning",
  shiftStart: "06:00",
  shiftEnd: "14:00",
  shiftStatus: "on_duty", // on_duty | off_duty | break
  attendance: "present",
  clockIn: "05:54 AM",
  supervisor: { name: "Mahesh Patil", phone: "+91 98450 33218" },
  rating: 4.8,
  shiftsThisMonth: 22,
};

// ---- KPI tiles for the overview ----
export const guardStats = {
  visitorsToday: 38,
  visitorsDelta: { value: "+12%", up: true },
  deliveriesToday: 21,
  deliveriesDelta: { value: "+5%", up: true },
  residentsCheckedIn: 96,
  residentsDelta: { value: "+3%", up: true },
  pendingApprovals: 5,
  incidentsToday: 2,
  incidentsOpen: 1,
  blacklistedEntries: 7,
  blacklistAttemptsToday: 1,
  packagesWaiting: 6,
};

// ---- Charts ----
export const visitorsByHour = [
  { hour: "6a", visitors: 2 },
  { hour: "7a", visitors: 5 },
  { hour: "8a", visitors: 9 },
  { hour: "9a", visitors: 14 },
  { hour: "10a", visitors: 11 },
  { hour: "11a", visitors: 8 },
  { hour: "12p", visitors: 6 },
  { hour: "1p", visitors: 4 },
  { hour: "2p", visitors: 7 },
  { hour: "3p", visitors: 10 },
  { hour: "4p", visitors: 13 },
  { hour: "5p", visitors: 18 },
  { hour: "6p", visitors: 22 },
  { hour: "7p", visitors: 16 },
  { hour: "8p", visitors: 9 },
  { hour: "9p", visitors: 4 },
];

export const trafficTrend7d = [
  { day: "Fri", visitors: 41, deliveries: 17 },
  { day: "Sat", visitors: 58, deliveries: 23 },
  { day: "Sun", visitors: 63, deliveries: 9 },
  { day: "Mon", visitors: 36, deliveries: 25 },
  { day: "Tue", visitors: 44, deliveries: 28 },
  { day: "Wed", visitors: 39, deliveries: 22 },
  { day: "Thu", visitors: 38, deliveries: 21 },
];

export const incidentSeverity = [
  { name: "Low", value: 9, color: "#94a3b8" },
  { name: "Medium", value: 5, color: "#f59e0b" },
  { name: "High", value: 2, color: "#f97316" },
  { name: "Critical", value: 1, color: "#ef4444" },
];

// ---- Visitor management ----
export const visitors = [
  { id: "VIS-2418", name: "Anil Deshmukh", phone: "+91 99632 41102", resident: "Naveen Varma", flat: "P-047", purpose: "Guest", checkIn: "08:12 AM", checkOut: "—", status: "inside" },
  { id: "VIS-2417", name: "Swiggy — Rohit", phone: "+91 90011 22330", resident: "Lakshmi Reddy", flat: "P-112", purpose: "Food delivery", checkIn: "08:05 AM", checkOut: "08:21 AM", status: "checked_out" },
  { id: "VIS-2416", name: "Priya Nair", phone: "+91 98230 55471", resident: "Suresh Kumar", flat: "P-008", purpose: "Family visit", checkIn: "—", checkOut: "—", status: "pending" },
  { id: "VIS-2415", name: "Dr. Karthik Rao", phone: "+91 97400 18820", resident: "Meena Joshi", flat: "P-203", purpose: "Home visit (doctor)", checkIn: "07:48 AM", checkOut: "—", status: "approved" },
  { id: "VIS-2414", name: "Ramesh Plumbing", phone: "+91 91009 77654", resident: "Arjun Mehta", flat: "P-156", purpose: "Maintenance", checkIn: "—", checkOut: "—", status: "pending" },
  { id: "VIS-2413", name: "Sneha Kulkarni", phone: "+91 98765 30021", resident: "Divya Sharma", flat: "P-061", purpose: "Guest", checkIn: "07:30 AM", checkOut: "—", status: "inside" },
  { id: "VIS-2412", name: "Unknown caller", phone: "+91 70004 11223", resident: "Kiran Patel", flat: "P-098", purpose: "Sales / promotion", checkIn: "—", checkOut: "—", status: "rejected" },
  { id: "VIS-2411", name: "Vijay Cabs", phone: "+91 99887 66554", resident: "Pooja Iyer", flat: "P-134", purpose: "Cab pickup", checkIn: "06:55 AM", checkOut: "07:10 AM", status: "checked_out" },
  { id: "VIS-2410", name: "Amazon — Sameer", phone: "+91 90090 11220", resident: "Rohan Gupta", flat: "P-077", purpose: "Package delivery", checkIn: "06:40 AM", checkOut: "06:52 AM", status: "checked_out" },
  { id: "VIS-2409", name: "Geeta Aunty", phone: "+91 98111 44556", resident: "Harika Rao", flat: "P-019", purpose: "Family visit", checkIn: "06:20 AM", checkOut: "—", status: "inside" },
  { id: "VIS-2408", name: "Aqua RO Service", phone: "+91 91234 88990", resident: "Sai Teja", flat: "P-188", purpose: "Maintenance", checkIn: "—", checkOut: "—", status: "pending" },
  { id: "VIS-2407", name: "Mohan Electricals", phone: "+91 90876 12340", resident: "Ananya Bose", flat: "P-042", purpose: "Maintenance", checkIn: "—", checkOut: "—", status: "pending" },
];

export const visitorPurposes = ["Guest", "Family visit", "Food delivery", "Package delivery", "Maintenance", "Cab pickup", "Sales / promotion", "Home visit (doctor)", "Other"];

// ---- Delivery tracking ----
export const deliveries = [
  { id: "PKG-7741", courier: "Amazon", agent: "Sameer K.", resident: "Rohan Gupta", flat: "P-077", received: "06:52 AM", delivered: "07:40 AM", status: "delivered" },
  { id: "PKG-7742", courier: "Flipkart", agent: "Imran S.", resident: "Pooja Iyer", flat: "P-134", received: "08:10 AM", delivered: "—", status: "waiting" },
  { id: "PKG-7743", courier: "Blue Dart", agent: "Naresh B.", resident: "Suresh Kumar", flat: "P-008", received: "08:25 AM", delivered: "—", status: "waiting" },
  { id: "PKG-7744", courier: "Swiggy Instamart", agent: "Rohit M.", resident: "Lakshmi Reddy", flat: "P-112", received: "08:18 AM", delivered: "08:33 AM", status: "delivered" },
  { id: "PKG-7745", courier: "DTDC", agent: "Faizan A.", resident: "Divya Sharma", flat: "P-061", received: "09:02 AM", delivered: "—", status: "waiting" },
  { id: "PKG-7746", courier: "Amazon", agent: "Sameer K.", resident: "Arjun Mehta", flat: "P-156", received: "09:14 AM", delivered: "—", status: "received" },
  { id: "PKG-7747", courier: "Delhivery", agent: "Praveen R.", resident: "Meena Joshi", flat: "P-203", received: "09:30 AM", delivered: "—", status: "waiting" },
  { id: "PKG-7748", courier: "Zepto", agent: "Akash D.", resident: "Naveen Varma", flat: "P-047", received: "09:41 AM", delivered: "09:58 AM", status: "delivered" },
  { id: "PKG-7749", courier: "Ekart", agent: "Salim K.", resident: "Kiran Patel", flat: "P-098", received: "10:05 AM", delivered: "—", status: "waiting" },
  { id: "PKG-7750", courier: "Blue Dart", agent: "Naresh B.", resident: "Sai Teja", flat: "P-188", received: "10:20 AM", delivered: "—", status: "waiting" },
];

// ---- Resident vehicle / guest activity feed ----
export const residentActivity = [
  { id: "ACT-901", type: "entry", name: "Naveen Varma", flat: "P-047", vehicle: "TS 09 GK 4412", time: "2 min ago", method: "RFID tag" },
  { id: "ACT-902", type: "exit", name: "Divya Sharma", flat: "P-061", vehicle: "TS 07 HB 8890", time: "11 min ago", method: "RFID tag" },
  { id: "ACT-903", type: "guest", name: "Anil Deshmukh", flat: "P-047", vehicle: "TS 10 CD 2231", time: "18 min ago", method: "QR pass" },
  { id: "ACT-904", type: "entry", name: "Suresh Kumar", flat: "P-008", vehicle: "TS 09 AA 1199", time: "26 min ago", method: "RFID tag" },
  { id: "ACT-905", type: "exit", name: "Pooja Iyer", flat: "P-134", vehicle: "TS 08 MN 7766", time: "34 min ago", method: "Manual" },
  { id: "ACT-906", type: "guest", name: "Dr. Karthik Rao", flat: "P-203", vehicle: "TS 11 KL 0042", time: "41 min ago", method: "QR pass" },
  { id: "ACT-907", type: "entry", name: "Arjun Mehta", flat: "P-156", vehicle: "TS 09 GK 5521", time: "52 min ago", method: "RFID tag" },
  { id: "ACT-908", type: "exit", name: "Rohan Gupta", flat: "P-077", vehicle: "TS 07 ZX 3310", time: "1 hr ago", method: "RFID tag" },
];

export const residentVehicleStats = {
  insideNow: 142,
  capacity: 210,
  entriesToday: 188,
  exitsToday: 92,
  guestVehicles: 14,
};

// ---- Incident reporting ----
export const incidents = [
  { id: "INC-3092", type: "Unauthorized entry attempt", location: "Main Gate", severity: "high", reportedBy: "Rajappa Gowda", time: "Today · 07:22 AM", status: "investigating" },
  { id: "INC-3091", type: "Vehicle parked in fire lane", location: "Block B Driveway", severity: "medium", reportedBy: "Rajappa Gowda", time: "Today · 06:10 AM", status: "open" },
  { id: "INC-3090", type: "Noise complaint", location: "Clubhouse", severity: "low", reportedBy: "Mahesh Patil", time: "Yesterday · 10:48 PM", status: "resolved" },
  { id: "INC-3089", type: "Suspicious package", location: "East Gate", severity: "critical", reportedBy: "Suraj Yadav", time: "Yesterday · 08:15 PM", status: "resolved" },
  { id: "INC-3088", type: "CCTV camera offline", location: "Parking Level 2", severity: "medium", reportedBy: "Rajappa Gowda", time: "Yesterday · 05:30 PM", status: "escalated" },
  { id: "INC-3087", type: "Trespasser on perimeter", location: "Back Compound Wall", severity: "high", reportedBy: "Suraj Yadav", time: "2 days ago · 11:55 PM", status: "resolved" },
  { id: "INC-3086", type: "Lost child reunited", location: "Children's Park", severity: "low", reportedBy: "Mahesh Patil", time: "2 days ago · 06:20 PM", status: "resolved" },
];

export const incidentTypes = ["Unauthorized entry attempt", "Vehicle violation", "Theft / burglary", "Suspicious activity", "Noise complaint", "Fire / safety hazard", "Equipment failure", "Medical emergency", "Other"];

// ---- Blacklist & Alerts ----
export const blacklistedVisitors = [
  { id: "BL-V-21", name: "Unknown solicitor", phone: "+91 70004 11223", reason: "Repeated unsolicited sales entry", addedBy: "Admin", addedOn: "12 May 2026", attempts: 3, status: "blacklisted" },
  { id: "BL-V-20", name: "Ravi (ex-vendor)", phone: "+91 98220 55109", reason: "Theft complaint filed by P-098", addedBy: "Admin", addedOn: "28 Apr 2026", attempts: 1, status: "blacklisted" },
  { id: "BL-V-19", name: "Suspicious surveyor", phone: "+91 91110 88231", reason: "Photographing flats without consent", addedBy: "Security", addedOn: "16 Apr 2026", attempts: 2, status: "blacklisted" },
];

export const blacklistedVehicles = [
  { id: "BL-C-14", plate: "TS 07 QR 9981", model: "White Swift Dzire", reason: "Tailgating, no resident match", addedOn: "02 Jun 2026", attempts: 2, status: "blacklisted" },
  { id: "BL-C-13", plate: "AP 09 ZZ 4420", model: "Black Bullet (2-wheeler)", reason: "Reckless driving in community", addedOn: "21 May 2026", attempts: 1, status: "flagged" },
  { id: "BL-C-12", plate: "KA 05 MN 1102", model: "Silver Ertiga", reason: "Unauthorized commercial activity", addedOn: "09 May 2026", attempts: 4, status: "blacklisted" },
];

export const emergencyAlerts = [
  { id: "AL-77", title: "Fire drill scheduled", body: "Community-wide fire drill at 4:00 PM near Block C assembly point.", level: "medium", time: "Today · 09:00 AM", status: "acknowledged" },
  { id: "AL-76", title: "Gate-2 barrier malfunction", body: "Boom barrier at East Gate is jammed — operate manually until technician arrives.", level: "high", time: "Today · 06:45 AM", status: "open" },
  { id: "AL-75", title: "VIP visit", body: "Municipal commissioner expected 11:00 AM — verify and escort to admin office.", level: "low", time: "Today · 06:00 AM", status: "acknowledged" },
];

export const communityNotices = [
  { id: "NT-44", title: "Water tanker schedule changed", body: "Tankers now arrive 7 AM & 5 PM. Allow entry on production of vendor pass.", time: "Today · 08:00 AM" },
  { id: "NT-43", title: "Visitor parking full on weekends", body: "Direct overflow visitor vehicles to the temporary lot near East Gate.", time: "Yesterday · 06:30 PM" },
  { id: "NT-42", title: "New QR-pass system live", body: "Residents can pre-approve guests via the app. Always scan the QR before granting entry.", time: "2 days ago" },
];

// ---- Reports ----
export const reports = [
  { id: "RPT-1", name: "Daily Visitor Report", desc: "Every visitor entry, approval and check-out for the selected day.", icon: "users-round", range: "Today · 12 Jun 2026", records: 38, tone: "brand" },
  { id: "RPT-2", name: "Delivery Report", desc: "Courier packages received, held and handed over to residents.", icon: "package", range: "Today · 12 Jun 2026", records: 21, tone: "sky" },
  { id: "RPT-3", name: "Incident Report", desc: "Security incidents logged with severity, location and resolution status.", icon: "shield-alert", range: "Last 7 days", records: 12, tone: "amber" },
  { id: "RPT-4", name: "Guard Activity Report", desc: "Shift attendance, patrol logs and gate actions per guard.", icon: "clipboard-check", range: "This month", records: 22, tone: "violet" },
];

// ---- Shift roster for profile page ----
export const shiftRoster = [
  { shift: "Morning", time: "06:00 – 14:00", guard: "Rajappa Gowda", gate: "Main Gate", current: true },
  { shift: "Evening", time: "14:00 – 22:00", guard: "Suraj Yadav", gate: "Main Gate", current: false },
  { shift: "Night", time: "22:00 – 06:00", guard: "Imtiaz Khan", gate: "Main Gate", current: false },
];

// ---- Senior-level (admin) security oversight ----
export const securityTeam = [
  { name: "Rajappa Gowda", gate: "Main Gate · Block A", shift: "Morning", phone: "+91 90087 55412", status: "on_duty" },
  { name: "Suraj Yadav", gate: "East Gate", shift: "Morning", phone: "+91 99012 88341", status: "on_duty" },
  { name: "Imtiaz Khan", gate: "Clubhouse", shift: "Morning", phone: "+91 98765 12009", status: "break" },
  { name: "Mahesh Patil", gate: "Roving supervisor", shift: "Morning", phone: "+91 98450 33218", status: "on_duty" },
];

export const securitySummary = {
  gatesMonitored: 3,
  guardsOnDuty: 3,
  avgResponseMins: 4,
  patrolsCompleted: 8,
  patrolsScheduled: 10,
  cctvOnline: 46,
  cctvTotal: 48,
  slaCompliance: 98,
};

export const recentGateActions = [
  { id: "GA-1", text: "Approved visitor Anil Deshmukh for P-047", time: "08:12 AM", icon: "user-check" },
  { id: "GA-2", text: "Logged incident INC-3092 — unauthorized entry attempt", time: "07:22 AM", icon: "shield-alert" },
  { id: "GA-3", text: "Handed package PKG-7741 to Rohan Gupta (P-077)", time: "07:40 AM", icon: "package-check" },
  { id: "GA-4", text: "Rejected sales visitor for P-098", time: "06:48 AM", icon: "user-x" },
  { id: "GA-5", text: "Clocked in for Morning shift", time: "05:54 AM", icon: "log-in" },
];
