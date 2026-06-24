"use client";

import { useState, useEffect } from "react";
import {
  PageHeader, Card, Button, Tabs, Field, inputClass, Badge,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";

const TABS = [
  { value: "email", label: "Email" },
  { value: "notifications", label: "Notifications" },
  { value: "onboarding", label: "Document Requirements" },
  { value: "defaults", label: "Defaults" },
  { value: "platform", label: "Platform" },
];

export default function PlatformSettingsPage() {
  const toast = useToast();
  const { data, loading, reload } = useApi("/super/settings");
  const [tab, setTab] = useState("email");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");

  // Seed the editable copy once the fetched config arrives (and on reload).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing editable form from fetched data
  useEffect(() => { if (data) setForm(structuredClone(data)); }, [data]);

  const patch = (section, key, value) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/super/settings", { settings: form });
      toast("Settings saved");
      reload();
    } catch (e) {
      toast(e.message || "Could not save settings", "error");
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return toast("Enter a recipient email", "error");
    try {
      await api.post("/super/settings/test-email", { to: testTo.trim() });
      toast("Test email sent");
    } catch (e) {
      toast(e.message || "Could not send test email", "error");
    }
  };

  // --- document requirements editor ---
  const docs = form?.onboarding?.requiredDocuments ?? [];
  const setDocs = (next) =>
    setForm((f) => ({ ...f, onboarding: { ...f.onboarding, requiredDocuments: next } }));
  const addDoc = () =>
    setDocs([...docs, { docType: "other", label: "", required: false }]);
  const updateDoc = (i, key, value) =>
    setDocs(docs.map((d, idx) => (idx === i ? { ...d, [key]: value } : d)));
  const removeDoc = (i) => setDocs(docs.filter((_, idx) => idx !== i));

  if (loading || !form) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Global settings" subtitle="Platform-wide configuration" />
        <Card className="p-10 text-center text-slate-400">
          <Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading settings…
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Global settings"
        subtitle="Platform-wide configuration"
        actions={<Button icon="check" loading={saving} onClick={save}>Save changes</Button>}
      />

      <div className="mb-4"><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>

      <Card className="p-5">
        {tab === "email" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="SMTP host"><input className={inputClass} value={form.email.smtpHost ?? ""} onChange={(e) => patch("email", "smtpHost", e.target.value)} /></Field>
            <Field label="SMTP port"><input type="number" className={inputClass} value={form.email.smtpPort ?? ""} onChange={(e) => patch("email", "smtpPort", Number(e.target.value))} /></Field>
            <Field label="From name"><input className={inputClass} value={form.email.fromName ?? ""} onChange={(e) => patch("email", "fromName", e.target.value)} /></Field>
            <Field label="From email"><input type="email" className={inputClass} value={form.email.fromEmail ?? ""} onChange={(e) => patch("email", "fromEmail", e.target.value)} /></Field>
            <div className="sm:col-span-2 mt-2 flex items-end gap-2 border-t border-slate-100 pt-4">
              <Field label="Send a test email to"><input type="email" className={inputClass} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" /></Field>
              <Button variant="secondary" icon="send" onClick={sendTest}>Send test</Button>
            </div>
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-3">
            {[
              ["approvalEmail", "Email the requester when a venture is approved"],
              ["rejectionEmail", "Email the requester when a venture is rejected"],
              ["weeklyDigest", "Send the super admin a weekly platform digest"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={!!form.notifications[key]} onChange={(e) => patch("notifications", key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        )}

        {tab === "onboarding" && (
          <div>
            <p className="mb-3 text-sm text-slate-500">Documents a prospective venture must provide. Drives the review checklist.</p>
            <div className="space-y-2">
              {docs.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <input className={`${inputClass} w-40`} value={d.docType ?? ""} onChange={(e) => updateDoc(i, "docType", e.target.value)} placeholder="doc_type" />
                  <input className={`${inputClass} flex-1`} value={d.label ?? ""} onChange={(e) => updateDoc(i, "label", e.target.value)} placeholder="Label shown to venture" />
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" checked={!!d.required} onChange={(e) => updateDoc(i, "required", e.target.checked)} /> required
                  </label>
                  <button onClick={() => removeDoc(i)} className="text-slate-400 hover:text-rose-500"><Icon name="trash-2" size={16} /></button>
                </div>
              ))}
            </div>
            <Button variant="secondary" icon="plus" className="mt-3" onClick={addDoc}>Add document</Button>
            <div className="mt-4">
              <Field label="Request code prefix"><input className={`${inputClass} w-40`} value={form.onboarding.autoCodePrefix ?? ""} onChange={(e) => patch("onboarding", "autoCodePrefix", e.target.value)} /></Field>
            </div>
          </div>
        )}

        {tab === "defaults" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Currency"><input className={inputClass} value={form.defaults.currency ?? ""} onChange={(e) => patch("defaults", "currency", e.target.value)} /></Field>
            <Field label="Timezone"><input className={inputClass} value={form.defaults.timezone ?? ""} onChange={(e) => patch("defaults", "timezone", e.target.value)} /></Field>
            <Field label="Plot status palette"><input className={inputClass} value={form.defaults.plotStatusPalette ?? ""} onChange={(e) => patch("defaults", "plotStatusPalette", e.target.value)} /></Field>
          </div>
        )}

        {tab === "platform" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Support email"><input type="email" className={inputClass} value={form.platform.supportEmail ?? ""} onChange={(e) => patch("platform", "supportEmail", e.target.value)} /></Field>
            <Field label="Terms URL"><input className={inputClass} value={form.platform.termsUrl ?? ""} onChange={(e) => patch("platform", "termsUrl", e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={!!form.platform.maintenanceMode} onChange={(e) => patch("platform", "maintenanceMode", e.target.checked)} />
                Maintenance mode {form.platform.maintenanceMode && <Badge tone="rose">on</Badge>}
              </label>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
