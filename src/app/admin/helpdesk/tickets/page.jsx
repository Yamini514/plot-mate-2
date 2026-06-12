"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  Button,
  Badge,
  StatusBadge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  Drawer,
  Avatar,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import {
  tickets as seed,
  CATEGORIES,
  PRIORITIES,
  KANBAN_COLUMNS,
  ASSIGNMENT_MAP,
  SLA_HOURS,
} from "@/lib/helpdesk-data";

const catMeta = (v) => CATEGORIES.find((c) => c.value === v) ?? { label: v, icon: "circle-help" };

const slaBadge = (t) => {
  if (t.slaState === "breached") return <Badge tone="rose"><Icon name="alarm-clock-off" size={11} /> {t.slaRemaining}</Badge>;
  if (t.slaState === "due_soon") return <Badge tone="amber"><Icon name="clock" size={11} /> {t.slaRemaining}</Badge>;
  return <Badge tone="slate"><Icon name="clock" size={11} /> {t.slaRemaining}</Badge>;
};

// Allowed next statuses given the current one.
const NEXT = {
  created: [["assigned", "Assign", "user-check"], ["cancelled", "Cancel", "x"]],
  assigned: [["accepted", "Accept", "check"], ["escalated", "Escalate", "trending-up"]],
  accepted: [["in_progress", "Start work", "play"]],
  in_progress: [["pending_approval", "Send for approval", "send"], ["resolved", "Resolve", "circle-check-big"]],
  pending_approval: [["resolved", "Approve & resolve", "circle-check-big"], ["in_progress", "Send back", "rotate-ccw"]],
  resolved: [["closed", "Close", "archive"], ["reopened", "Reopen", "rotate-ccw"]],
  reopened: [["in_progress", "Resume", "play"], ["escalated", "Escalate", "trending-up"]],
  escalated: [["in_progress", "Take over", "play"], ["resolved", "Resolve", "circle-check-big"]],
  closed: [["reopened", "Reopen", "rotate-ccw"]],
};

export default function Tickets() {
  const toast = useToast();
  const [rows, setRows] = useState(seed);
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const [status, setStatusFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [picked, setPicked] = useState(() => new Set());
  const [active, setActive] = useState(null);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const filtered = rows.filter((t) => {
    const q = !query || [t.id, t.subject, t.createdBy, t.assignee, t.location].join(" ").toLowerCase().includes(query.toLowerCase());
    const s = status === "all" || t.status === status;
    const c = category === "all" || t.category === category;
    const p = priority === "all" || t.priority === priority;
    return q && s && c && p;
  });

  const transition = (ids, next, verb) => {
    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, status: next } : r)));
    toast(`${ids.length > 1 ? ids.length + " tickets" : ids[0]} ${verb}`);
    setPicked(new Set());
    setActive((a) => (a && ids.includes(a.id) ? { ...a, status: next } : a));
  };

  const autoAssign = (t) => {
    const who = ASSIGNMENT_MAP[t.category] ?? "Front Office";
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, assignee: who, status: r.status === "created" ? "assigned" : r.status } : r)));
    setActive((a) => (a && a.id === t.id ? { ...a, assignee: who, status: a.status === "created" ? "assigned" : a.status } : a));
    toast(`Auto-assigned ${t.id} → ${who}`);
  };

  const toggle = (id) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const pickedIds = [...picked];

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/admin/helpdesk" }, { label: "Support" }, { label: "Tickets" }]} />
      <PageHeader
        title="Service Tickets"
        subtitle="Assign, track and resolve service requests across the community"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast(`Exported ${filtered.length} tickets (CSV)`)}>Export</Button>
            <Button icon="plus" onClick={() => toast("New ticket form opened", "info")}>New ticket</Button>
          </>
        }
      />

      {/* Toolbar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Icon name="search" size={16} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticket, subject, requester, assignee…" className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none" />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
              <option value="all">All priorities</option>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <Segmented value={view} onChange={setView} options={[{ value: "list", label: "List" }, { value: "kanban", label: "Kanban" }]} />
          </div>
          {view === "list" && (
            <Segmented
              value={status}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "created", label: "New", count: counts.created ?? 0 },
                { value: "in_progress", label: "In progress", count: counts.in_progress ?? 0 },
                { value: "escalated", label: "Escalated", count: counts.escalated ?? 0 },
                { value: "resolved", label: "Resolved", count: counts.resolved ?? 0 },
                { value: "closed", label: "Closed", count: counts.closed ?? 0 },
              ]}
            />
          )}
        </div>
      </Card>

      {/* Bulk bar */}
      {pickedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-800">{pickedIds.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon="user-check" onClick={() => transition(pickedIds, "assigned", "assigned")}>Assign</Button>
            <Button size="sm" variant="secondary" icon="trending-up" onClick={() => transition(pickedIds, "escalated", "escalated")}>Escalate</Button>
            <Button size="sm" variant="ghost" icon="archive" onClick={() => transition(pickedIds, "closed", "closed")}>Close</Button>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon="ticket" title="No tickets" subtitle="Adjust filters or search." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-10"></Th>
                  <Th>Ticket</Th>
                  <Th>Category</Th>
                  <Th>Priority</Th>
                  <Th>Assignee</Th>
                  <Th>SLA</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const cm = catMeta(t.category);
                  return (
                    <Tr key={t.id} onClick={() => setActive(t)}>
                      <Td>
                        <span onClick={(e) => e.stopPropagation()} className="inline-flex">
                          <input type="checkbox" checked={picked.has(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 accent-brand-600" />
                        </span>
                      </Td>
                      <Td>
                        <p className="font-medium text-slate-800">{t.subject}</p>
                        <p className="text-xs text-slate-400">{t.id} · {t.location}</p>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <Icon name={cm.icon} size={14} className="text-slate-400" /> {cm.label}
                        </span>
                      </Td>
                      <Td><StatusBadge status={t.priority} /></Td>
                      <Td className="text-slate-600">{t.assignee ?? <span className="text-slate-400">Unassigned</span>}</Td>
                      <Td>{slaBadge(t)}</Td>
                      <Td><StatusBadge status={t.status} /></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {KANBAN_COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-sm font-semibold text-slate-700">{col.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-2 rounded-xl bg-slate-100/70 p-2">
                  {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">No tickets</p>}
                  {items.map((t) => {
                    const cm = catMeta(t.category);
                    return (
                      <button key={t.id} onClick={() => setActive(t)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400">{t.id}</span>
                          <StatusBadge status={t.priority} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">{t.subject}</p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <Icon name={cm.icon} size={13} className="text-slate-400" /> {cm.label}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {slaBadge(t)}
                          {t.assignee && <Avatar name={t.assignee} size={22} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL DRAWER */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        width="max-w-xl"
        title={active?.subject}
        subtitle={active ? `${active.id} · ${active.location}` : ""}
        footer={
          active && (
            <div className="flex w-full flex-wrap items-center gap-2">
              {(NEXT[active.status] ?? []).map(([next, label, icon]) => (
                <Button
                  key={next}
                  size="sm"
                  variant={["cancelled", "escalated", "reopened"].includes(next) ? "secondary" : "primary"}
                  icon={icon}
                  onClick={() => transition([active.id], next, label.toLowerCase())}
                >
                  {label}
                </Button>
              ))}
            </div>
          )
        }
      >
        {active && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={active.status} />
              <StatusBadge status={active.priority} />
              <Badge tone="slate"><Icon name={catMeta(active.category).icon} size={11} /> {catMeta(active.category).label}</Badge>
              {slaBadge(active)}
              {active.reopenCount > 0 && <Badge tone="amber"><Icon name="rotate-ccw" size={11} /> Reopened ×{active.reopenCount}</Badge>}
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
              <p className="text-sm leading-relaxed text-slate-600">{active.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Meta label="Requested by" value={active.createdBy} />
              <Meta label="Created" value={active.created} />
              <Meta label="SLA target" value={`${SLA_HOURS[active.priority]}h (${active.priority})`} />
              <Meta label="Location" value={active.location} />
            </div>

            {/* Assignment */}
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Assigned to</p>
                  <p className="text-sm font-medium text-slate-800">{active.assignee ?? "Unassigned"}</p>
                </div>
                <Button size="sm" variant="secondary" icon="wand-sparkles" onClick={() => autoAssign(active)}>Auto-assign</Button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Routing rule: <span className="font-medium text-slate-600">{catMeta(active.category).label} → {ASSIGNMENT_MAP[active.category] ?? "Front Office"}</span>
              </p>
            </div>

            {/* Workflow timeline */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow</p>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {["Created", "Assigned", "Accepted", "In Progress", "Resolved", "Closed"].map((s, idx) => (
                  <span key={s} className="flex items-center gap-1.5">
                    {idx > 0 && <Icon name="chevron-right" size={12} className="text-slate-300" />}
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">{s}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Comment box */}
            <div>
              <Field label="Add an internal note">
                <textarea rows={2} className={inputClass} placeholder="Update the requester or team…" />
              </Field>
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="secondary" icon="message-square" onClick={() => toast("Note added")}>Add note</Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}
