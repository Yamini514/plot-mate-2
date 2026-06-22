// Gate shift windows — the single source of truth shared by the guard profile
// (which shows the current shift) and the app shell (which warns on an early
// clock-out at sign-out). Mirrors the backend ShiftSession::SHIFTS windows so
// the client-side "before shift end?" check matches what the server records.
export const SHIFTS = [
  { name: "Morning", start: "06:00 AM", end: "02:00 PM", from: 6, to: 14 },
  { name: "Evening", start: "02:00 PM", end: "10:00 PM", from: 14, to: 22 },
  { name: "Night", start: "10:00 PM", end: "06:00 AM", from: 22, to: 6 },
];

export function shiftForHour(h) {
  return (
    SHIFTS.find((s) => (s.from < s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to)) ??
    SHIFTS[0]
  );
}

export function shiftForNow() {
  return shiftForHour(new Date().getHours());
}

/** The Date this shift is scheduled to end (night shift rolls to next morning). */
export function scheduledEndForNow(now = new Date()) {
  const s = shiftForHour(now.getHours());
  const end = new Date(now);
  end.setHours(s.to, 0, 0, 0);
  if (s.to <= s.from && now.getHours() >= s.from) end.setDate(end.getDate() + 1);
  return end;
}

/** True when the current moment is before the active shift's scheduled end. */
export function isBeforeShiftEnd(now = new Date()) {
  return now < scheduledEndForNow(now);
}

/** Minutes remaining until the active shift's scheduled end (0 if past). */
export function minutesUntilShiftEnd(now = new Date()) {
  return Math.max(0, Math.round((scheduledEndForNow(now) - now) / 60000));
}

/** Format a Date / ISO string as a short clock time, e.g. "08:12 AM". */
export function fmtClock(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return typeof value === "string" ? value : "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
