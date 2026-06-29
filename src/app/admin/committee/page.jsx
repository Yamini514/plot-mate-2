"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Table, Th, Td, Tr, Modal, Field, inputClass, EmptyState,
} from "@/components/ui";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { usePermissions } from "@/lib/usePermissions";
import { formatDate } from "@/lib/utils";
import { text as vtext, email as vemail, phone as vphone, collect, hasErrors } from "@/lib/validate";

const EMPTY = { fullName: "", email: "", phoneNumber: "", roleId: "" };

export default function CommitteePage() {
  const toast = useToast();
  const { can } = usePermissions();
  const canCreate = can("committee.create");
  const canAssign = can("committee.assign");
  const canEdit = can("committee.edit");

  const { data: raw, reload } = useApi("/admin/committee");
  const members = normalizeList(raw);
  const { data: rolesRaw } = useApi("/admin/roles");
  const roles = normalizeList(rolesRaw).filter((r) => r.active !== false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState(null);
  const [assignFor, setAssignFor] = useState(null);
  const [assignRoleId, setAssignRoleId] = useState("");
  const [historyFor, setHistoryFor] = useState(null);
  const { data: history } = useApi(historyFor ? `/admin/committee/${historyFor.dbId}/login-history` : null);

  const create = async () => {
    const errs = collect({
      fullName: vtext(form.fullName, { min: 2, max: 120, label: "Name" }),
      email: vemail(form.email),
      phoneNumber: vphone(form.phoneNumber),
      roleId: form.roleId ? "" : "Pick a role",
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/committee", { ...form, roleId: Number(form.roleId) });
      setCreds({ email: form.email, tempPassword: data?.tempPassword });
      setForm(EMPTY); setOpen(false); reload();
    } catch (e) { toast(e.message || "Could not create", "error"); }
    finally { setBusy(false); }
  };

  const run = async (id, fn, label) => {
    setBusy(true);
    try { await fn(); toast(label); reload(); }
    catch (e) { toast(e.message || "Action failed", "error"); }
    finally { setBusy(false); }
  };

  const resetPw = async (m) => {
    setBusy(true);
    try { const { data } = await api.post(`/admin/committee/${m.dbId}/reset-password`, {}); setCreds({ email: m.email, tempPassword: data?.tempPassword }); }
    catch (e) { toast(e.message || "Could not reset", "error"); }
    finally { setBusy(false); }
  };

  const assign = async () => {
    if (!assignRoleId) return toast("Pick a role", "error");
    await run(assignFor.dbId, () => api.post(`/admin/committee/${assignFor.dbId}/assign-role`, { roleId: Number(assignRoleId) }), "Role updated");
    setAssignFor(null); setAssignRoleId("");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Committee & Staff" subtitle="Members who log in to the Venture Admin, gated by their role"
        actions={canCreate ? <Button icon="user-plus" onClick={() => { setForm(EMPTY); setErrors({}); setOpen(true); }}>Add member</Button> : null} />

      <Card>
        {members.length === 0 ? (
          <EmptyState icon="users" title="No committee members" subtitle="Add a member and assign their role." />
        ) : (
          <Table>
            <thead><tr><Th>Member</Th><Th>Role</Th><Th>Status</Th><Th>Last login</Th><Th></Th></tr></thead>
            <tbody>
              {members.map((m) => (
                <Tr key={m.dbId}>
                  <Td><p className="font-medium text-slate-800">{m.fullName}</p><p className="text-xs text-slate-400">{m.email}</p></Td>
                  <Td>{m.unrestricted ? <Badge tone="brand">Full access</Badge> : <span className="text-slate-600">{m.roleNameLabel}</span>}</Td>
                  <Td>
                    <Badge tone={m.locked ? "rose" : m.active ? "green" : "slate"}>{m.locked ? "locked" : m.active ? "active" : "inactive"}</Badge>
                  </Td>
                  <Td className="text-slate-500">
                    <button className="hover:text-brand-600 hover:underline" onClick={() => setHistoryFor(m)}>{m.lastLoggedInAt ? formatDate(m.lastLoggedInAt) : "never"}</button>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1.5">
                      {!m.unrestricted && canAssign && <Button size="sm" variant="secondary" icon="shield" onClick={() => { setAssignFor(m); setAssignRoleId(String(m.roleId || "")); }}>Role</Button>}
                      {canEdit && <Button size="sm" variant="secondary" icon="key-round" loading={busy} onClick={() => resetPw(m)}>Reset</Button>}
                      {!m.unrestricted && canEdit && (
                        m.locked
                          ? <Button size="sm" icon="lock-open" onClick={() => run(m.dbId, () => api.post(`/admin/committee/${m.dbId}/unlock`, {}), "Unlocked")}>Unlock</Button>
                          : <Button size="sm" variant="ghost" icon="lock" onClick={() => run(m.dbId, () => api.post(`/admin/committee/${m.dbId}/lock`, { reason: "Locked by admin" }), "Locked")}>Lock</Button>
                      )}
                      {!m.unrestricted && canEdit && (
                        m.active
                          ? <Button size="sm" variant="ghost" icon="user-x" onClick={() => run(m.dbId, () => api.post(`/admin/committee/${m.dbId}/deactivate`, { reason: "Deactivated by admin" }), "Deactivated")}>Disable</Button>
                          : <Button size="sm" icon="user-check" onClick={() => run(m.dbId, () => api.post(`/admin/committee/${m.dbId}/activate`, {}), "Activated")}>Enable</Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add committee member"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button icon="check" loading={busy} onClick={create}>Create</Button></>}>
        <div className="space-y-3">
          <Field label="Full name" required error={errors.fullName}><input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" required error={errors.email}><input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone" required error={errors.phoneNumber}><input className={inputClass} maxLength={10} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })} /></Field>
          </div>
          <Field label="Role" required error={errors.roleId}>
            <select className={inputClass} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Select a role</option>
              {roles.map((r) => <option key={r.dbId} value={r.dbId}>{r.name}</option>)}
            </select>
          </Field>
          {roles.length === 0 && <p className="text-xs text-amber-600">Create a role first under Roles &amp; Approvals.</p>}
        </div>
      </Modal>

      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title={`Change role · ${assignFor?.fullName ?? ""}`}
        footer={<><Button variant="secondary" onClick={() => setAssignFor(null)}>Cancel</Button><Button icon="check" loading={busy} onClick={assign}>Save</Button></>}>
        <Field label="Role">
          <select className={inputClass} value={assignRoleId} onChange={(e) => setAssignRoleId(e.target.value)}>
            <option value="">Select a role</option>
            {roles.map((r) => <option key={r.dbId} value={r.dbId}>{r.name}</option>)}
          </select>
        </Field>
      </Modal>

      <Modal open={!!historyFor} onClose={() => setHistoryFor(null)} title={`Login history · ${historyFor?.fullName ?? ""}`}
        footer={<Button onClick={() => setHistoryFor(null)}>Done</Button>}>
        {normalizeList(history).length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No login history recorded.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {normalizeList(history).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-700">{formatDate(h.createdAt)}</span>
                <span className="font-mono text-xs text-slate-400">{h.ip || "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={!!creds} onClose={() => setCreds(null)} title="Temporary password"
        footer={<Button icon="check" onClick={() => setCreds(null)}>Done</Button>}>
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-400">Email</span><span className="text-slate-800">{creds?.email}</span></div>
          <div className="flex justify-between gap-3"><span className="text-slate-400">Temp password</span><span className="font-semibold text-slate-800">{creds?.tempPassword}</span></div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Share securely. They can change it after signing in.</p>
      </Modal>
    </div>
  );
}
