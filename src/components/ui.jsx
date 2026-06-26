"use client";

import { cn } from "@/lib/utils";
import { Icon } from "./Icon";
import { useEffect, useState } from "react";

/* ---------------- Card ---------------- */
export function Card({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------- StatCard ---------------- */
export function StatCard({ label, value, icon, tone = "brand", delta, hint }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
          <Icon name={icon} size={20} />
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              delta.up ? "bg-brand-50 text-brand-700" : "bg-rose-50 text-rose-600",
            )}
          >
            <Icon name={delta.up ? "trending-up" : "trending-down"} size={12} />
            {delta.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ children, tone = "slate", className }) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    paid: { tone: "green", label: "Paid" },
    pending: { tone: "amber", label: "Pending" },
    unknown: { tone: "slate", label: "Unknown" },
    verified: { tone: "sky", label: "Verified" },
    unverified: { tone: "slate", label: "Unverified" },
    open: { tone: "rose", label: "Open" },
    in_progress: { tone: "amber", label: "In progress" },
    resolved: { tone: "green", label: "Resolved" },
    closed: { tone: "slate", label: "Closed" },
    confirmed: { tone: "green", label: "Confirmed" },
    rejected: { tone: "rose", label: "Rejected" },
    active: { tone: "green", label: "Active" },
    on_leave: { tone: "amber", label: "On leave" },
    available: { tone: "green", label: "Available" },
    maintenance: { tone: "amber", label: "Maintenance" },
    inside: { tone: "sky", label: "Inside" },
    left: { tone: "slate", label: "Left" },
    expected: { tone: "amber", label: "Expected" },
    arrived: { tone: "sky", label: "Arrived" },
    paused: { tone: "slate", label: "Paused" },
    denied: { tone: "rose", label: "Denied" },
    expired: { tone: "slate", label: "Expired" },
    sent: { tone: "sky", label: "Sent" },
    scheduled: { tone: "amber", label: "Scheduled" },
    responded: { tone: "green", label: "Responded" },
    high: { tone: "rose", label: "High" },
    medium: { tone: "amber", label: "Medium" },
    low: { tone: "slate", label: "Low" },
    critical: { tone: "rose", label: "Critical" },
    // visitor / gate flow
    approved: { tone: "green", label: "Approved" },
    checked_out: { tone: "slate", label: "Checked out" },
    // deliveries
    waiting: { tone: "amber", label: "Awaiting pickup" },
    received: { tone: "sky", label: "Received" },
    delivered: { tone: "green", label: "Delivered" },
    returned: { tone: "slate", label: "Returned" },
    // incidents
    investigating: { tone: "amber", label: "Investigating" },
    escalated: { tone: "rose", label: "Escalated" },
    // shift / guard
    on_duty: { tone: "green", label: "On duty" },
    off_duty: { tone: "slate", label: "Off duty" },
    break: { tone: "amber", label: "On break" },
    // blacklist / alerts
    blacklisted: { tone: "rose", label: "Blacklisted" },
    flagged: { tone: "amber", label: "Flagged" },
    acknowledged: { tone: "sky", label: "Acknowledged" },
    // billing / invoices
    draft: { tone: "slate", label: "Draft" },
    generated: { tone: "sky", label: "Generated" },
    partially_paid: { tone: "amber", label: "Partially paid" },
    overdue: { tone: "rose", label: "Overdue" },
    cancelled: { tone: "slate", label: "Cancelled" },
    due: { tone: "amber", label: "Due" },
    // helpdesk / tickets
    created: { tone: "sky", label: "Created" },
    assigned: { tone: "violet", label: "Assigned" },
    accepted: { tone: "sky", label: "Accepted" },
    pending_approval: { tone: "amber", label: "Pending approval" },
    reopened: { tone: "rose", label: "Reopened" },
    on_hold: { tone: "slate", label: "On hold" },
  };
  const m = map[status] ?? { tone: "slate", label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/* ---------------- Button ---------------- */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
    secondary:
      "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
  };
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Icon name="loader-circle" size={iconSize} className="animate-spin" />
      ) : (
        icon && <Icon name={icon} size={iconSize} />
      )}
      {children}
    </button>
  );
}

/* ---------------- QuickActionButton ---------------- */
export function QuickActionButton({ label, icon, tone = "brand", onClick, hint }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
    sky: "bg-sky-50 text-sky-600 group-hover:bg-sky-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
  };
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors", tones[tone])}>
        <Icon name={icon} size={20} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-800">{label}</span>
        {hint && <span className="block truncate text-xs text-slate-400">{hint}</span>}
      </span>
    </button>
  );
}

/* ---------------- Breadcrumbs ---------------- */
export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <Icon name="chevron-right" size={13} className="text-slate-300" />}
          {it.href && i < items.length - 1 ? (
            <a href={it.href} className="transition-colors hover:text-slate-600">
              {it.label}
            </a>
          ) : (
            <span className={cn(i === items.length - 1 && "font-medium text-slate-600")}>
              {it.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ---------------- PageHeader ---------------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Progress ---------------- */
export function Progress({ value, className, tone = "brand" }) {
  const tones = {
    brand: "bg-brand-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ---------------- Table ---------------- */
export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}
export function Td({ children, className }) {
  return (
    <td className={cn("whitespace-nowrap px-4 py-3 text-slate-700", className)}>
      {children}
    </td>
  );
}
export function Tr({ children, className, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-t border-slate-100 transition-colors hover:bg-slate-50/70",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({ icon = "inbox", title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Icon name={icon} size={22} />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {subtitle && <p className="mt-1 max-w-xs text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ name, src, size = 36, className }) {
  const init = (name ?? "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || "avatar"} className="h-full w-full object-cover" />
      ) : (
        init
      )}
    </span>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={cn(
          "w-full animate-fade-in rounded-t-2xl bg-white shadow-xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- ConfirmDialog ---------------- */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  confirmVariant = "danger",
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">
        {message ?? "This action cannot be undone."}
      </p>
    </Modal>
  );
}

/* ---------------- Drawer (slide-over) ---------------- */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative flex h-full w-full flex-col bg-white shadow-2xl", width)} style={{ animation: "slideIn .22s ease-out" }}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors",
            value === t.value
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", value === t.value ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Field ---------------- */
export function Field({ label, children, hint, error, required }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-slate-600">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

// Append to inputClass when a field is invalid, so the control echoes the
// inline error message with a red border/ring.
export const inputErrorClass =
  "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

/* ---------------- PasswordInput (with show/hide eye) ---------------- */
export function PasswordInput({ value, onChange, placeholder, className, autoComplete = "new-password", ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(inputClass, "pr-10", className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 transition-colors hover:text-slate-600"
      >
        <Icon name={show ? "eye-off" : "eye"} size={16} />
      </button>
    </div>
  );
}

/* ---------------- Pagination ----------------
   Pairs with the backend pagination envelope (total / page / pageSize /
   totalPages) and useListControls. Shows the record range, a page-size picker
   (10/25/50/100) and prev/next. Renders nothing when there's a single page and
   no size picker to offer. */
export function Pagination({ page, totalPages = 1, total, pageSize, onPage, onPageSize }) {
  if (totalPages <= 1 && !onPageSize) return null;
  const from = total != null && total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = total != null ? Math.min(page * pageSize, total) : 0;
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 p-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {total != null && (
          <span>{total === 0 ? "No records" : `${from}–${to} of ${total}`}</span>
        )}
        {onPageSize && (
          <select
            aria-label="Rows per page"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>Page {page} of {totalPages}</span>
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/* ---------------- SortTh ----------------
   A sortable table header. `sortKey` is the value sent to the backend's
   allow-listed `sort` param; clicking toggles asc/desc via onSort(sortKey). */
export function SortTh({ children, sortKey, sort, dir, onSort, className }) {
  const active = sort === sortKey;
  return (
    <Th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-[inherit] uppercase tracking-wide hover:text-slate-700"
      >
        {children}
        <Icon
          name={active ? (dir === "asc" ? "chevron-up" : "chevron-down") : "chevrons-up-down"}
          size={13}
          className={active ? "text-slate-600" : "text-slate-300"}
        />
      </button>
    </Th>
  );
}

/* ---------------- SegmentedControl ---------------- */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1.5 text-xs text-slate-400">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
