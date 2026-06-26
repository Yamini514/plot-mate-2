"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  Avatar,
  Field,
  inputClass,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { api, normalizeList } from "@/lib/api";
import { password as validatePassword } from "@/lib/validate";
import { ContactListsCard } from "./ContactListsCard";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/useSettings";
import { formatINR, formatDate } from "@/lib/utils";

function InfoRow({ icon, label, value, locked }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800">{value || "—"}</p>
      </div>
      {locked && <Icon name="lock" size={13} className="text-slate-300" title="Managed by the association office" />}
    </div>
  );
}

export default function MemberProfile() {
  const toast = useToast();
  const { user, updateUser, logout } = useAuth();
  const { settings } = useSettings();
  const { data: me, reload: reloadMe } = useApi("/me/info");
  const { data: rawPlots } = useApi("/member/plots");
  const plots = normalizeList(rawPlots);
  const primaryPlot = plots[0] ?? null;

  // --- Contact details (self-editable: name + phone) -----------------------
  const [form, setForm] = useState({ fullName: "", phoneNumber: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the form once /me/info loads
    if (me) setForm({ fullName: me.fullName ?? "", phoneNumber: me.phoneNumber ?? "" });
  }, [me]);

  const dirty =
    !!me &&
    (form.fullName.trim() !== (me.fullName ?? "") ||
      form.phoneNumber.trim() !== (me.phoneNumber ?? ""));

  const saveProfile = async () => {
    if (!form.fullName.trim()) {
      toast("Your name can't be empty", "error");
      return;
    }
    setSavingProfile(true);
    try {
      await api.put("/me/profile", {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
      });
      updateUser({ name: form.fullName.trim() }); // keep sidebar/topbar in sync
      reloadMe();
      toast("Profile updated");
    } catch (e) {
      toast(e.message || "Couldn't update your profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // --- Change password ------------------------------------------------------
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const changePassword = async () => {
    if (!pw.current) {
      toast("Enter your current password", "error");
      return;
    }
    const pwError = validatePassword(pw.next);
    if (pwError) {
      toast(pwError, "error");
      return;
    }
    if (pw.next !== pw.confirm) {
      toast("New passwords don't match", "error");
      return;
    }
    setSavingPw(true);
    try {
      await api.put("/me/update-password", { currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: "", next: "", confirm: "" });
      toast("Password updated");
    } catch (e) {
      toast(e.message || "Couldn't update your password", "error");
    } finally {
      setSavingPw(false);
    }
  };

  const name = me?.fullName ?? user?.name ?? "Owner";
  const plotNo = me?.plotNo ?? primaryPlot?.plotNo ?? user?.plotNo ?? "—";

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Profile"
        subtitle="Manage your account details and security"
        actions={
          <Link href="/member">
            <Button variant="secondary" icon="map-pinned">My properties</Button>
          </Link>
        }
      />

      {/* Hero banner */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative bg-brand-700 p-6 text-white">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, #34d399 0, transparent 45%), radial-gradient(circle at 85% 80%, #0ea5e9 0, transparent 45%)",
            }}
          />
          <div className="relative flex flex-wrap items-center gap-4">
            <Avatar name={name} src={me?.avatarUrl ?? user?.avatarUrl} size={64} className="bg-white/20 text-white" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{name}</h2>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                  {me?.title || "Plot Owner"}
                </span>
              </div>
              <p className="mt-1 text-sm text-brand-100">
                {settings.name} · Plot {plotNo}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs text-brand-100">Member since</p>
              <p className="font-semibold">{me?.createdAt ? formatDate(me.createdAt) : "—"}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: contact + property */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact details (editable) */}
          <Card>
            <CardHeader title="Contact details" subtitle="Your name and phone — visible to the association office" icon="user-round-cog" />
            <div className="px-5 pt-5">
              <AvatarUpload
                value={me?.avatarUrl ?? user?.avatarUrl}
                name={form.fullName}
                onChange={async (url) => {
                  try {
                    await api.put("/me/profile", { avatarUrl: url });
                    updateUser({ avatarUrl: url });
                    reloadMe();
                    toast("Photo updated");
                  } catch (e) { toast(e.message || "Could not update photo", "error"); }
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  className={inputClass}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Your full name"
                />
              </Field>
              <Field label="Phone number">
                <input
                  className={inputClass}
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email address" hint="Your email is your login ID. Contact the office to change it.">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    <Icon name="mail" size={15} className="text-slate-400" />
                    <span className="truncate">{me?.email || "—"}</span>
                    <Icon name="lock" size={13} className="ml-auto text-slate-300" />
                  </div>
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              {dirty && (
                <Button
                  variant="ghost"
                  onClick={() => setForm({ fullName: me.fullName ?? "", phoneNumber: me.phoneNumber ?? "" })}
                >
                  Discard
                </Button>
              )}
              <Button icon="save" loading={savingProfile} disabled={!dirty} onClick={saveProfile}>
                Save changes
              </Button>
            </div>
          </Card>

          {/* Family members, emergency contacts & nominees */}
          <ContactListsCard me={me} onSaved={reloadMe} />

          {/* My property */}
          <Card>
            <CardHeader
              title="My property"
              subtitle="Registered to your account"
              icon="map-pinned"
              action={<Link href="/member" className="text-xs font-medium text-brand-600 hover:underline">View details</Link>}
            />
            {plots.length === 0 ? (
              <EmptyState icon="map-pinned" title="No property linked" subtitle="Contact the association office to link your plot." />
            ) : (
              <div className="divide-y divide-slate-100">
                {plots.map((p) => (
                  <div key={p.plotNo} className="flex items-center gap-3 px-5 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon name="map-pinned" size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">Plot {p.plotNo}</p>
                      <p className="text-xs text-slate-400">{(p.phase ?? "—")} · {p.sizeSqyd} sqyd</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={p.paymentStatus} />
                      <p className={`mt-1 text-xs font-medium ${p.amountDue > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {p.amountDue > 0 ? `${formatINR(p.amountDue)} due` : "Cleared"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: password + account */}
        <div className="space-y-6">
          {/* Change password */}
          <Card>
            <CardHeader title="Change password" subtitle="Keep your account secure" icon="shield-check" />
            <div className="space-y-4 p-5">
              <Field label="Current password">
                <input
                  type={show ? "text" : "password"}
                  className={inputClass}
                  value={pw.current}
                  autoComplete="current-password"
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="New password" hint="8+ chars with upper, lower, number & special character">
                <input
                  type={show ? "text" : "password"}
                  className={inputClass}
                  value={pw.next}
                  autoComplete="new-password"
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type={show ? "text" : "password"}
                  className={inputClass}
                  value={pw.confirm}
                  autoComplete="new-password"
                  onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  placeholder="••••••••"
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="accent-brand-600" />
                <Icon name={show ? "eye-off" : "eye"} size={13} /> Show passwords
              </label>
              <Button className="w-full" icon="key-round" loading={savingPw} onClick={changePassword}>
                Update password
              </Button>
            </div>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader title="Account" icon="circle-user" />
            <div className="divide-y divide-slate-100">
              <InfoRow icon="badge-check" label="Role" value="Plot Owner" locked />
              <InfoRow icon="map-pinned" label="Plot number" value={plotNo} locked />
              <InfoRow icon="clock" label="Last signed in" value={me?.lastLoggedInAt ? formatDate(me.lastLoggedInAt) : "First session"} />
            </div>
            <div className="border-t border-slate-100 p-4">
              <Button variant="secondary" icon="log-out" className="w-full text-rose-600" onClick={logout}>
                Sign out
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
