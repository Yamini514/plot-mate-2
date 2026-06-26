// Client-side field validators — the UX-facing mirror of the backend
// App::Validate (Backend/src/lib/validate.rb). Each validator returns an error
// string when invalid, or "" when it passes, so a form composes a
// { field: validator(...) } map and feeds it to collect() for the error object.
// The server runs the same rules as the real gate; these just give instant,
// inline feedback before a round-trip.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\d{10}$/;
const SPECIAL_RE = /[^A-Za-z0-9]/;
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];

export const isBlank = (v) => v == null || String(v).trim() === "";

export function presence(v, label = "This field") {
  return isBlank(v) ? `${label} is required` : "";
}

export function text(v, { min, max, label = "This field", required = true } = {}) {
  if (isBlank(v)) return required ? `${label} is required` : "";
  const s = String(v).trim();
  if (min && s.length < min) return `Must be at least ${min} characters`;
  if (max && s.length > max) return `Must be at most ${max} characters`;
  return "";
}

export function email(v, { required = true } = {}) {
  if (isBlank(v)) return required ? "Email is required" : "";
  return EMAIL_RE.test(String(v).trim()) ? "" : "Enter a valid email address";
}

export function phone(v, { required = false } = {}) {
  if (isBlank(v)) return required ? "Phone is required" : "";
  return PHONE_RE.test(String(v).trim()) ? "" : "Must be a 10-digit number";
}

// 8+ chars with an upper, lower, number and special character.
export function password(v) {
  const s = String(v ?? "");
  if (!s.trim()) return "Password is required";
  const missing = [];
  if (s.length < 8) missing.push("8+ characters");
  if (!/[A-Z]/.test(s)) missing.push("an uppercase letter");
  if (!/[a-z]/.test(s)) missing.push("a lowercase letter");
  if (!/\d/.test(s)) missing.push("a number");
  if (!SPECIAL_RE.test(s)) missing.push("a special character");
  return missing.length ? `Password must contain ${missing.join(", ")}` : "";
}

// 0–4 strength score, for an optional meter alongside the password field.
export function passwordStrength(v) {
  const s = String(v ?? "");
  let score = 0;
  if (s.length >= 8) score++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (SPECIAL_RE.test(s)) score++;
  return score;
}

export function number(
  v,
  { min, max, positive, integer, required = true, label = "This field" } = {},
) {
  if (isBlank(v)) return required ? `${label} is required` : "";
  const n = integer ? parseInt(v, 10) : Number(v);
  if (Number.isNaN(n)) return "Must be a number";
  if (positive && n <= 0) return "Must be greater than zero";
  if (min != null && n < min) return `Must be at least ${min}`;
  if (max != null && n > max) return `Must be at most ${max}`;
  return "";
}

// End must be strictly after start (only when both are set).
export function dateRange(startAt, endAt) {
  if (isBlank(startAt) || isBlank(endAt)) return "";
  return new Date(endAt) > new Date(startAt)
    ? ""
    : "End date must be after the start date";
}

export function future(v, { label = "Date" } = {}) {
  if (isBlank(v)) return "";
  const today = new Date(new Date().toDateString());
  return new Date(v) >= today ? "" : `${label} cannot be in the past`;
}

export function file(f, { allowed = ALLOWED_EXT, maxBytes = 10 * 1024 * 1024 } = {}) {
  if (!f) return "A file is required";
  const ext = (f.name || "").split(".").pop().toLowerCase();
  if (!allowed.includes(ext))
    return `Only ${allowed.map((e) => e.toUpperCase()).join(", ")} files are allowed`;
  if (f.size > maxBytes)
    return `File must be under ${Math.round(maxBytes / (1024 * 1024))}MB`;
  return "";
}

// Drop the passing ("") entries, leaving only real errors. Truthy result.length
// (Object.keys) means the form is invalid.
export function collect(checks) {
  return Object.fromEntries(Object.entries(checks).filter(([, msg]) => msg));
}

export const hasErrors = (errs) => Object.keys(errs || {}).length > 0;
