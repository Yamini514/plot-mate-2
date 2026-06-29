"use client";

import { useState, useEffect } from "react";
import {
  PageHeader, Card, Button, Badge, Modal, Field, EmptyState, inputClass, ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";

// Friendly labels for permission modules (App::Models::Role::MODULES keys).
const MODULE_LABEL = {
  dashboard: "Dashboard", plots: "Plots", owners: "Owners", committee: "Committee",
  vendors: "Vendors", workorders: "Work Orders", complaints: "Complaints",
  maintenance: "Maintenance", payments: "Payments", finance: "Finance",
  projects: "Projects", documents: "Documents", notices: "Notices & Community",
  reports: "Reports", settings: "Settings", support: "Support & Gate", analytics: "Analytics",
};

// key = backend (snake) form sent on save; camel = how the API returns it after
// the client camelizes nested keys, used when seeding from saved settings.
const REQUEST_TYPES = [
  { key: "owner_verification", camel: "ownerVerification", label: "Owner verification" },
  { key: "plot_claim", camel: "plotClaim", label: "Plot claim" },
  { key: "ownership_transfer", camel: "ownershipTransfer", label: "Ownership transfer" },
  { key: "document_verification", camel: "documentVerification", label: "Document verification" },
];

const emptyForm = { name: "", description: "", permissions: [] };

export default function RolesPage() {
  const toast = useToast();
  const { data: raw, meta, reload } = useApi("/admin/roles");
  const roles = normalizeList(raw);
  // module → [actions] grid from the backend catalogue (drives the editor).
  const modules = meta?.modules ?? {};

  const { data: settings, reload: reloadSettings } = useApi("/admin/settings");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [usersFor, setUsersFor] = useState(null); // role whose members are shown
  const { data: roleUsers } = useApi(usersFor ? `/admin/roles/${usersFor.dbId}/users` : null);

  const cloneRole = async (r) => {
    setBusyId(r.dbId);
    try { await api.post(`/admin/roles/${r.dbId}/clone`, {}); toast("Role cloned"); reload(); }
    catch (e) { toast(e.message || "Could not clone", "error"); }
    finally { setBusyId(null); }
  };
  const toggleRole = async (r) => {
    setBusyId(r.dbId);
    try { await api.post(`/admin/roles/${r.dbId}/toggle`, {}); toast(r.active === false ? "Role activated" : "Role deactivated"); reload(); }
    catch (e) { toast(e.message || "Could not update", "error"); }
    finally { setBusyId(null); }
  };
  const toggleModuleAll = (mod, actions) => {
    const keys = actions.map((a) => `${mod}.${a}`);
    const allOn = keys.every((k) => form.permissions.includes(k));
    setForm((f) => ({ ...f, permissions: allOn ? f.permissions.filter((p) => !keys.includes(p)) : [...new Set([...f.permissions, ...keys])] }));
  };

  // Approval matrix (request type → approver role name), seeded from settings.
  const [matrix, setMatrix] = useState({});
  const [savingMatrix, setSavingMatrix] = useState(false);
  useEffect(() => {
    const am = settings?.approvalMatrix ?? {};
    const seeded = {};
    REQUEST_TYPES.forEach((rt) => { seeded[rt.key] = am[rt.camel] ?? am[rt.key] ?? "admin"; });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed from loaded settings
    setMatrix(seeded);
  }, [settings]);

  const approverOptions = ["admin", ...roles.filter((r) => r.active !== false).map((r) => r.name)];

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name ?? "", description: r.description ?? "", permissions: r.permissions ?? [] });
    setOpen(true);
  };
  const togglePerm = (p) =>
    setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }));

  const save = async () => {
    if (!form.name.trim()) return toast("Role name is required", "error");
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null, permissions: form.permissions };
      if (editing) await api.put(`/admin/roles/${editing.dbId}`, payload);
      else await api.post("/admin/roles", payload);
      toast(editing ? "Role updated" : "Role created");
      setOpen(false); setEditing(null); setForm(emptyForm); reload();
    } catch (e) {
      toast(e.message || "Could not save role", "error");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await api.del(`/admin/roles/${confirmDelete.dbId}`);
      toast("Role deleted"); setConfirmDelete(null); reload();
    } catch (e) {
      toast(e.message || "Could not delete", "error");
    }
  };

  const saveMatrix = async () => {
    setSavingMatrix(true);
    try {
      await api.put("/admin/settings", { approvalMatrix: matrix });
      toast("Approval matrix saved");
      reloadSettings();
    } catch (e) {
      toast(e.message || "Could not save", "error");
    } finally { setSavingMatrix(false); }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Roles & Approvals"
        subtitle="Define committee roles and route each approval to the right one"
        actions={<Button icon="plus" onClick={openCreate}>New role</Button>}
      />

      {/* Custom roles */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Committee roles</h2>
        {roles.length === 0 ? (
          <Card><EmptyState icon="shield" title="No custom roles yet" subtitle="Create roles like Treasurer or Maintenance Lead with their own responsibilities." /></Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roles.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button title="View members" onClick={() => setUsersFor(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Icon name="users" size={15} /></button>
                    <button title="Clone" disabled={busyId === r.dbId} onClick={() => cloneRole(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Icon name="copy" size={15} /></button>
                    <button title={r.active === false ? "Activate" : "Deactivate"} disabled={busyId === r.dbId} onClick={() => toggleRole(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Icon name={r.active === false ? "toggle-left" : "toggle-right"} size={15} /></button>
                    <button title="Edit" onClick={() => openEdit(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Icon name="pencil" size={15} /></button>
                    <button title="Delete" onClick={() => setConfirmDelete(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash-2" size={15} /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {r.active === false && <Badge tone="slate">inactive</Badge>}
                  <span>{(r.permissions ?? []).length} permission{(r.permissions ?? []).length === 1 ? "" : "s"}</span>
                  <span>· {r.userCount ?? 0} member{(r.userCount ?? 0) === 1 ? "" : "s"}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Approval matrix */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-slate-700">Approval matrix</h2>
        <p className="mb-3 text-xs text-slate-400">Choose which role reviews each request type. New requests are routed (stamped) to the selected role.</p>
        <Card className="p-5">
          <div className="space-y-3">
            {REQUEST_TYPES.map((rt) => (
              <div key={rt.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">{rt.label}</span>
                <select
                  className={inputClass + " max-w-xs"}
                  value={matrix[rt.key] ?? "admin"}
                  onChange={(e) => setMatrix({ ...matrix, [rt.key]: e.target.value })}
                >
                  {approverOptions.map((o) => (
                    <option key={o} value={o}>{o === "admin" ? "Admin / Committee" : o}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button icon="save" loading={savingMatrix} onClick={saveMatrix}>Save matrix</Button>
          </div>
        </Card>
      </section>

      {/* Role editor */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit · ${editing.name}` : "New role"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="check" loading={saving} onClick={save}>{editing ? "Save changes" : "Create"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Role name"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Treasurer" /></Field>
            <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></Field>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Permissions — pick the actions this role can perform in each module</span>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {Object.entries(modules).map(([mod, actions]) => {
                const keys = actions.map((a) => `${mod}.${a}`);
                const allOn = keys.every((k) => form.permissions.includes(k));
                const someOn = keys.some((k) => form.permissions.includes(k));
                return (
                  <div key={mod} className="rounded-lg p-2 hover:bg-slate-50">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium capitalize text-slate-700">{MODULE_LABEL[mod] ?? mod}</span>
                      <button type="button" onClick={() => toggleModuleAll(mod, actions)}
                        className={"text-xs font-medium " + (allOn ? "text-rose-500" : "text-brand-600")}>
                        {allOn ? "Clear" : someOn ? "Select all" : "Select all"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {actions.map((a) => {
                        const k = `${mod}.${a}`;
                        const on = form.permissions.includes(k);
                        return (
                          <button key={k} type="button" onClick={() => togglePerm(k)}
                            className={"rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition-colors " + (on ? "bg-brand-50 text-brand-700 ring-brand-300" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50")}>
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        title="Delete role"
        message={`Delete the "${confirmDelete?.name}" role? Any approval routing using it falls back to Admin.`}
      />

      <Modal open={!!usersFor} onClose={() => setUsersFor(null)} title={`Members · ${usersFor?.name ?? ""}`}
        footer={<Button onClick={() => setUsersFor(null)}>Done</Button>}>
        {normalizeList(roleUsers).length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No members assigned to this role yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {normalizeList(roleUsers).map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <div><p className="text-sm font-medium text-slate-800">{u.fullName}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                <Badge tone={u.active ? "green" : "slate"}>{u.active ? "active" : "inactive"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
