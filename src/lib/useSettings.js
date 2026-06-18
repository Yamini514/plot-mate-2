"use client";

import { useApi } from "@/lib/useApi";

/**
 * Single source of truth for association configuration.
 * Reads the client's live settings from the backend (`/me/settings`, any role)
 * and fills in sensible defaults so pages never render blank/undefined config.
 *
 * The admin configures every field under Settings; nothing here is hardcoded
 * sample data — fallbacks are neutral ("Your Association", computed FY, empty
 * bank/committee/helplines) so a fresh DB shows a clean, configurable shell.
 */

// Indian financial year (Apr 1 – Mar 31), e.g. "2026–27".
function currentFY() {
  const d = new Date();
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1; // month 3 === April
  return `${start}–${String(start + 1).slice(2)}`;
}

const FALLBACK = {
  name: "Your Association",
  type: "Plot Owners' Welfare Association",
  location: "",
  registrationNo: "",
  totalPlots: 0,
  ratePerSqyd: 0,
  membershipFee: 0,
  latePenaltyPct: 0,
  dueDate: "",
  bank: { accountName: "", accountNo: "", ifsc: "", bank: "", upi: "" },
  committee: [],
  helplines: [],
};

export function useSettings() {
  const { data, loading } = useApi("/me/settings");
  const s = data ?? {};
  return {
    settings: {
      ...FALLBACK,
      ...s,
      fy: s.fy || currentFY(),
      bank: { ...FALLBACK.bank, ...(s.bank ?? {}) },
      committee: Array.isArray(s.committee) ? s.committee : [],
      helplines: Array.isArray(s.helplines) ? s.helplines : [],
    },
    loading,
  };
}
