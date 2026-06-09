"use client";

import { PageHeader, Card, CardHeader, Avatar, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { association, staff } from "@/lib/mock-data";

export default function DirectoryPage() {
  const committee = [
    { role: "Honorary Secretary", ...association.committee.secretary },
    { role: "President", ...association.committee.president },
    { role: "Treasurer", ...association.committee.treasurer },
  ];

  const helplines = [
    { label: "Security Gate", phone: "+91 98480 00000", icon: "shield" },
    { label: "Maintenance / Plumber", phone: "+91 90000 99887", icon: "wrench" },
    { label: "Electrician", phone: "+91 90000 12321", icon: "zap" },
    { label: "Garbage Collection", phone: "+91 40 9876 5432", icon: "trash-2" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contact Directory"
        subtitle="Committee members and community helplines"
      />

      <Card>
        <CardHeader title="Association committee" icon="users" />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          {committee.map((c) => (
            <div key={c.role} className="rounded-xl border border-slate-200 p-4 text-center">
              <Avatar name={c.name} size={52} className="mx-auto" />
              <p className="mt-3 font-semibold text-slate-800">{c.name}</p>
              <p className="text-xs text-slate-400">{c.role}</p>
              <a
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                <Icon name="phone" size={14} />
                {c.phone}
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Helplines" icon="phone-call" />
        <div className="divide-y divide-slate-100">
          {helplines.map((h) => (
            <div key={h.label} className="flex items-center gap-3 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <Icon name={h.icon} size={18} />
              </span>
              <p className="flex-1 font-medium text-slate-800">{h.label}</p>
              <a
                href={`tel:${h.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
              >
                <Icon name="phone" size={14} />
                {h.phone}
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Staff & vendors" icon="hard-hat" />
        <div className="divide-y divide-slate-100">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={s.name} size={36} />
              <div className="flex-1">
                <p className="font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-400">{s.role}</p>
              </div>
              {s.type === "vendor" && <Badge tone="violet">Vendor</Badge>}
              <span className="text-sm text-slate-500">{s.phone}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
