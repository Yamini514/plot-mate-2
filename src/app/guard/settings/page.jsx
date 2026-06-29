"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, Breadcrumbs, Card, CardHeader, Button, Field, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";

const CHANNELS = [
  { key: "email", label: "Email", icon: "mail" },
  { key: "whatsapp", label: "WhatsApp", icon: "message-circle" },
  { key: "in_app", label: "In-app", icon: "bell" },
];
const LANGUAGES = [
  { value: "en", label: "English" }, { value: "hi", label: "हिंदी (Hindi)" },
  { value: "te", label: "తెలుగు (Telugu)" }, { value: "ta", label: "தமிழ் (Tamil)" },
];

function Toggle({ on, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-brand-500" : "bg-slate-200"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function GuardSettingsPage() {
  const toast = useToast();
  const router = useRouter();
  const { logout } = useAuth();
  const { data: me, reload } = useApi("/me/info");
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me || prefs) return;
    const p = me.communicationPrefs || {};
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed once
    setPrefs({ email: p.email ?? true, whatsapp: p.whatsapp ?? true, in_app: p.in_app ?? true, language: p.language || "en" });
  }, [me, prefs]);

  const save = async () => {
    setSaving(true);
    try { await api.put("/me/profile", { communicationPrefs: prefs }); toast("Preferences saved"); reload(); }
    catch (e) { toast(e.message || "Could not save", "error"); }
    finally { setSaving(false); }
  };

  const doLogout = async () => { await logout(); router.replace("/login"); };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "System" }, { label: "Settings" }]} />
      <PageHeader title="Settings" subtitle="Notifications, language and account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Notification preferences" subtitle="How we reach you" icon="bell" />
          <div className="divide-y divide-slate-100">
            {prefs && CHANNELS.map((c) => (
              <div key={c.key} className="flex items-center justify-between px-5 py-4">
                <span className="flex items-center gap-2 text-sm text-slate-700"><Icon name={c.icon} size={16} className="text-slate-400" /> {c.label}</span>
                <Toggle on={!!prefs[c.key]} onClick={() => setPrefs({ ...prefs, [c.key]: !prefs[c.key] })} />
              </div>
            ))}
          </div>
          <div className="p-5">
            <Field label="Language" hint="Saved to your profile.">
              <select className={inputClass} value={prefs?.language || "en"} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })} disabled={!prefs}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
            <div className="mt-4 flex justify-end"><Button icon="save" loading={saving} disabled={!prefs} onClick={save}>Save preferences</Button></div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Password" subtitle="Keep your account secure" icon="shield-check" />
            <div className="flex items-center justify-between p-5">
              <p className="text-sm text-slate-600">Change your password from your profile.</p>
              <Link href="/guard/profile"><Button variant="secondary" icon="key-round">Change password</Button></Link>
            </div>
          </Card>
          <Card>
            <CardHeader title="Session" icon="log-out" />
            <div className="flex items-center justify-between p-5">
              <p className="text-sm text-slate-600">End your shift and sign out.</p>
              <Button variant="secondary" icon="log-out" onClick={doLogout}>Logout</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
