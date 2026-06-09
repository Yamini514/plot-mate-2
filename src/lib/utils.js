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

export function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
