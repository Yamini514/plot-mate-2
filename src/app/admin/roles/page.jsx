"use client";

import { useState, useEffect } from "react";
import {
  PageHeader, Card, Button, Badge, Modal, Field, EmptyState, inputClass, ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";

// Friendly labels for permission keys (App::Models::Role::PERMISSIONS).
const PERM_LABEL = {
  "billing.manage": "Billing & invoices",
  "treasury.manage": "Treasury",
  "approvals.review": "Review approvals",
  "documents.manage": "Documents",
  "tickets.manage": "Helpdesk tickets",
  "maintenance.manage": "Maintenance",
  "projects.manage": "Projects",
  "announcements.publish": "Announcements",
  "members.manage": "Members & owners",
  "staff.manage": "Staff & vendors",
  "settings.manage": "Settings",
  "security.manage": "Security & gate",
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
  const catalogue = meta?.catalogue ?? Object.keys(PERM_LABEL);

  const { data: settings, reload: reloadSettings } = useApi("/admin/settings");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
                    <button onClick={() => openEdit(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><Icon name="pencil" size={15} /></button>
                    <button onClick={() => setConfirmDelete(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash-2" size={15} /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(r.permissions ?? []).length === 0 && <span className="text-xs text-slate-400">No permissions set</span>}
                  {(r.permissions ?? []).map((p) => (
                    <Badge key={p} tone="slate">{PERM_LABEL[p] ?? p}</Badge>
                  ))}
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
            <span className="mb-1.5 block text-xs font-medium text-slate-600">Responsibilities</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {catalogue.map((p) => {
                const on = form.permissions.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePerm(p)}
                    className={"flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ring-1 ring-inset transition-colors " + (on ? "bg-brand-50 text-brand-700 ring-brand-300" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}
                  >
                    <Icon name={on ? "check-square" : "square"} size={15} className={on ? "text-brand-600" : "text-slate-400"} />
                    {PERM_LABEL[p] ?? p}
                  </button>
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
    </div>
  );
}
