"use client";

import { useMemo, useState, useEffect } from "react";
import {
  PageHeader,
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
  Modal,
  Avatar,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import {
  CATEGORIES,
  PRIORITIES,
  KANBAN_COLUMNS,
  ASSIGNMENT_MAP,
  SLA_HOURS,
} from "@/lib/helpdesk-data";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { WorkOrderMaterials } from "@/components/WorkOrderMaterials";
import { formatDate, formatINR } from "@/lib/utils";

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

export function TicketsPanel() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/admin/helpdesk/tickets", { page_size: 300 });
  const rows = normalizeList(raw);
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const [status, setStatusFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [picked, setPicked] = useState(() => new Set());
  const [active, setActive] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(null);
  const [drawerBusy, setDrawerBusy] = useState(null);
  // Drawer detail (photos, completion note) + work-order action inputs.
  const [detail, setDetail] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vendorSel, setVendorSel] = useState("");
  const [note, setNote] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [rateScore, setRateScore] = useState(0);
  const [comment, setComment] = useState("");

  const postComment = async () => {
    if (!comment.trim()) return toast("Write a reply", "error");
    setDrawerBusy("comment");
    try {
      await api.post(`/admin/helpdesk/tickets/${active.dbId}/comment`, { body: comment.trim(), internal: true });
      setComment("");
      refreshDetail();
    } catch (e) { toast(e.message || "Could not post", "error"); }
    finally { setDrawerBusy(null); }
  };
  const [reason, setReason] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoKind, setPhotoKind] = useState("before");

  // When a ticket drawer opens, load its photos + the eligible vendors for its
  // category so the admin can assign a specific verified vendor.
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear detail when drawer closes
      setDetail(null);
      return;
    }
    setNote("");
    setReason("");
    setPhotoUrl("");
    setVendorSel("");
    let cancelled = false;
    (async () => {
      try {
        const [d, v] = await Promise.all([
          api.get(`/admin/helpdesk/tickets/${active.dbId}`),
          api.get("/admin/staff/eligible", { category: active.category }),
        ]);
        if (cancelled) return;
        setDetail(d.data);
        setVendors(normalizeList(v.data));
      } catch {
        if (!cancelled) setDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const refreshDetail = async () => {
    if (!active) return;
    try {
      const d = await api.get(`/admin/helpdesk/tickets/${active.dbId}`);
      setDetail(d.data);
    } catch {
      /* ignore */
    }
  };

  const assignVendor = async () => {
    if (!vendorSel) return toast("Pick a vendor", "error");
    setDrawerBusy("assignVendor");
    try {
      await api.post(`/admin/helpdesk/tickets/${active.dbId}/assign`, { assigneeStaffId: Number(vendorSel) });
      toast("Vendor assigned");
      setActive(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not assign", "error");
    } finally {
      setDrawerBusy(null);
    }
  };

  const completeWithNote = async () => {
    if (!note.trim()) return toast("Add a completion note", "error");
    setDrawerBusy("complete");
    try {
      await api.post(`/admin/helpdesk/tickets/${active.dbId}/complete`, {
        completion_note: note.trim(),
        labour_cost: labourCost === "" ? undefined : Number(labourCost),
      });
      toast("Marked resolved — owner notified");
      setActive(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not complete", "error");
    } finally {
      setDrawerBusy(null);
    }
  };

  const rejectWork = async () => {
    if (!reason.trim()) return toast("Add a reason", "error");
    setDrawerBusy("reject");
    try {
      await api.post(`/admin/helpdesk/tickets/${active.dbId}/reject`, { reason: reason.trim() });
      toast("Sent back to the queue");
      setActive(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not reject", "error");
    } finally {
      setDrawerBusy(null);
    }
  };

  const addPhoto = async () => {
    if (!photoUrl.trim()) return toast("Paste a photo URL", "error");
    setDrawerBusy("photo");
    try {
      await api.post(`/admin/helpdesk/tickets/${active.dbId}/photos`, { url: photoUrl.trim(), kind: photoKind });
      setPhotoUrl("");
      toast("Photo added");
      refreshDetail();
    } catch (e) {
      toast(e.message || "Could not add photo", "error");
    } finally {
      setDrawerBusy(null);
    }
  };

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

  const dbIdOf = (id) => rows.find((r) => r.id === id)?.dbId;

  const transition = async (ids, next, verb, scope) => {
    const setBusy = scope === "drawer" ? setDrawerBusy : setBulkBusy;
    setBusy(scope === "drawer" ? next : verb);
    try {
      await Promise.all(ids.map((id) => api.post(`/admin/helpdesk/tickets/${dbIdOf(id)}/transition`, { to: next })));
      toast(`${ids.length > 1 ? ids.length + " tickets" : ids[0]} ${verb}`);
      setPicked(new Set());
      setActive(null);
      reload();
    } catch (e) {
      toast(e.message || "That transition isn't allowed", "error");
      reload();
    } finally {
      setBusy(null);
    }
  };

  const assignMany = async (ids, scope) => {
    const setBusy = scope === "drawer" ? setDrawerBusy : setBulkBusy;
    setBusy("assign");
    try {
      await Promise.all(ids.map((id) => api.post(`/admin/helpdesk/tickets/${dbIdOf(id)}/assign`)));
      toast(`${ids.length} ticket(s) auto-assigned`);
      setPicked(new Set());
      setActive(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not assign", "error");
    } finally {
      setBusy(null);
    }
  };

  const autoAssign = (t) => assignMany([t.id], "drawer");

  const toggle = (id) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Backend assigns code, SLA (from priority) and routing on create.
  const createTicket = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const { data } = await api.post("/admin/helpdesk/tickets", {
        subject: f.get("subject") || "Untitled request",
        description: f.get("description") || "",
        category: f.get("category"),
        priority: f.get("priority"),
        location: f.get("location") || "—",
      });
      toast(`${data.code} created`);
      setCreateOpen(false);
      reload();
    } catch (err) {
      toast(err.message || "Could not create ticket", "error");
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const cols = [
      ["id", "Ticket"], ["subject", "Subject"], ["category", "Category"], ["priority", "Priority"],
      ["status", "Status"], ["assignee", "Assignee"], ["location", "Location"], ["created", "Created"],
    ];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = cols.map((c) => esc(c[1])).join(",");
    const body = filtered.map((t) => cols.map((c) => esc(t[c[0]])).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plotmate-tickets.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${filtered.length} tickets (CSV)`);
  };

  const pickedIds = [...picked];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Service Tickets"
        subtitle="Assign, track and resolve service requests across the community"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exportCSV}>Export</Button>
            <Button icon="plus" onClick={() => setCreateOpen(true)}>New ticket</Button>
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
            <Button size="sm" variant="secondary" icon="user-check" loading={bulkBusy === "assign"} onClick={() => assignMany(pickedIds)}>Assign</Button>
            <Button size="sm" variant="secondary" icon="trending-up" loading={bulkBusy === "escalated"} onClick={() => transition(pickedIds, "escalated", "escalated")}>Escalate</Button>
            <Button size="sm" variant="ghost" icon="archive" loading={bulkBusy === "closed"} onClick={() => transition(pickedIds, "closed", "closed")}>Close</Button>
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
                  loading={drawerBusy === next}
                  onClick={() => transition([active.id], next, label.toLowerCase(), "drawer")}
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
                <Button size="sm" variant="secondary" icon="wand-sparkles" loading={drawerBusy === "assign"} onClick={() => autoAssign(active)}>Auto-assign</Button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Routing rule: <span className="font-medium text-slate-600">{catMeta(active.category).label} → {ASSIGNMENT_MAP[active.category] ?? "Front Office"}</span>
              </p>
              {/* Assign a specific verified vendor */}
              <div className="mt-3 flex items-end gap-2 border-t border-slate-200 pt-3">
                <Field label="Assign a verified vendor">
                  <select className={inputClass} value={vendorSel} onChange={(e) => setVendorSel(e.target.value)}>
                    <option value="">{vendors.length ? "Select a vendor…" : "No eligible vendors for this category"}</option>
                    {vendors.map((v) => (
                      <option key={v.dbId} value={v.dbId}>
                        {v.name}{v.preferred ? " ★" : ""}{v.slaResponseHours ? ` · ${v.slaResponseHours}h SLA` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button size="sm" icon="user-check" loading={drawerBusy === "assignVendor"} disabled={!vendorSel} onClick={assignVendor}>Assign</Button>
              </div>
            </div>

            {/* Before / after work photos */}
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Work photos</p>
              <div className="grid grid-cols-2 gap-3">
                {[["Before", "before"], ["After", "after"]].map(([label, kind]) => {
                  const list = (detail?.photos ?? []).filter((p) => p.kind === kind);
                  return (
                    <div key={kind}>
                      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        {list.map((p) => (
                          <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt={p.caption || label} className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
                          </a>
                        ))}
                        {list.length === 0 && <span className="text-xs text-slate-300">—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <Field label="Add a photo (URL)">
                  <input className={inputClass} placeholder="https://…/photo.jpg" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                </Field>
                <select className={inputClass + " w-28"} value={photoKind} onChange={(e) => setPhotoKind(e.target.value)}>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </select>
                <Button size="sm" variant="secondary" icon="image-plus" loading={drawerBusy === "photo"} onClick={addPhoto}>Add</Button>
              </div>
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

            {/* Vendor decline reason (if any) */}
            {detail?.rejectedReason && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Vendor declined: {detail.rejectedReason}
              </div>
            )}

            {/* Materials & cost */}
            {detail && (
              <WorkOrderMaterials base="/admin/helpdesk/tickets" ticketId={active.dbId} detail={detail} onChanged={refreshDetail} />
            )}

            {/* Timeline + vendor↔admin comments */}
            {detail && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</p>
                {(detail.events?.length ?? 0) === 0 ? (
                  <p className="text-xs text-slate-400">No activity yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {detail.events.map((e) => (
                      <li key={e.id} className="flex gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon name="dot" size={12} /></span>
                        <div><p className="text-slate-700">{e.body}</p><p className="text-xs text-slate-400">{e.actorName || "system"} · {formatDate(e.createdAt)}</p></div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex items-end gap-2">
                  <Field label="Reply to vendor">
                    <input className={inputClass} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Message the vendor…" />
                  </Field>
                  <Button size="sm" variant="secondary" icon="message-square-plus" loading={drawerBusy === "comment"} onClick={postComment}>Post</Button>
                </div>
              </div>
            )}

            {/* Vendor payment status (on completed work orders) */}
            {detail?.assigneeStaffId && ["resolved", "closed"].includes(detail.status) && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Vendor payment</p>
                  <p className="text-xs text-slate-400">Total {formatINR(detail.totalCost ?? 0)}</p>
                </div>
                <select className={`${inputClass} w-36`} value={detail.paymentStatus || "pending"}
                  onChange={async (e) => {
                    try { await api.post(`/admin/helpdesk/tickets/${active.dbId}/payment-status`, { status: e.target.value }); toast("Payment status updated"); refreshDetail(); }
                    catch (err) { toast(err.message || "Could not update", "error"); }
                  }}>
                  {["pending", "approved", "paid"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Rate the vendor (once a vendor is assigned) */}
            {detail?.assigneeStaffId && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Rate vendor</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRateScore(n)} className={n <= rateScore ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}>
                      <Icon name="star" size={20} />
                    </button>
                  ))}
                  <Button size="sm" variant="secondary" className="ml-auto" loading={drawerBusy === "rate"} disabled={!rateScore}
                    onClick={async () => {
                      setDrawerBusy("rate");
                      try {
                        await api.post(`/admin/staff/${detail.assigneeStaffId}/rate`, { score: rateScore, ticketId: active.dbId });
                        toast("Vendor rated");
                        setRateScore(0);
                      } catch (e) { toast(e.message || "Could not rate", "error"); }
                      finally { setDrawerBusy(null); }
                    }}>Submit rating</Button>
                </div>
              </div>
            )}

            {/* Complete with a report (notifies the owner) */}
            <div className="rounded-xl border border-slate-200 p-4">
              <Field label="Completion note">
                <textarea rows={2} className={inputClass} placeholder="What was done…" value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <Field label="Labour cost (₹)">
                <input type="number" min="0" className={inputClass} placeholder="0" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} />
              </Field>
              <div className="mt-2 flex justify-end">
                <Button size="sm" icon="circle-check-big" loading={drawerBusy === "complete"} onClick={completeWithNote}>Complete &amp; notify owner</Button>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <Field label="Send back to queue (reason)">
                  <input className={inputClass} placeholder="e.g. vendor unavailable — reassign" value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="secondary" icon="undo-2" loading={drawerBusy === "reject"} onClick={rejectWork}>Send back</Button>
                </div>
              </div>
            </div>

            {detail?.completionNote && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Completion note</p>
                <p className="text-sm text-slate-600">{detail.completionNote}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* New ticket */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New service ticket"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="new-ticket" icon="send" loading={saving}>Create ticket</Button>
          </>
        }
      >
        <form id="new-ticket" onSubmit={createTicket} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Subject">
              <input name="subject" required className={inputClass} placeholder="e.g. Lift not working in B-block" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea name="description" rows={2} className={inputClass} placeholder="Describe the issue…" />
            </Field>
          </div>
          <Field label="Category">
            <select name="category" defaultValue="maintenance" className={inputClass}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue="medium" className={inputClass}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Location">
              <input name="location" className={inputClass} placeholder="e.g. Block B Lobby" />
            </Field>
          </div>
          <p className="sm:col-span-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Icon name="wand-sparkles" size={12} /> SLA is set from priority and the ticket is auto-routed by category.
          </p>
        </form>
      </Modal>
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
