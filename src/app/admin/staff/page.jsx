"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  StatCard,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  Avatar,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { AvatarUpload } from "@/components/AvatarUpload";
import { formatINR, formatDate, validateAccount, validatePhone, digitsOnly } from "@/lib/utils";

const emptyForm = {
  name: "", role: "", phone: "", monthlySalary: "", joinedOn: "", type: "staff", status: "active",
  createLogin: false, email: "", password: "", confirmPassword: "", avatarUrl: "",
};

export default function StaffPage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/admin/staff");
  const staff = normalizeList(raw);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = staff.filter((s) => filter === "all" || s.type === filter);
  const payroll = staff.reduce((s, x) => s + (x.monthlySalary || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      ...emptyForm,
      name: s.name ?? "",
      role: s.role ?? "",
      phone: s.phone ?? "",
      monthlySalary: s.monthlySalary ?? "",
      joinedOn: s.joinedOn ? String(s.joinedOn).slice(0, 10) : "",
      type: s.type ?? "staff",
      status: s.status ?? "active",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.role.trim()) {
      toast("Name and role are required", "error");
      return;
    }
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) {
      toast(phoneErr, "error");
      return;
    }
    if (!editing && form.createLogin) {
      const err = validateAccount({ email: form.email, password: form.password, confirm: form.confirmPassword });
      if (err) { toast(err, "error"); return; }
    }
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      phone: form.phone.trim() || null,
      monthlySalary: Number(form.monthlySalary) || 0,
      joinedOn: form.joinedOn || null,
      type: form.type,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/staff/${editing.dbId}`, payload);
        toast(`${payload.name} updated`);
      } else {
        // 1) Create the staff / vendor record.
        await api.post("/admin/staff", payload);
        // 2) Optionally create a secure gate (security) login.
        if (form.createLogin) {
          await api.post("/admin/users", {
            fullName: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            role: 1, // guard / security
            phoneNumber: form.phone.trim() || null,
            active: true,
            avatarUrl: form.avatarUrl || null,
            extras: { title: form.role.trim() },
          });
        }
        toast(form.createLogin ? `${form.name.trim()} added with security login` : `${form.name.trim()} added`);
      }
      setForm(emptyForm);
      setEditing(null);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not save", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/staff/${confirmDelete.dbId}`);
      toast(`${confirmDelete.name} removed`);
      setConfirmDelete(null);
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
        title="Staff & Vendors"
        subtitle="Manage employees, agencies and monthly payroll"
        actions={<Button icon="user-plus" onClick={openCreate}>Add</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total staff" value={`${staff.filter((s) => s.type === "staff").length}`} icon="users" tone="brand" />
        <StatCard label="Vendors" value={`${staff.filter((s) => s.type === "vendor").length}`} icon="truck" tone="violet" />
        <StatCard label="Monthly payroll" value={formatINR(payroll)} icon="banknote" tone="amber" />
        <StatCard label="On leave" value={`${staff.filter((s) => s.status === "on_leave").length}`} icon="plane" tone="sky" />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: staff.length },
              { value: "staff", label: "Staff", count: staff.filter((s) => s.type === "staff").length },
              { value: "vendor", label: "Vendors", count: staff.filter((s) => s.type === "vendor").length },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Phone</Th>
              <Th>Joined</Th>
              <Th className="text-right">Monthly</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar name={s.name} size={32} />
                    <span className="font-medium text-slate-800">{s.name}</span>
                  </div>
                </Td>
                <Td className="text-slate-600">
                  {s.role}
                  {s.type === "vendor" && (
                    <Badge tone="violet" className="ml-2">
                      Vendor
                    </Badge>
                  )}
                </Td>
                <Td className="text-slate-500">{s.phone}</Td>
                <Td className="text-slate-500">{formatDate(s.joinedOn)}</Td>
                <Td className="text-right font-medium">{formatINR(s.monthlySalary)}</Td>
                <Td>
                  <StatusBadge status={s.status} />
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                      title="Edit"
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(s)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete"
                    >
                      <Icon name="trash-2" size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Add / edit staff / vendor */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit · ${editing.name}` : "Add staff / vendor"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="check" loading={saving} onClick={save}>{editing ? "Save changes" : "Save"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name / agency" />
          </Field>
          <Field label="Role / Designation">
            <input className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Security Guard" />
          </Field>
          <Field label="Type">
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="vendor">Vendor</option>
            </select>
          </Field>
          <Field label="Phone">
            <input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: digitsOnly(e.target.value) })} placeholder="10-digit mobile" />
          </Field>
          <Field label="Monthly salary (₹)">
            <input type="number" className={inputClass} value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} placeholder="18000" />
          </Field>
          <Field label="Joined on">
            <input type="date" className={inputClass} value={form.joinedOn} onChange={(e) => setForm({ ...form, joinedOn: e.target.value })} />
          </Field>
          {editing && (
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          )}
        </div>

        {/* Optional security login (only when adding a new person) */}
        {!editing && (
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={form.createLogin}
                onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
              />
              Create a gate (security) login for this person
            </label>
            {form.createLogin && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">Staff photo</span>
                  <AvatarUpload value={form.avatarUrl} onChange={(url) => setForm({ ...form, avatarUrl: url })} name={form.name} />
                </div>
                <Field label="Login email">
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="guard@greenaeroview.in" />
                </Field>
                <span />
                <Field label="Password">
                  <input type="password" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
                </Field>
                <Field label="Confirm password">
                  <input type="password" className={inputClass} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter password" />
                </Field>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Remove staff / vendor"
        message={`Remove "${confirmDelete?.name}" from the staff register? Any linked login account is not affected.`}
      />
    </div>
  );
}
