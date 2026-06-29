"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, CardHeader, Button, Badge, Field, inputClass, PasswordInput, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { AvatarUpload } from "@/components/AvatarUpload";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { uploadDocument } from "@/lib/upload";
import { password as validatePassword, phone as vphone } from "@/lib/validate";
import { formatDate } from "@/lib/utils";

const DOC_TYPES = [
  { value: "license", label: "License" },
  { value: "insurance", label: "Insurance" },
  { value: "certification", label: "Certification" },
  { value: "other", label: "Other" },
];

export default function VendorProfilePage() {
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const { data: me, reload: reloadMe } = useApi("/me/info");
  const { data: docsRaw, reload: reloadDocs } = useApi("/vendor/documents");
  const docs = normalizeList(docsRaw);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [up, setUp] = useState({ open: false, name: "", docType: "license", expiry: "", file: null });
  const [busyDoc, setBusyDoc] = useState(false);

  useEffect(() => {
    if (!me || form) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed once
    setForm({ fullName: me.fullName ?? "", phoneNumber: me.phoneNumber ?? "", company: me.company ?? "", emergencyContact: me.emergencyContact ?? "" });
  }, [me, form]);

  const save = async () => {
    if (form.phoneNumber) { const e = vphone(form.phoneNumber); if (e) return toast(e, "error"); }
    setSaving(true);
    try {
      await api.put("/me/profile", form);
      updateUser({ name: form.fullName });
      toast("Profile saved"); reloadMe();
    } catch (e) { toast(e.message || "Could not save", "error"); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pw.current) return toast("Enter your current password", "error");
    const err = validatePassword(pw.next);
    if (err) return toast(err, "error");
    if (pw.next !== pw.confirm) return toast("Passwords don't match", "error");
    setSavingPw(true);
    try { await api.put("/me/update-password", { currentPassword: pw.current, newPassword: pw.next }); setPw({ current: "", next: "", confirm: "" }); toast("Password updated"); }
    catch (e) { toast(e.message || "Could not update password", "error"); }
    finally { setSavingPw(false); }
  };

  const uploadDoc = async () => {
    if (!up.name.trim() || !up.file) return toast("Add a name and file", "error");
    setBusyDoc(true);
    try {
      const { url } = await uploadDocument(up.file);
      await api.post("/vendor/documents", { name: up.name.trim(), url, docType: up.docType, expiryDate: up.expiry || null, category: "Compliance" });
      toast("Document uploaded — pending verification");
      setUp({ open: false, name: "", docType: "license", expiry: "", file: null });
      reloadDocs();
    } catch (e) { toast(e.message || "Could not upload", "error"); }
    finally { setBusyDoc(false); }
  };

  const renew = async (d, file) => {
    if (!file) return;
    setBusyDoc(true);
    try { const { url } = await uploadDocument(file); await api.post(`/vendor/documents/${d.dbId}/versions`, { name: file.name, url, size: file.size }); toast("New version uploaded — pending verification"); reloadDocs(); }
    catch (e) { toast(e.message || "Could not renew", "error"); }
    finally { setBusyDoc(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="My Profile" subtitle="Your service-partner account, company details and compliance documents" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Company & contact" icon="hard-hat" />
            <div className="p-5">
              <AvatarUpload value={me?.avatarUrl ?? user?.avatarUrl} name={form?.fullName} label="logo"
                onChange={async (url) => { try { await api.put("/me/profile", { avatarUrl: url }); updateUser({ avatarUrl: url }); reloadMe(); toast("Logo updated"); } catch (e) { toast(e.message, "error"); } }} />
              {form && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Name / agency"><input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
                  <Field label="Phone"><input className={inputClass} maxLength={10} value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "") })} /></Field>
                  <Field label="Company details"><input className={inputClass} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="GST / company name" /></Field>
                  <Field label="Emergency contact"><input className={inputClass} value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Name & phone" /></Field>
                  <div className="sm:col-span-2 flex justify-end"><Button icon="save" loading={saving} onClick={save}>Save</Button></div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Change password" subtitle="Keep your account secure" icon="shield-check" />
            <div className="space-y-3 p-5">
              <Field label="Current password"><PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
              <Field label="New password" hint="8+ chars with upper, lower, number & special character"><PasswordInput value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
              <Field label="Confirm new password"><PasswordInput value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
              <div className="flex justify-end"><Button icon="key-round" loading={savingPw} onClick={changePassword}>Update password</Button></div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Compliance documents" subtitle="License, insurance & certifications" icon="folder"
            action={<Button size="sm" icon="upload" onClick={() => setUp({ ...up, open: true })}>Upload</Button>} />
          <div className="p-5">
            {docs.length === 0 ? (
              <EmptyState icon="folder" title="No documents" subtitle="Upload your license and insurance for verification." />
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li key={d.dbId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0">
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-slate-800 hover:text-brand-700"><Icon name="file" size={14} /> {d.name}</a>
                      <p className="text-xs text-slate-400">{d.docType}{d.expiryDate ? ` · expires ${formatDate(d.expiryDate)}` : ""}{d.version > 1 ? ` · v${d.version}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.expiryState === "expired" && <Badge tone="rose">expired</Badge>}
                      {d.expiryState === "expiring" && <Badge tone="amber">expiring</Badge>}
                      <Badge tone={d.approved ? "green" : "slate"}>{d.approved ? "verified" : "pending"}</Badge>
                      <label className="cursor-pointer text-xs font-medium text-brand-600 hover:underline">
                        Renew
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden disabled={busyDoc} onChange={(e) => renew(d, e.target.files?.[0])} />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {up.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => setUp({ ...up, open: false })}>
          <Card className="w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Upload compliance document</h3>
            <div className="space-y-3">
              <Field label="Name"><input className={inputClass} value={up.name} onChange={(e) => setUp({ ...up, name: e.target.value })} placeholder="e.g. Trade license 2026" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type"><select className={inputClass} value={up.docType} onChange={(e) => setUp({ ...up, docType: e.target.value })}>{DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
                <Field label="Expiry (optional)"><input type="date" className={inputClass} value={up.expiry} onChange={(e) => setUp({ ...up, expiry: e.target.value })} /></Field>
              </div>
              <Field label="File"><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setUp({ ...up, file: e.target.files?.[0] })} /></Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setUp({ ...up, open: false })}>Cancel</Button>
              <Button icon="upload" loading={busyDoc} onClick={uploadDoc}>Upload</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
