"use client";

import { useState, useEffect, useRef } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Field,
  inputClass,
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
  { id: "helplines", label: "Helplines", icon: "phone-call" },
  { id: "notifications", label: "Notifications", icon: "bell" },
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
        ratePerSqyd: live.ratePerSqyd ?? "",
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
        ratePerSqyd: Number(f.ratePerSqyd) || 0,
        membershipFee: Number(f.membershipFee) || 0,
        latePenaltyPct: Number(f.latePenaltyPct) || 0,
        dueDate: f.dueDate || "",
        bank: {
          accountName: f.accountName, accountNo: f.accountNo, ifsc: f.ifsc, bank: f.bankBranch, upi: f.upi,
          qrPayeeName: f.qrPayeeName, qrNote: f.qrNote, qrImageUrl: f.qrImageUrl,
        },
        committee: committee.filter((m) => (m.name || "").trim() || (m.role || "").trim()),
        helplines: helplines.filter((h) => (h.label || "").trim() || (h.phone || "").trim()),
      });
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
              <CardHeader title="Maintenance fees" icon="indian-rupee" />
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field label="Rate per sqyd / year (₹)">
                  <input type="number" className={inputClass} value={f.ratePerSqyd ?? ""} onChange={(e) => set("ratePerSqyd", e.target.value)} />
                </Field>
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
