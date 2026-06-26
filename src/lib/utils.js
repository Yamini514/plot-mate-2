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
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const htmlEscape = (v) =>
  String(v ?? "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);

/**
 * Excel export, dependency-free: an HTML table served as application/vnd.ms-excel,
 * which Excel opens natively as a worksheet (no SheetJS / xlsx gem needed).
 * Same { label, get } column shape as downloadCSV.
 */
export function downloadExcel(filename, rows, columns, title) {
  const head = `<tr>${columns.map((c) => `<th>${htmlEscape(c.label)}</th>`).join("")}</tr>`;
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${htmlEscape(c.get(r))}</td>`).join("")}</tr>`)
    .join("");
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="utf-8" /></head><body>` +
    (title ? `<h3>${htmlEscape(title)}</h3>` : "") +
    `<table border="1">${head}${body}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  triggerDownload(blob, filename);
}

/**
 * PDF export, dependency-free: render a styled report in a hidden iframe and
 * invoke the browser print dialog ("Save as PDF"). Avoids bundling a PDF lib.
 */
export function printReport(title, rows, columns, subtitle) {
  const head = `<tr>${columns.map((c) => `<th>${htmlEscape(c.label)}</th>`).join("")}</tr>`;
  const body = rows
    .map((r) => `<tr>${columns.map((c) => `<td>${htmlEscape(c.get(r))}</td>`).join("")}</tr>`)
    .join("");
  const doc = `<!doctype html><html><head><meta charset="utf-8" /><title>${htmlEscape(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; color: #1e293b; padding: 24px; }
      h1 { font-size: 18px; margin: 0 0 2px; }
      p.sub { color: #64748b; font-size: 12px; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
      th { background: #f8fafc; }
    </style></head><body>
      <h1>${htmlEscape(title)}</h1>
      ${subtitle ? `<p class="sub">${htmlEscape(subtitle)}</p>` : ""}
      <table>${head}${body}</table>
      <script>window.onload = function(){ window.focus(); window.print(); };<\/script>
    </body></html>`;
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  iframe.srcdoc = doc;
  iframe.onload = () => setTimeout(() => iframe.remove(), 60000);
}

/**
 * Expand a free-form plot-number spec into an ordered, de-duplicated list.
 * Supports numeric ranges ("1-134" or "1 to 134") and lists ("01, 02, 08"),
 * separated by commas, semicolons, new lines or spaces. The zero-padding of a
 * range is preserved from its endpoints ("01-08" -> 01..08, "1-134" -> 1..134).
 * Non-numeric tokens (e.g. "A12") are taken verbatim. `prefix` is prepended to
 * every result; `cap` bounds the expansion so a typo like "1-9999999" can't hang
 * the UI.
 */
export function expandPlotNumbers(input, prefix = "", cap = 5000) {
  const out = [];
  const seen = new Set();
  const push = (n) => {
    const v = `${prefix}${n}`;
    if (v && !seen.has(v) && out.length < cap) {
      seen.add(v);
      out.push(v);
    }
  };
  for (const rawGroup of String(input || "").split(/[,;\n]+/)) {
    const group = rawGroup.trim();
    if (!group) continue;
    const m = group.match(/^(\d+)\s*(?:-|–|to)\s*(\d+)$/i);
    if (m) {
      const [, a, b] = m;
      const start = parseInt(a, 10);
      const end = parseInt(b, 10);
      const step = start <= end ? 1 : -1;
      const pad = a.startsWith("0") || b.startsWith("0") ? Math.max(a.length, b.length) : 0;
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        if (out.length >= cap) break;
        push(pad ? String(i).padStart(pad, "0") : String(i));
      }
    } else {
      // Not a range — allow space-separated plain numbers within the group.
      for (const tok of group.split(/\s+/)) if (tok) push(tok);
    }
  }
  return out;
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

/**
 * Keep only digits and cap the length — wire this into a phone input's
 * onChange so the field can never hold letters, symbols or more than `max`
 * digits in the first place.
 */
export function digitsOnly(value, max = 10) {
  return (value || "").replace(/\D/g, "").slice(0, max);
}

/**
 * Validate a phone number. Phone is optional unless `required` is set; when
 * present it must be exactly 10 digits (Indian mobile format).
 * Returns an error string, or null if valid.
 */
export function validatePhone(value, { required = false } = {}) {
  const digits = digitsOnly(value, 15);
  if (!digits) return required ? "Phone number is required." : null;
  if (!/^\d{10}$/.test(digits)) {
    return "Enter a valid 10-digit phone number.";
  }
  return null;
}
