"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  CardHeader,
  Button,
  Badge,
  StatusBadge,
  Avatar,
  EmptyState,
  ConfirmDialog,
  Field,
  PasswordInput,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AvatarUpload } from "@/components/AvatarUpload";
import { password as validatePassword } from "@/lib/validate";
import { shiftForNow, isBeforeShiftEnd, fmtClock } from "@/lib/shift";

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function GuardProfile() {
  const toast = useToast();
  const router = useRouter();
  const { logout } = useAuth();
  const { data: me } = useApi("/me/info");
  const { data: rosterData } = useApi("/guard/shift-roster");
  const { data: actionsData } = useApi("/guard/recent-actions");
  const shiftRoster = rosterData ?? [];
  const recentGateActions = actionsData ?? [];

  // Current shift is computed from the local clock after mount (client-only, so
  // it never causes an SSR/CSR hydration mismatch).
  const [shift, setShift] = useState(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- time-of-day shift, client only
    setShift(shiftForNow());
  }, []);

  // Identity comes from the guard's own account; gate/supervisor are optional
  // admin-set fields (in the account's extras); the shift is computed above.
  const profile = {
    name: me?.fullName ?? "Guard",
    title: me?.title ?? "Security Guard",
    guardId: me?.guardId ?? "—",
    email: me?.email ?? "—",
    phone: me?.phoneNumber ?? "—",
    agency: me?.agency ?? null,
    gate: me?.gate ?? "Main Gate",
    shift: shift?.name ?? "—",
    shiftStart: shift?.start ?? "—",
    shiftEnd: shift?.end ?? "—",
    // Real clock-in: the time this guard signed in (opening the shift).
    clockIn: me?.lastLoggedInAt ? fmtClock(me.lastLoggedInAt) : shift?.start ?? "—",
    supervisor: { name: me?.supervisorName ?? null, phone: me?.supervisorPhone ?? null },
  };

  // Ending the shift signs the guard out. Before the scheduled end we confirm
  // (and the backend records it as an early clock-out).
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [endingEarly, setEndingEarly] = useState(false);
  const [ending, setEnding] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

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

  const requestEndShift = () => {
    setEndingEarly(isBeforeShiftEnd());
    setConfirmOpen(true);
  };

  const endShift = async () => {
    setEnding(true);
    try {
      await logout();
      toast("Shift ended — clocked out");
    } finally {
      setConfirmOpen(false);
      setEnding(false);
      router.replace("/login");
    }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "System" }, { label: "Profile & Shift" }]} />
      <PageHeader title="Guard Profile & Shift" subtitle="Your assignment, shift timings and attendance" />

      {/* Profile banner */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <Avatar name={profile.name} size={72} className="text-xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{profile.name}</h2>
              <StatusBadge status="on_duty" />
            </div>
            <p className="mt-0.5 text-sm text-slate-500">{profile.title} · {profile.guardId}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Icon name="door-open" size={13} /> {profile.gate}</span>
              <span className="flex items-center gap-1"><Icon name="clock" size={13} /> {profile.shift} shift</span>
              {profile.agency && <span className="flex items-center gap-1"><Icon name="building-2" size={13} /> {profile.agency}</span>}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">Current shift</p>
            <p className="text-lg font-semibold text-slate-900">{profile.shiftStart} – {profile.shiftEnd}</p>
            <p className="text-xs text-slate-400">{profile.shift} · clocked in {profile.clockIn}</p>
            <Button
              className="mt-3"
              variant="danger"
              icon="log-out"
              onClick={requestEndShift}
            >
              End Shift
            </Button>
          </div>
        </div>
      </Card>

      {/* Account: avatar + change password */}
      <Card className="mb-6">
        <CardHeader title="My account" subtitle="Photo and password" icon="circle-user" />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <AvatarUpload value={me?.avatarUrl} name={profile.name}
            onChange={async (url) => { try { await api.put("/me/profile", { avatarUrl: url }); toast("Photo updated"); } catch (e) { toast(e.message, "error"); } }} />
          <div className="space-y-3">
            <Field label="Current password"><PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
            <Field label="New password" hint="8+ chars with upper, lower, number & special character"><PasswordInput value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="Confirm new password"><PasswordInput value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            <div className="flex justify-end"><Button icon="key-round" loading={savingPw} onClick={changePassword}>Update password</Button></div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Assignment & contact */}
        <Card>
          <CardHeader title="Assignment" icon="map-pin" />
          <div className="divide-y divide-slate-100">
            <InfoRow icon="door-open" label="Assigned gate / location" value={profile.gate} />
            <InfoRow icon="clock" label="Shift timings" value={`${profile.shiftStart} – ${profile.shiftEnd} (${profile.shift})`} />
            <InfoRow icon="phone" label="Contact" value={profile.phone} />
            <InfoRow icon="mail" label="Email" value={profile.email} />
            <InfoRow icon="user-cog" label="Supervisor" value={profile.supervisor.name ? `${profile.supervisor.name}${profile.supervisor.phone ? ` · ${profile.supervisor.phone}` : ""}` : "Not assigned"} />
          </div>
        </Card>

        {/* Security team on the gate */}
        <Card>
          <CardHeader title="Security team" subtitle="Guards on the gate" icon="users" />
          <div className="space-y-2 p-4">
            {shiftRoster.length === 0 ? (
              <p className="px-1 py-8 text-center text-sm text-slate-400">No other guards on the roster.</p>
            ) : shiftRoster.map((s, i) => (
              <div
                key={s.guardId ?? s.name ?? i}
                className={`flex items-center justify-between rounded-xl border p-3 ${s.current ? "border-brand-200 bg-brand-50/60" : "border-slate-200"}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={s.name} size={36} />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {s.name}{s.current && <span className="ml-1 font-normal text-slate-400">· You</span>}
                    </p>
                    <p className="text-xs text-slate-400">{s.title}{s.guardId ? ` · ${s.guardId}` : ""}</p>
                  </div>
                </div>
                {s.current && <Badge tone="brand">On duty</Badge>}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent gate actions */}
        <Card>
          <CardHeader title="My recent actions" icon="history" />
          {recentGateActions.length === 0 ? (
            <EmptyState icon="history" title="No recent activity" subtitle="Visitors, deliveries and incidents you log will appear here." />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentGateActions.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon name={a.icon} size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-snug text-slate-700">{a.text}</p>
                    <p className="text-xs text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !ending && setConfirmOpen(false)}
        onConfirm={endShift}
        loading={ending}
        title={endingEarly ? "End shift early?" : "End shift & sign out?"}
        confirmLabel={endingEarly ? "End shift anyway" : "End shift"}
        confirmVariant={endingEarly ? "danger" : "primary"}
        message={
          endingEarly
            ? `Your ${profile.shift} shift runs until ${profile.shiftEnd}. Ending now will be recorded as an early clock-out on the attendance log, and you'll be signed out.`
            : "You'll be clocked out and signed out. Your login and logout times stay on the attendance log."
        }
      />
    </div>
  );
}
