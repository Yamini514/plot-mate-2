"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Field,
  inputClass,
  Avatar,
  Badge,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { association } from "@/lib/mock-data";

const tabs = [
  { id: "association", label: "Association", icon: "building" },
  { id: "fees", label: "Fees & Dues", icon: "indian-rupee" },
  { id: "committee", label: "Committee", icon: "users" },
  { id: "bank", label: "Bank & UPI", icon: "landmark" },
  { id: "notifications", label: "Notifications", icon: "bell" },
];

const initialChannels = [
  { label: "WhatsApp reminders", desc: "Send dues reminders via WhatsApp", on: true },
  { label: "SMS alerts", desc: "Critical alerts over SMS", on: true },
  { label: "Email digests", desc: "Weekly treasury summary by email", on: false },
  { label: "Payment confirmations", desc: "Auto-notify on payment received", on: true },
];

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("association");
  const [channels, setChannels] = useState(initialChannels);

  const toggle = (i) =>
    setChannels((prev) => prev.map((c, idx) => (idx === i ? { ...c, on: !c.on } : c)));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Configure your association"
        actions={<Button icon="save" onClick={() => toast("Settings saved")}>Save changes</Button>}
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
                  <input className={inputClass} defaultValue={association.name} />
                </Field>
                <Field label="Type">
                  <input className={inputClass} defaultValue={association.type} />
                </Field>
                <Field label="Registration number">
                  <input className={inputClass} defaultValue={association.registrationNo} />
                </Field>
                <Field label="Total plots">
                  <input className={inputClass} defaultValue={association.totalPlots} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address">
                    <input className={inputClass} defaultValue={association.location} />
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
                  <input className={inputClass} defaultValue={association.ratePerSqyd} />
                </Field>
                <Field label="One-time membership fee (₹)">
                  <input className={inputClass} defaultValue={2000} />
                </Field>
                <Field label="Late payment penalty (%)">
                  <input className={inputClass} defaultValue={5} />
                </Field>
                <Field label="Due date">
                  <input type="date" className={inputClass} defaultValue="2025-06-30" />
                </Field>
              </div>
            </Card>
          )}

          {tab === "committee" && (
            <Card>
              <CardHeader title="Committee members" icon="users" />
              <div className="divide-y divide-slate-100">
                {Object.entries(association.committee).map(([role, m]) => (
                  <div key={role} className="flex items-center gap-3 px-5 py-4">
                    <Avatar name={m.name} size={40} />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{m.name}</p>
                      <p className="text-xs capitalize text-slate-400">{role}</p>
                    </div>
                    <span className="text-sm text-slate-500">{m.phone}</span>
                    <Badge tone="green">Active</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === "bank" && (
            <Card>
              <CardHeader title="Bank & UPI details" icon="landmark" />
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field label="Account name">
                  <input className={inputClass} defaultValue={association.bank.accountName} />
                </Field>
                <Field label="Account number">
                  <input className={inputClass} defaultValue={association.bank.accountNo} />
                </Field>
                <Field label="IFSC">
                  <input className={inputClass} defaultValue={association.bank.ifsc} />
                </Field>
                <Field label="Bank & branch">
                  <input className={inputClass} defaultValue={association.bank.bank} />
                </Field>
                <Field label="UPI ID">
                  <input className={inputClass} defaultValue={association.bank.upi} />
                </Field>
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
