"use client";

import { useState, useEffect, useRef } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  Field,
  inputClass,
  PasswordInput,
  Avatar,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PaymentQr } from "@/components/PaymentQr";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { buildUpiUri } from "@/lib/payments";

// Indian financial year (Apr 1 – Mar 31), e.g. "2026–27".
function currentFY() {
  const d = new Date();
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}–${String(start + 1).slice(2)}`;
}

const tabs = [
  { id: "association", label: "Association", icon: "building" },
  { id: "fees", label: "Fees & Dues", icon: "indian-rupee" },
  { id: "committee", label: "Committee", icon: "users" },
  { id: "bank", label: "Bank & UPI", icon: "landmark" },
  { id: "email", label: "Email / SMTP", icon: "mail-check" },
  { id: "helplines", label: "Helplines", icon: "phone-call" },
  { id: "notifications", label: "Notifications", icon: "bell" },
];

// One-click SMTP presets for common providers. "custom" leaves fields untouched.
const SMTP_PRESETS = {
  custom:    { label: "Custom / Other" },
  gmail:     { label: "Gmail / Google Workspace", host: "smtp.gmail.com",        port: 587, security: "starttls", note: "Use an App Password (not your login password) with 2-step verification on." },
  office365: { label: "Outlook / Microsoft 365",  host: "smtp.office365.com",    port: 587, security: "starttls", note: "Username is your full email address." },
  sendgrid:  { label: "SendGrid",                 host: "smtp.sendgrid.net",     port: 587, security: "starttls", username: "apikey", note: "Username is literally \"apikey\"; password is your API key." },
  ses:       { label: "Amazon SES",               host: "email-smtp.ap-south-1.amazonaws.com", port: 587, security: "starttls", note: "Use your SES SMTP credentials (not your AWS keys)." },
  mailgun:   { label: "Mailgun",                  host: "smtp.mailgun.org",      port: 587, security: "starttls" },
  zoho:      { label: "Zoho Mail",                host: "smtp.zoho.in",          port: 465, security: "ssl" },
  brevo:     { label: "Brevo (Sendinblue)",       host: "smtp-relay.brevo.com",  port: 587, security: "starttls" },
  mailtrap:  { label: "Mailtrap (sandbox / test)", host: "sandbox.smtp.mailtrap.io", port: 2525, security: "starttls", sandbox: true, note: "Free sandbox for testing: create an inbox at mailtrap.io → SMTP Settings, paste the username & password here. Emails are captured in Mailtrap (not delivered to real owners)." },
  mailpit:   { label: "Local catcher (Mailpit / MailHog)", host: "localhost", port: 1025, security: "none", sandbox: true, note: "Run a local SMTP catcher (e.g. Mailpit) — no username/password needed. Every email is captured at http://localhost:8025." },
};

const SECURITY_OPTIONS = [
  { value: "starttls", label: "STARTTLS (587)" },
  { value: "ssl", label: "SSL / TLS (465)" },
  { value: "none", label: "None (no encryption)" },
];

const initialChannels = [
  { label: "WhatsApp reminders", desc: "Send dues reminders via WhatsApp", on: true },
  { label: "SMS alerts", desc: "Critical alerts over SMS", on: true },
  { label: "Email digests", desc: "Weekly treasury summary by email", on: false },
  { label: "Payment confirmations", desc: "Auto-notify on payment received", on: true },
];

// Blank starter rows — role labels are suggestions; the admin fills in real names.
const DEFAULT_COMMITTEE = [
  { role: "Honorary Secretary", name: "", phone: "" },
  { role: "President", name: "", phone: "" },
  { role: "Treasurer", name: "", phone: "" },
];

// Accept an array (current) or a legacy {secretary:{name,phone}} / {secretary:"name"} object.
function toCommitteeArray(committee, fallback) {
  if (Array.isArray(committee)) {
    return committee.map((m) => ({ role: m.role ?? "", name: m.name ?? "", phone: m.phone ?? "" }));
  }
  if (committee && typeof committee === "object" && Object.keys(committee).length) {
    const label = { secretary: "Honorary Secretary", president: "President", treasurer: "Treasurer" };
    return Object.entries(committee).map(([k, v]) => ({
      role: label[k] ?? k.charAt(0).toUpperCase() + k.slice(1),
      name: typeof v === "object" ? v?.name ?? "" : v ?? "",
      phone: typeof v === "object" ? v?.phone ?? "" : "",
    }));
  }
  return fallback;
}

export default function SettingsPage() {
  const toast = useToast();
  const { data: live } = useApi("/admin/settings");
  const [tab, setTab] = useState("association");
  const [channels, setChannels] = useState(initialChannels);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (live && !form) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form from fetched settings once
      setForm({
        name: live.name ?? "",
        type: live.type ?? "Plot Owners' Welfare Association",
        registrationNo: live.registrationNo ?? "",
        location: live.location ?? "",
        totalPlots: live.totalPlots ?? "",
        fy: live.fy ?? currentFY(),
        basePayMode: live.basePayMode ?? "per_sqyd",
        ratePerSqyd: live.ratePerSqyd ?? "",
        basePayFlat: live.basePayFlat ?? "",
        membershipFee: live.membershipFee ?? "",
        latePenaltyPct: live.latePenaltyPct ?? "",
        dueDate: live.dueDate ?? "",
        accountName: live.bank?.accountName ?? "",
        accountNo: live.bank?.accountNo ?? "",
        ifsc: live.bank?.ifsc ?? "",
        bankBranch: live.bank?.bank ?? "",
        upi: live.bank?.upi ?? "",
        qrPayeeName: live.bank?.qrPayeeName ?? "",
        qrNote: live.bank?.qrNote ?? "",
        qrImageUrl: live.bank?.qrImageUrl ?? "",
        committee: toCommitteeArray(live.committee, DEFAULT_COMMITTEE),
        helplines: Array.isArray(live.helplines) ? live.helplines : [],
        // SMTP — password is never sent back; we only know whether one is set.
        smtpEnabled: live.smtp?.enabled ?? false,
        smtpHost: live.smtp?.host ?? "",
        smtpPort: live.smtp?.port ?? "",
        smtpSecurity: live.smtp?.security ?? "starttls",
        smtpUsername: live.smtp?.username ?? "",
        smtpPassword: "",
        smtpPasswordSet: live.smtp?.passwordSet ?? false,
        smtpFromName: live.smtp?.fromName ?? "",
        smtpFromEmail: live.smtp?.fromEmail ?? "",
      });
    }
  }, [live, form]);

  const f = form ?? {};
  const set = (k, v) => setForm((p) => ({ ...(p ?? {}), [k]: v }));
  const qrFileRef = useRef(null);

  // Read an uploaded QR image into a data URL we can persist in settings.
  const onPickQr = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Please choose an image file (PNG/JPG)", "error"); return; }
    if (file.size > 500 * 1024) { toast("QR image must be under 500 KB — crop it to just the code", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => set("qrImageUrl", String(reader.result));
    reader.onerror = () => toast("Couldn't read that image", "error");
    reader.readAsDataURL(file);
  };

  // --- SMTP / email config ---
  const [provider, setProvider] = useState("custom");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);

  const smtpPayload = () => ({
    enabled: !!f.smtpEnabled,
    host: (f.smtpHost || "").trim(),
    port: Number(f.smtpPort) || 0,
    security: f.smtpSecurity || "starttls",
    username: (f.smtpUsername || "").trim(),
    password: f.smtpPassword || "",
    fromName: (f.smtpFromName || "").trim(),
    fromEmail: (f.smtpFromEmail || "").trim(),
  });

  const applyPreset = (key) => {
    setProvider(key);
    const p = SMTP_PRESETS[key];
    if (!p || key === "custom") return;
    setForm((prev) => ({
      ...prev,
      smtpHost: p.host ?? prev.smtpHost,
      smtpPort: p.port ?? prev.smtpPort,
      smtpSecurity: p.security ?? prev.smtpSecurity,
      smtpUsername: p.username ?? prev.smtpUsername,
    }));
  };

  const sendTest = async () => {
    setTesting(true);
    setPreview(null);
    try {
      const { data } = await api.post("/admin/settings/test-email", { to: testTo || undefined, smtp: smtpPayload() });
      toast(data?.message || "Test email sent", "success");
    } catch (e) {
      toast(e.message || "Could not send test email", "error");
    } finally {
      setTesting(false);
    }
  };

  // Render the email without sending (zero setup) — proves the pipeline works.
  const previewEmail = async () => {
    setPreviewing(true);
    setPreview(null);
    try {
      const { data } = await api.post("/admin/settings/test-email", {
        to: testTo || undefined,
        smtp: { ...smtpPayload(), security: "preview" },
      });
      if (data?.preview) {
        setPreview(data.preview);
        toast("Preview generated — not actually sent", "success");
      } else {
        toast(data?.message || "Preview generated", "success");
      }
    } catch (e) {
      toast(e.message || "Could not generate preview", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const smtpConfigured = !!((f.smtpHost || "").trim() && (f.smtpUsername || "").trim() && (f.smtpPasswordSet || f.smtpPassword));
  const committee = f.committee ?? [];
  const addMember = () => setForm((p) => ({ ...p, committee: [...(p.committee ?? []), { role: "", name: "", phone: "" }] }));
  const updateMember = (i, key, val) => setForm((p) => ({ ...p, committee: (p.committee ?? []).map((m, idx) => (idx === i ? { ...m, [key]: val } : m)) }));
  const removeMember = (i) => setForm((p) => ({ ...p, committee: (p.committee ?? []).filter((_, idx) => idx !== i) }));

  const helplines = f.helplines ?? [];
  const addHelpline = () => setForm((p) => ({ ...p, helplines: [...(p.helplines ?? []), { label: "", phone: "", icon: "phone-call" }] }));
  const updateHelpline = (i, key, val) => setForm((p) => ({ ...p, helplines: (p.helplines ?? []).map((h, idx) => (idx === i ? { ...h, [key]: val } : h)) }));
  const removeHelpline = (i) => setForm((p) => ({ ...p, helplines: (p.helplines ?? []).filter((_, idx) => idx !== i) }));

  const toggle = (i) =>
    setChannels((prev) => prev.map((c, idx) => (idx === i ? { ...c, on: !c.on } : c)));

  const save = async () => {
    try {
      await api.put("/admin/settings", {
        name: f.name, type: f.type, registrationNo: f.registrationNo, location: f.location,
        totalPlots: Number(f.totalPlots) || 0,
        fy: f.fy,
        basePayMode: f.basePayMode === "per_plot" ? "per_plot" : "per_sqyd",
        ratePerSqyd: Number(f.ratePerSqyd) || 0,
        basePayFlat: Number(f.basePayFlat) || 0,
        membershipFee: Number(f.membershipFee) || 0,
        latePenaltyPct: Number(f.latePenaltyPct) || 0,
        dueDate: f.dueDate || "",
        bank: {
          accountName: f.accountName, accountNo: f.accountNo, ifsc: f.ifsc, bank: f.bankBranch, upi: f.upi,
          qrPayeeName: f.qrPayeeName, qrNote: f.qrNote, qrImageUrl: f.qrImageUrl,
        },
        committee: committee.filter((m) => (m.name || "").trim() || (m.role || "").trim()),
        helplines: helplines.filter((h) => (h.label || "").trim() || (h.phone || "").trim()),
        smtp: {
          enabled: !!f.smtpEnabled,
          host: (f.smtpHost || "").trim(),
          port: Number(f.smtpPort) || 0,
          security: f.smtpSecurity || "starttls",
          username: (f.smtpUsername || "").trim(),
          // Blank password = keep the stored one (backend preserves it).
          password: f.smtpPassword || "",
          fromName: (f.smtpFromName || "").trim(),
          fromEmail: (f.smtpFromEmail || "").trim(),
        },
      });
      // Clear the password field after save; the stored one is now set.
      setForm((p) => ({ ...p, smtpPassword: "", smtpPasswordSet: p.smtpPasswordSet || !!p.smtpPassword }));
      toast("Settings saved");
    } catch (e) {
      toast(e.message || "Could not save settings", "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Configure your association"
        actions={<Button icon="save" onClick={save}>Save changes</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tabs */}
        <Card className="h-fit p-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </Card>

        {/* Panels */}
        <div className="space-y-6">
          {tab === "association" && (
            <Card>
              <CardHeader title="Association profile" icon="building" />
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field label="Name">
                  <input className={inputClass} value={f.name ?? ""} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Type">
                  <input className={inputClass} value={f.type ?? ""} onChange={(e) => set("type", e.target.value)} />
                </Field>
                <Field label="Registration number">
                  <input className={inputClass} value={f.registrationNo ?? ""} onChange={(e) => set("registrationNo", e.target.value)} />
                </Field>
                <Field label="Total plots">
                  <input type="number" className={inputClass} value={f.totalPlots ?? ""} onChange={(e) => set("totalPlots", e.target.value)} />
                </Field>
                <Field label="Financial year">
                  <input className={inputClass} value={f.fy ?? ""} onChange={(e) => set("fy", e.target.value)} placeholder="2026–27" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <input className={inputClass} value={f.location ?? ""} onChange={(e) => set("location", e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>
          )}

          {tab === "fees" && (
            <Card>
              <CardHeader title="Base pay & maintenance" subtitle="How each plot's base maintenance due is calculated — used by Plot Owners → Apply base pay" icon="indian-rupee" />
              <div className="p-5">
                {/* Base-pay mode — drives the per-plot due calculation */}
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Base pay basis</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { value: "per_sqyd", label: "Per unit (per sqyd)", hint: "Due = plot size × rate. Bigger plots pay more.", icon: "ruler" },
                    { value: "per_plot", label: "Per plot (flat)", hint: "Every plot pays the same flat amount, regardless of size.", icon: "square" },
                  ].map((m) => {
                    const on = (f.basePayMode ?? "per_sqyd") === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => set("basePayMode", m.value)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${on ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${on ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-500"}`}>
                          <Icon name={m.icon} size={18} />
                        </span>
                        <span>
                          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                            {on && <Icon name="check" size={13} className="text-brand-600" />}{m.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">{m.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(f.basePayMode ?? "per_sqyd") === "per_plot" ? (
                    <Field label="Flat base pay per plot (₹)" hint="Charged to every plot when you apply base pay">
                      <input type="number" min="0" className={inputClass} value={f.basePayFlat ?? ""} onChange={(e) => set("basePayFlat", e.target.value)} placeholder="e.g. 6000" />
                    </Field>
                  ) : (
                    <Field label="Rate per sqyd / year (₹)" hint="Multiplied by each plot's size">
                      <input type="number" min="0" className={inputClass} value={f.ratePerSqyd ?? ""} onChange={(e) => set("ratePerSqyd", e.target.value)} placeholder="e.g. 30" />
                    </Field>
                  )}
                  <Field label="One-time membership fee (₹)">
                    <input type="number" className={inputClass} value={f.membershipFee ?? ""} onChange={(e) => set("membershipFee", e.target.value)} />
                  </Field>
                  <Field label="Late payment penalty (%)">
                    <input type="number" className={inputClass} value={f.latePenaltyPct ?? ""} onChange={(e) => set("latePenaltyPct", e.target.value)} />
                  </Field>
                  <Field label="Due date">
                    <input type="date" className={inputClass} value={f.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} />
                  </Field>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
                  <Icon name="info" size={13} className="mt-0.5 shrink-0" /> Changing this doesn’t re-bill anyone automatically. Go to <b className="font-medium text-slate-600">Plot Owners → Apply base pay</b> to (re)generate dues at the new rate.
                </p>
              </div>
            </Card>
          )}

          {tab === "committee" && (
            <Card>
              <CardHeader
                title="Committee members"
                subtitle="Add members with any role / category — names appear in the member directory"
                icon="users"
                action={<Button size="sm" variant="secondary" icon="plus" onClick={addMember}>Add member</Button>}
              />
              <div className="space-y-3 p-5">
                {committee.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                    No committee members yet — click “Add member”.
                  </p>
                )}
                {committee.map((m, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-end">
                    <Avatar name={m.name || m.role || "—"} size={40} className="shrink-0" />
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field label="Role / Category">
                        <input className={inputClass} value={m.role} onChange={(e) => updateMember(i, "role", e.target.value)} placeholder="e.g. Cultural Head" />
                      </Field>
                      <Field label="Name">
                        <input className={inputClass} value={m.name} onChange={(e) => updateMember(i, "name", e.target.value)} placeholder="Full name" />
                      </Field>
                      <Field label="Phone">
                        <input className={inputClass} value={m.phone} onChange={(e) => updateMember(i, "phone", e.target.value)} placeholder="+91 …" />
                      </Field>
                    </div>
                    <button
                      onClick={() => removeMember(i)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove member"
                    >
                      <Icon name="trash-2" size={16} />
                    </button>
                  </div>
                ))}
                <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-400">
                  <Icon name="info" size={13} /> Add any role (Joint Secretary, Cultural Head, Maintenance In-charge…). Saved with “Save changes”.
                </p>
              </div>
            </Card>
          )}

          {tab === "bank" && (
            <Card>
              <CardHeader title="Bank & UPI details" icon="landmark" />
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field label="Account name">
                  <input className={inputClass} value={f.accountName ?? ""} onChange={(e) => set("accountName", e.target.value)} />
                </Field>
                <Field label="Account number">
                  <input className={inputClass} value={f.accountNo ?? ""} onChange={(e) => set("accountNo", e.target.value)} />
                </Field>
                <Field label="IFSC">
                  <input className={inputClass} value={f.ifsc ?? ""} onChange={(e) => set("ifsc", e.target.value)} />
                </Field>
                <Field label="Bank & branch">
                  <input className={inputClass} value={f.bankBranch ?? ""} onChange={(e) => set("bankBranch", e.target.value)} />
                </Field>
                <Field label="UPI ID" hint="Powers the scannable QR on every payment slip">
                  <input className={inputClass} value={f.upi ?? ""} onChange={(e) => set("upi", e.target.value)} placeholder="association@bank" />
                </Field>
              </div>

              {/* --- Payment QR (editable) --- */}
              <div className="border-t border-slate-100 px-5 pt-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Icon name="qr-code" size={13} /> Payment QR
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 px-5 pt-3 sm:grid-cols-2">
                <Field label="QR payee name" hint="Shown to payers; defaults to the account name">
                  <input className={inputClass} value={f.qrPayeeName ?? ""} onChange={(e) => set("qrPayeeName", e.target.value)} placeholder={f.accountName || f.name || "Association name"} />
                </Field>
                <Field label="QR note / description" hint="Pre-fills the payment note">
                  <input className={inputClass} value={f.qrNote ?? ""} onChange={(e) => set("qrNote", e.target.value)} placeholder="Maintenance" />
                </Field>
              </div>

              <div className="mx-5 my-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-xl bg-white p-2 shadow-sm">
                  {f.qrImageUrl || f.upi ? (
                    <PaymentQr
                      imageUrl={f.qrImageUrl}
                      value={buildUpiUri({
                        vpa: f.upi,
                        payeeName: f.qrPayeeName || f.accountName || f.name,
                        note: f.qrNote || "Maintenance",
                      })}
                      size={96}
                    />
                  ) : (
                    <Icon name="qr-code" size={56} className="text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-slate-700">
                    {f.qrImageUrl ? "Using your custom QR image" : f.upi ? "Auto-generated UPI QR is live" : "Enter a UPI ID or upload a QR"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {f.qrImageUrl
                      ? "Your uploaded QR is shown on every payment slip and the member dues page, overriding the generated one."
                      : "Members can scan this from any UPI app. The same QR — amount pre-filled — prints on each invoice's payment slip. Upload a custom QR (e.g. your bank's) to override it."}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <input
                      ref={qrFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; onPickQr(file); }}
                    />
                    <Button size="sm" variant="secondary" icon="upload" onClick={() => qrFileRef.current?.click()}>
                      {f.qrImageUrl ? "Replace QR image" : "Upload custom QR"}
                    </Button>
                    {f.qrImageUrl && (
                      <Button size="sm" variant="ghost" icon="x" className="text-rose-600 hover:bg-rose-50" onClick={() => set("qrImageUrl", "")}>
                        Remove custom QR
                      </Button>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Icon name="info" size={13} /> Remember to “Save changes”.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {tab === "email" && (
            <Card>
              <CardHeader
                title="Email / SMTP"
                subtitle="Send password resets, reminders and receipts from your own mail server"
                icon="mail-check"
                action={
                  smtpConfigured ? (
                    <Badge tone={f.smtpEnabled ? "green" : "amber"}>
                      <Icon name={f.smtpEnabled ? "circle-check-big" : "pause"} size={11} />
                      {f.smtpEnabled ? "Active" : "Configured · off"}
                    </Badge>
                  ) : (
                    <Badge tone="slate"><Icon name="circle-dashed" size={11} /> Not configured</Badge>
                  )
                }
              />
              <div className="space-y-5 p-5">
                {/* Enable toggle */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Enable email sending</p>
                    <p className="text-xs text-slate-400">When off, the app won’t attempt to send any emails.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("smtpEnabled", !f.smtpEnabled)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${f.smtpEnabled ? "bg-brand-500" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${f.smtpEnabled ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>

                {/* Provider preset */}
                <Field label="Provider preset" hint="Pick a provider to auto-fill host, port and security — then add your credentials.">
                  <select className={inputClass} value={provider} onChange={(e) => applyPreset(e.target.value)}>
                    {Object.entries(SMTP_PRESETS).map(([k, p]) => (
                      <option key={k} value={k}>{p.label}</option>
                    ))}
                  </select>
                </Field>
                {SMTP_PRESETS[provider]?.note && (
                  <p className="-mt-2 flex items-start gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
                    <Icon name="info" size={13} className="mt-0.5 shrink-0" /> {SMTP_PRESETS[provider].note}
                  </p>
                )}

                {/* From identity */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="From name" hint="Shown as the sender">
                    <input className={inputClass} value={f.smtpFromName ?? ""} onChange={(e) => set("smtpFromName", e.target.value)} placeholder={f.name || "Your Association"} />
                  </Field>
                  <Field label="From email">
                    <input type="email" className={inputClass} value={f.smtpFromEmail ?? ""} onChange={(e) => set("smtpFromEmail", e.target.value)} placeholder="noreply@yourdomain.com" />
                  </Field>
                </div>

                {/* Server */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="SMTP host">
                    <input className={inputClass} value={f.smtpHost ?? ""} onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.yourprovider.com" />
                  </Field>
                  <Field label="Port">
                    <input type="number" className={inputClass} value={f.smtpPort ?? ""} onChange={(e) => set("smtpPort", e.target.value)} placeholder="587" />
                  </Field>
                  <Field label="Security">
                    <select className={inputClass} value={f.smtpSecurity ?? "starttls"} onChange={(e) => set("smtpSecurity", e.target.value)}>
                      {SECURITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Username">
                    <input className={inputClass} value={f.smtpUsername ?? ""} onChange={(e) => set("smtpUsername", e.target.value)} placeholder="full email or API user" autoComplete="off" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Password" hint={f.smtpPasswordSet ? "A password is saved — leave blank to keep it." : "SMTP password or API key."}>
                      <PasswordInput
                        value={f.smtpPassword ?? ""}
                        onChange={(e) => set("smtpPassword", e.target.value)}
                        placeholder={f.smtpPasswordSet ? "•••••••• (unchanged)" : "SMTP password / API key"}
                      />
                    </Field>
                  </div>
                </div>

                {/* Test & verify */}
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">Test &amp; verify</p>
                  <p className="mb-2 text-xs text-slate-400">
                    <b>Preview</b> renders the email without sending (no setup needed). <b>Send test</b> delivers it for real via the settings above.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      className={inputClass}
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                      placeholder={`recipient@example.com (defaults to ${live?.email || "your email"})`}
                    />
                    <Button variant="secondary" icon="eye" loading={previewing} onClick={previewEmail} className="shrink-0">Preview</Button>
                    <Button icon="send" loading={testing} onClick={sendTest} className="shrink-0">Send test</Button>
                  </div>

                  {SMTP_PRESETS[provider]?.sandbox && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-700">
                      <Icon name="flask-conical" size={13} className="mt-0.5 shrink-0" />
                      Sandbox provider selected — test emails are captured, not delivered to real owners. Great for checking that mailing works.
                    </p>
                  )}

                  {/* Rendered preview */}
                  {preview && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><Icon name="eye" size={12} /> Preview · not sent</span>
                        <button onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={14} /></button>
                      </div>
                      <div className="space-y-1 px-3 py-2 text-xs text-slate-500">
                        <p><span className="text-slate-400">To:</span> {preview.to}</p>
                        <p><span className="text-slate-400">From:</span> {preview.from}</p>
                        <p><span className="text-slate-400">Subject:</span> <span className="font-medium text-slate-700">{preview.subject}</span></p>
                      </div>
                      {/* Admin-only, server-rendered from our own template */}
                      <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-700 [&_a]:text-brand-600" dangerouslySetInnerHTML={{ __html: preview.html }} />
                    </div>
                  )}
                </div>

                <p className="flex items-start gap-1.5 text-xs text-slate-400">
                  <Icon name="shield-check" size={13} className="mt-0.5 shrink-0" />
                  Your password is stored on the server and never sent back to the browser. Prefer a dedicated app password or API key over your main login.
                </p>
              </div>
            </Card>
          )}

          {tab === "helplines" && (
            <Card>
              <CardHeader
                title="Community helplines"
                subtitle="Emergency & service contacts shown to residents in the directory"
                icon="phone-call"
                action={<Button size="sm" variant="secondary" icon="plus" onClick={addHelpline}>Add helpline</Button>}
              />
              <div className="space-y-3 p-5">
                {helplines.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                    No helplines yet — click “Add helpline”.
                  </p>
                )}
                {helplines.map((h, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-end">
                    <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Label">
                        <input className={inputClass} value={h.label ?? ""} onChange={(e) => updateHelpline(i, "label", e.target.value)} placeholder="e.g. Security Gate" />
                      </Field>
                      <Field label="Phone">
                        <input className={inputClass} value={h.phone ?? ""} onChange={(e) => updateHelpline(i, "phone", e.target.value)} placeholder="+91 …" />
                      </Field>
                    </div>
                    <button
                      onClick={() => removeHelpline(i)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove helpline"
                    >
                      <Icon name="trash-2" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === "notifications" && (
            <Card>
              <CardHeader title="Notification channels" icon="bell" />
              <div className="divide-y divide-slate-100">
                {channels.map((n, i) => (
                  <div key={n.label} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{n.label}</p>
                      <p className="text-xs text-slate-400">{n.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        n.on ? "bg-brand-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          n.on ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
