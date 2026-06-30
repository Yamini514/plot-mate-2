"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  StatCard,
  Segmented,
  Modal,
  Avatar,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  ConfirmDialog,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList, fieldErrors } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { presence, collect, hasErrors } from "@/lib/validate";
import { useSettings } from "@/lib/useSettings";
import { formatDate } from "@/lib/utils";
import { uploadDocument, formatBytes } from "@/lib/upload";

const ESC_LABEL = { l1: "L1", l2: "L2", l3: "L3" };
const EVENT_ICON = {
  note: "message-square", status: "refresh-cw", assignment: "user-check",
  escalation: "trending-up", confirmation: "circle-check-big", reopen: "rotate-ccw",
  attachment: "paperclip",
};

function downloadCSV(filename, rows, columns) {
  const head = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows.map((r) => columns.map((c) => `"${String(c.get(r) ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([head + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const catIcon = {
  Roads: "construction",
  Water: "droplets",
  Electricity: "zap",
  Security: "shield",
  Cleanliness: "trash-2",
  Other: "circle-help",
};

export default function ComplaintsPage() {
  const { data: raw, reload } = useApi("/admin/complaints", { page_size: 300 });
  const allComplaints = normalizeList(raw);
  const { data: rawStaff } = useApi("/admin/staff");
  const { settings } = useSettings();
  const { user } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [assignFor, setAssignFor] = useState(null); // complaint being (re)assigned
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [noteErrors, setNoteErrors] = useState({});
  const [reopenErrors, setReopenErrors] = useState({});
  const fileRef = useRef(null);

  // Full detail (timeline + attachments) for the open complaint.
  const { data: detail, reload: reloadDetail } = useApi(
    selected ? `/admin/complaints/${selected.dbId}` : null,
  );
  const events = Array.isArray(detail?.events) ? detail.events : [];
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];
  const escLevel = detail?.escalationLevel;

  const refresh = () => { reload(); reloadDetail(); };

  const act = async (action, body, label) => {
    if (!selected) return;
    setBusyAction(action);
    try {
      await api.post(`/admin/complaints/${selected.dbId}/${action}`, body || {});
      if (label) toast(label);
      refresh();
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally { setBusyAction(null); }
  };

  const addNote = async () => {
    const errs = collect({ note: presence(note, "Note") });
    setNoteErrors(errs);
    if (hasErrors(errs)) return;
    if (!selected) return;
    setBusyAction("note");
    try {
      await api.post(`/admin/complaints/${selected.dbId}/note`, { body: note.trim(), internal });
      toast("Note added");
      refresh();
      setNote("");
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setNoteErrors(fe);
      else toast(e.message || "Action failed", "error");
    } finally { setBusyAction(null); }
  };

  const escalate = () => act("escalate", {}, "Escalated");

  const doReopen = async () => {
    const errs = collect({ reopenReason: presence(reopenReason, "Reason") });
    setReopenErrors(errs);
    if (hasErrors(errs)) return;
    if (!selected) return;
    setBusyAction("reopen");
    try {
      await api.post(`/admin/complaints/${selected.dbId}/reopen`, { reason: reopenReason.trim() });
      toast("Reopened");
      refresh();
      setReopenOpen(false);
      setReopenReason("");
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setReopenErrors(fe);
      else toast(e.message || "Action failed", "error");
    } finally { setBusyAction(null); }
  };

  const attachFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url, key } = await uploadDocument(file);
      await api.post(`/admin/complaints/${selected.dbId}/attachments`, {
        name: file.name, url, key, size: file.size,
      });
      toast("Attachment added");
      refresh();
    } catch (e) {
      toast(e.message || "Could not attach file", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Candidate assignees: committee members + staff/vendors — anyone the admin
  // can hand a complaint to, each carrying their own contact details.
  const assignees = useMemo(() => {
    const committee = (settings.committee ?? [])
      .filter((m) => (m.name || "").trim())
      .map((m) => ({ name: m.name, role: m.role || "Committee", phone: m.phone || "", email: m.email || "", group: "Committee" }));
    const staff = normalizeList(rawStaff)
      .filter((s) => (s.name || "").trim())
      .map((s) => ({ name: s.name, role: s.role || (s.type === "vendor" ? "Vendor" : "Staff"), phone: s.phone || "", email: "", group: s.type === "vendor" ? "Vendors" : "Staff" }));
    return [...committee, ...staff];
  }, [settings.committee, rawStaff]);

  const counts = useMemo(() => {
    return {
      open: allComplaints.filter((c) => c.status === "open").length,
      in_progress: allComplaints.filter((c) => c.status === "in_progress").length,
      resolved: allComplaints.filter((c) => c.status === "resolved").length,
      high: allComplaints.filter((c) => c.priority === "high").length,
    };
  }, [allComplaints]);

  const filtered = allComplaints.filter(
    (c) => filter === "all" || c.status === filter,
  );

  const resolve = () => act("resolve", {}, "Marked resolved");

  const assign = async (assignee) => {
    const complaint = assignFor;
    if (!complaint || !assignee?.name?.trim()) return;
    setBusyAction("assign");
    try {
      await api.post(`/admin/complaints/${complaint.dbId}/assign`, {
        assignedTo: assignee.name.trim(),
        assignedPhone: assignee.phone || null,
        assignedEmail: assignee.email || null,
      });
      toast(`${complaint.id} assigned to ${assignee.name.trim()}`);
      setAssignFor(null);
      refresh();
    } catch (e) {
      toast(e.message || "Could not assign", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/complaints/${confirmDelete.dbId}`);
      toast(`${confirmDelete.id} deleted`);
      setConfirmDelete(null);
      setSelected(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Complaints"
        subtitle="Resident-reported issues and resolution tracking"
        actions={<Button variant="secondary" icon="download" onClick={() => {
          downloadCSV("plotmate-complaints.csv", filtered, [
            { label: "ID", get: (c) => c.id },
            { label: "Issue", get: (c) => c.title },
            { label: "Category", get: (c) => c.category },
            { label: "Raised by", get: (c) => c.raisedBy },
            { label: "Plot", get: (c) => c.plotNo },
            { label: "Priority", get: (c) => c.priority },
            { label: "Status", get: (c) => c.status },
            { label: "Assigned to", get: (c) => c.assignedTo },
            { label: "Updated", get: (c) => c.updatedAt },
          ]);
          toast(`Exported ${filtered.length} complaints`);
        }}>Export</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open" value={`${counts.open}`} icon="circle-dot" tone="rose" />
        <StatCard label="In progress" value={`${counts.in_progress}`} icon="loader" tone="amber" />
        <StatCard label="Resolved" value={`${counts.resolved}`} icon="circle-check-big" tone="brand" />
        <StatCard label="High priority" value={`${counts.high}`} icon="flame" tone="rose" />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: allComplaints.length },
              { value: "open", label: "Open", count: counts.open },
              { value: "in_progress", label: "In progress", count: counts.in_progress },
              { value: "resolved", label: "Resolved", count: counts.resolved },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="party-popper" title="Nothing here" subtitle="No complaints with this status." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Issue</Th>
                <Th>Category</Th>
                <Th>Raised by</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <Tr key={c.id} onClick={() => setSelected(c)}>
                  <Td className="font-mono text-xs text-slate-400">{c.id}</Td>
                  <Td className="font-medium text-slate-800">{c.title}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <Icon name={catIcon[c.category] ?? "circle-help"} size={14} />
                      {c.category}
                    </span>
                  </Td>
                  <Td className="text-slate-500">
                    {c.raisedBy} · {c.plotNo}
                  </Td>
                  <Td>
                    <StatusBadge status={c.priority} />
                  </Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td className="text-slate-500">{formatDate(c.updatedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setNoteErrors({}); }}
        title={selected?.title ?? ""}
        wide
        footer={
          <>
            <Button variant="ghost" icon="trash-2" onClick={() => setConfirmDelete(selected)}>
              Delete
            </Button>
            {["resolved", "closed"].includes(detail?.status ?? selected?.status) ? (
              <Button variant="secondary" icon="rotate-ccw" loading={busyAction === "reopen"} onClick={() => { setReopenErrors({}); setReopenOpen(true); }}>
                Reopen
              </Button>
            ) : (
              <>
                <Button variant="secondary" icon="trending-up" loading={busyAction === "escalate"} disabled={escLevel === "l3"} onClick={escalate}>
                  Escalate{escLevel ? ` (${ESC_LABEL[escLevel]})` : ""}
                </Button>
                <Button variant="secondary" icon="user-check" onClick={() => setAssignFor(selected)}>
                  {selected?.assignedTo ? "Reassign" : "Assign"}
                </Button>
                <Button icon="circle-check-big" loading={busyAction === "resolve"} onClick={resolve}>Mark resolved</Button>
              </>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="slate">{selected.id}</Badge>
              <StatusBadge status={detail?.status ?? selected.status} />
              <StatusBadge status={selected.priority} />
              {escLevel && <Badge tone="rose">Escalated · {ESC_LABEL[escLevel]}</Badge>}
              {detail?.residentConfirmed && <Badge tone="green">Resident confirmed</Badge>}
              {detail?.reopenCount > 0 && <Badge tone="amber">Reopened ×{detail.reopenCount}</Badge>}
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <Icon name={catIcon[selected.category] ?? "circle-help"} size={14} />
                {selected.category}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              {selected.description}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ContactCard
                heading="Raised by"
                name={selected.raisedBy}
                sub={`Plot ${selected.plotNo ?? "—"} · raised ${formatDate(selected.createdAt)}`}
                phone={selected.raisedByPhone}
                email={selected.raisedByEmail}
                tone="slate"
              />
              <ContactCard
                heading="Assigned to"
                name={selected.assignedTo}
                sub={selected.assignedTo ? "Handling this complaint" : "Not assigned yet"}
                phone={selected.assignedPhone}
                email={selected.assignedEmail}
                tone="violet"
                empty="Unassigned"
              />
            </div>

            {/* The admin currently managing the desk — the resident's point of contact. */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="headset" size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Managed by (admin)</p>
                <p className="text-sm font-medium text-slate-700">
                  {user?.name ?? "Association office"}
                  {user?.title ? ` · ${user.title}` : ""}
                </p>
              </div>
              {user?.email && (
                <a href={`mailto:${user.email}`} className="ml-auto text-xs font-medium text-brand-600 hover:underline">
                  {user.email}
                </a>
              )}
            </div>

            {/* Attachments */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attachments</h4>
                <Button variant="ghost" icon="paperclip" loading={uploading} onClick={() => fileRef.current?.click()}>Add file</Button>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden
                  onChange={(e) => attachFile(e.target.files?.[0])} />
              </div>
              {attachments.length === 0 ? (
                <p className="text-xs text-slate-400">No attachments.</p>
              ) : (
                <ul className="space-y-1.5">
                  {attachments.map((a, i) => (
                    <li key={i}>
                      <a href={a.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-brand-700 hover:underline">
                        <Icon name="file" size={14} /> {a.name}
                        {a.size ? <span className="text-xs text-slate-400">({formatBytes(a.size)})</span> : null}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</h4>
              {events.length === 0 ? (
                <p className="text-xs text-slate-400">No activity yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {events.map((e) => (
                    <li key={e.id} className="flex gap-2.5 text-sm">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                        <Icon name={EVENT_ICON[e.kind] ?? "dot"} size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-slate-700">
                          {e.body}
                          {e.internal && <Badge tone="amber" className="ml-2">internal</Badge>}
                        </p>
                        <p className="text-xs text-slate-400">{e.actorName || "system"} · {formatDate(e.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Add note */}
            <div className="border-t border-slate-100 pt-4">
              <Field label="Add note" error={noteErrors.note}>
                <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note or update…" />
              </Field>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  Internal (hidden from resident)
                </label>
                <Button variant="secondary" icon="message-square-plus" loading={busyAction === "note"} onClick={addNote}>Add note</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reopen reason */}
      <Modal
        open={reopenOpen}
        onClose={() => { setReopenOpen(false); setReopenErrors({}); }}
        title="Reopen complaint"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReopenOpen(false)}>Cancel</Button>
            <Button icon="rotate-ccw" loading={busyAction === "reopen"} onClick={doReopen}>Reopen</Button>
          </>
        }
      >
        <Field label="Reason" hint="Recorded in the timeline and audit trail." error={reopenErrors.reopenReason}>
          <textarea className={inputClass} rows={3} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Why is this being reopened?" />
        </Field>
      </Modal>

      {/* Assign / reassign — pick a committee member, staff or vendor (contact attached) */}
      <AssignModal
        complaint={assignFor}
        assignees={assignees}
        busy={busyAction === "assign"}
        onClose={() => setAssignFor(null)}
        onAssign={assign}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete complaint"
        message={`Delete complaint ${confirmDelete?.id} — "${confirmDelete?.title}"? This permanently removes it.`}
      />
    </div>
  );
}

// A contact tile: name + role with click-to-call / click-to-mail links.
function ContactCard({ heading, name, sub, phone, email, tone = "slate", empty }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{heading}</p>
      {name ? (
        <div className="flex items-start gap-3">
          <Avatar name={name} size={38} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{name}</p>
            {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
            <div className="mt-1.5 space-y-1">
              {phone ? (
                <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-brand-600">
                  <Icon name="phone" size={12} /> {phone}
                </a>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-slate-300"><Icon name="phone" size={12} /> No phone on file</p>
              )}
              {email ? (
                <a href={`mailto:${email}`} className="flex items-center gap-1.5 truncate text-xs text-slate-600 hover:text-brand-600">
                  <Icon name="mail" size={12} /> {email}
                </a>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-slate-300"><Icon name="mail" size={12} /> No email on file</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 py-1 text-sm text-slate-400">
          <span className={`grid h-9 w-9 place-items-center rounded-full ${tones[tone]}`}><Icon name="user-x" size={16} /></span>
          {empty ?? "—"}
        </p>
      )}
    </div>
  );
}

// Pick an assignee from committee/staff/vendors (contact auto-attached), or type
// a custom one. Nothing is assigned until the admin confirms.
function AssignModal({ complaint, assignees, busy, onClose, onAssign }) {
  const [pickedName, setPickedName] = useState("");
  const [custom, setCustom] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    if (complaint) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset picker when a new complaint opens
      setPickedName(complaint.assignedTo ?? "");
      setCustom({ name: "", phone: "", email: "" });
    }
  }, [complaint]);

  const grouped = useMemo(() => {
    const g = {};
    for (const a of assignees) (g[a.group] ??= []).push(a);
    return g;
  }, [assignees]);

  const usingCustom = pickedName === "__custom__";
  const chosen = usingCustom
    ? custom
    : assignees.find((a) => a.name === pickedName) ?? (pickedName ? { name: pickedName } : null);

  return (
    <Modal
      open={!!complaint}
      onClose={onClose}
      title={`Assign ${complaint?.id ?? "complaint"}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button icon="user-check" loading={busy} disabled={!chosen?.name?.trim()} onClick={() => onAssign(chosen)}>
            Assign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Assign to">
          <select className={inputClass} value={pickedName} onChange={(e) => setPickedName(e.target.value)}>
            <option value="">— Select an assignee —</option>
            {Object.entries(grouped).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((a, i) => (
                  <option key={`${group}-${i}`} value={a.name}>
                    {a.name}{a.role ? ` · ${a.role}` : ""}{a.phone ? ` · ${a.phone}` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="__custom__">+ Enter someone else…</option>
          </select>
        </Field>

        {usingCustom ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className={inputClass} placeholder="e.g. Maintenance Team" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputClass} placeholder="+91 …" value={custom.phone} onChange={(e) => setCustom({ ...custom, phone: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email">
                <input className={inputClass} placeholder="name@example.com" value={custom.email} onChange={(e) => setCustom({ ...custom, email: e.target.value })} />
              </Field>
            </div>
          </div>
        ) : chosen?.name ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">{chosen.name}</p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><Icon name="phone" size={12} /> {chosen.phone || "No phone on file"}</span>
              <span className="inline-flex items-center gap-1"><Icon name="mail" size={12} /> {chosen.email || "No email on file"}</span>
            </p>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
            Add committee members under Settings, or staff/vendors under Staff, to assign with contact details.
          </p>
        )}
      </div>
    </Modal>
  );
}
