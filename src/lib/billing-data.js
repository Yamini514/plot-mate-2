// Static option lists for the Billing module (form selects).
// No sample records — all billing data comes from the backend API.

export const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-Time" },
];

export const PROPERTY_TYPES = ["Apartment", "Villa", "Plot"];

// The fee taxonomy. Mirrors Plan::CATEGORIES on the backend. Each entry carries
// the icon + Badge tone the UI uses so categories look consistent everywhere
// (catalog cards, filter chips, invoice rows, slips). Keep `value`s in sync.
export const FEE_CATEGORIES = [
  { value: "maintenance",  label: "Maintenance",          icon: "wrench",          tone: "brand",  hint: "Recurring upkeep — roads, lighting, sanitation, common areas" },
  { value: "corpus",       label: "Corpus / Sinking Fund", icon: "piggy-bank",     tone: "violet", hint: "Capital reserve for major future works" },
  { value: "transfer",     label: "Plot Transfer",         icon: "arrow-right-left", tone: "sky",  hint: "Charged on change of ownership" },
  { value: "noc",          label: "NOC Fee",               icon: "file-check",     tone: "sky",    hint: "No-Objection-Certificate issuance" },
  { value: "penalty",      label: "Penalty / Fine",        icon: "octagon-alert",  tone: "rose",   hint: "Bylaw violations, encroachment, late dues" },
  { value: "water",        label: "Water Charges",         icon: "droplets",       tone: "sky",    hint: "Metered or flat water supply" },
  { value: "amenity",      label: "Amenity / Club",        icon: "dumbbell",       tone: "amber",  hint: "Clubhouse, pool, gym, hall usage" },
  { value: "security",     label: "Security",              icon: "shield",         tone: "slate",  hint: "Guarding, surveillance, gate management" },
  { value: "construction", label: "Construction Deposit",  icon: "hammer",         tone: "amber",  hint: "Refundable debris / construction deposit" },
  { value: "event",        label: "Event / Festival",      icon: "party-popper",   tone: "violet", hint: "Community events & festival contributions" },
  { value: "other",        label: "Other / Ad-hoc",        icon: "circle-ellipsis", tone: "slate", hint: "Any one-off or miscellaneous charge" },
];

// Resolve a category value to its descriptor; unknown values fall back to "Other".
export const feeCategory = (value) =>
  FEE_CATEGORIES.find((c) => c.value === value) ??
  FEE_CATEGORIES[FEE_CATEGORIES.length - 1];
