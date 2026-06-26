"use client";

import { PageHeader, Card, Avatar, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 px-1 py-3 first:border-t-0">
      <Icon name={icon} size={16} className="text-slate-400" />
      <span className="w-28 text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value || "—"}</span>
    </div>
  );
}

export default function VendorProfilePage() {
  const { user } = useAuth();
  return (
    <div className="animate-fade-in">
      <PageHeader title="My Profile" subtitle="Your service-partner account" />
      <Card className="max-w-xl p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} src={user?.avatarUrl} size={56} />
          <div>
            <p className="text-lg font-semibold text-slate-800">{user?.name}</p>
            <Badge tone="violet"><Icon name="hard-hat" size={11} /> Service partner</Badge>
          </div>
        </div>
        <div className="mt-5">
          <Row icon="briefcase" label="Role" value={user?.title} />
          <Row icon="mail" label="Email" value={user?.email} />
        </div>
        <p className="mt-4 text-xs text-slate-400">
          To update your details, contact the association office.
        </p>
      </Card>
    </div>
  );
}
