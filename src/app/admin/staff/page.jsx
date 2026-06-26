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
import { VendorPerformance } from "./VendorPerformance";

const emptyForm = {
  name: "", role: "", phone: "", monthlySalary: "", joinedOn: "", type: "staff", status: "active",
  createLogin: false, email: "", password: "", confirmPassword: "", avatarUrl: "",
  // vendor profile
  categories: "", licenseNo: "", licenseExpiry: "", insurancePolicy: "", insuranceExpiry: "",
  slaResponseHours: "", rateCard: "",
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
  const [loginInfo, setLoginInfo] = useState(null); // { email, tempPassword } shown once
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
      categories: (s.categories ?? []).join(", "),
      licenseNo: s.licenseNo ?? "",
      licenseExpiry: s.licenseExpiry ? String(s.licenseExpiry).slice(0, 10) : "",
      insurancePolicy: s.insurancePolicy ?? "",
      insuranceExpiry: s.insuranceExpiry ? String(s.insuranceExpiry).slice(0, 10) : "",
      slaResponseHours: s.slaResponseHours ?? "",
      rateCard: s.rateCard ?? "",
    });
    setOpen(true);
  };

  const verifyVendor = async (s) => {
    try {
      await api.post(`/admin/staff/${s.dbId}/verify`, {});
      toast(`${s.name} verified`);
      reload();
    } catch (e) {
      toast(e.message || "Could not verify", "error");
    }
  };

  const togglePreferred = async (s) => {
    try {
      await api.post(`/admin/staff/${s.dbId}/preferred`, {});
      toast(s.preferred ? `${s.name} removed from preferred` : `${s.name} marked preferred`);
      reload();
    } catch (e) {
      toast(e.message || "Could not update", "error");
    }
  };

  // Issue a vendor-portal login; show the one-time temp password.
  const createLogin = async (s) => {
    try {
      const { data } = await api.post(`/admin/staff/${s.dbId}/create-login`, {});
      setLoginInfo({ name: s.name, email: data.email, tempPassword: data.tempPassword });
    } catch (e) {
      toast(e.message || "Could not create login", "error");
    }
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
    if (form.type === "vendor") {
      Object.assign(payload, {
        categories: form.categories ? form.categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
        licenseNo: form.licenseNo.trim() || null,
        licenseExpiry: form.licenseExpiry || null,
        insurancePolicy: form.insurancePolicy.trim() || null,
        insuranceExpiry: form.insuranceExpiry || null,
        slaResponseHours: form.slaResponseHours ? Number(form.slaResponseHours) : null,
        rateCard: form.rateCard.trim() || null,
      });
    }
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
                    <>
                      <Badge tone="violet" className="ml-2">Vendor</Badge>
                      {s.verified ? (
                        <Badge tone="green" className="ml-1">verified</Badge>
                      ) : (
                        <Badge tone="amber" className="ml-1">unverified</Badge>
                      )}
                      {s.preferred && <Badge tone="sky" className="ml-1">preferred</Badge>}
                    </>
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
                    {s.type === "vendor" && !s.verified && (
                      <button
                        onClick={() => verifyVendor(s)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600"
                        title="Verify vendor"
                      >
                        <Icon name="badge-check" size={15} />
                      </button>
                    )}
                    {s.type === "vendor" && (
                      <button
                        onClick={() => togglePreferred(s)}
                        className={
                          "grid h-8 w-8 place-items-center rounded-lg hover:bg-sky-50 " +
                          (s.preferred ? "text-sky-500" : "text-slate-400 hover:text-sky-600")
                        }
                        title={s.preferred ? "Remove from preferred" : "Mark preferred"}
                      >
                        <Icon name="star" size={15} />
                      </button>
                    )}
                    {s.type === "vendor" && (
                      <button
                        onClick={() => createLogin(s)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                        title="Create vendor portal login"
                      >
                        <Icon name="key-round" size={15} />
                      </button>
                    )}
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

        {/* Vendor profile — compliance, categories, SLA, pricing */}
        {form.type === "vendor" && (
          <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-700">Vendor profile</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Service categories" hint="Comma-separated, e.g. plumbing, electrical">
                  <input className={inputClass} value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="plumbing, electrical" />
                </Field>
              </div>
              <Field label="License number"><input className={inputClass} value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} /></Field>
              <Field label="License expiry"><input type="date" className={inputClass} value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} /></Field>
              <Field label="Insurance policy"><input className={inputClass} value={form.insurancePolicy} onChange={(e) => setForm({ ...form, insurancePolicy: e.target.value })} /></Field>
              <Field label="Insurance expiry"><input type="date" className={inputClass} value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} /></Field>
              <Field label="SLA response (hours)"><input type="number" className={inputClass} value={form.slaResponseHours} onChange={(e) => setForm({ ...form, slaResponseHours: e.target.value })} placeholder="e.g. 8" /></Field>
              <Field label="Rate card / pricing"><input className={inputClass} value={form.rateCard} onChange={(e) => setForm({ ...form, rateCard: e.target.value })} placeholder="₹500 visit + parts" /></Field>
            </div>
            {editing && (
              <p className="mt-2 text-xs text-slate-500">Use the <Icon name="badge-check" size={12} className="inline" /> verify action in the list once compliance docs are checked — only verified vendors are eligible for work-order assignment.</p>
            )}
            {editing && <VendorPerformance staffId={editing.dbId} />}
          </div>
        )}

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

      {/* One-time vendor login credentials */}
      <Modal
        open={!!loginInfo}
        onClose={() => setLoginInfo(null)}
        title="Vendor login created"
        footer={<Button onClick={() => setLoginInfo(null)}>Done</Button>}
      >
        <p className="text-sm text-slate-600">
          Share these credentials with <span className="font-medium">{loginInfo?.name}</span>. The
          temporary password is shown <span className="font-medium">only once</span> — they can
          reset it from the login screen.
        </p>
        <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Email</span>
            <span className="font-mono font-medium text-slate-800">{loginInfo?.email}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Temp password</span>
            <span className="font-mono font-medium text-slate-800">{loginInfo?.tempPassword}</span>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Icon name="info" size={12} /> They sign in at the same login page and land on the vendor portal.
        </p>
      </Modal>
    </div>
  );
}
