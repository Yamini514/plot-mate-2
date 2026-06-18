import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees, e.g. 785240 -> "₹7,85,240" */
export function formatINR(value, opts = {}) {
  if (opts.compact) {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

/** Format an ISO date string to "12 May 2025" */
export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Relative day count helper for display ("5 days ago") */
export function daysAgo(iso, today = "2026-06-09") {
  const diff = Math.round(
    (new Date(today).getTime() - new Date(iso).getTime()) / 86400000,
  );
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 30) return `${diff} days ago`;
  const months = Math.round(diff / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

/**
 * Build a CSV from rows + column defs and trigger a browser download.
 * columns: [{ label, get: (row) => value }]
 */
export function downloadCSV(filename, rows, columns) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(c.get(r))).join(","))
    .join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Validate login credentials before creating an account.
 * Returns an error string, or null if valid.
 */
export function validateAccount({ email, password, confirm }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim())) {
    return "Enter a valid email address.";
  }
  if ((password || "").length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (confirm !== undefined && password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}
