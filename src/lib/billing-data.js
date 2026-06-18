// Static option lists for the Maintenance Billing module (form selects).
// No sample records — all billing data comes from the backend API.

export const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-Time" },
];

export const PROPERTY_TYPES = ["Apartment", "Villa", "Plot"];
