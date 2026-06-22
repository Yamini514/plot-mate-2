"use client";

import { PageHeader, Card, CardHeader, Avatar, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useApi } from "@/lib/useApi";
import { useSettings } from "@/lib/useSettings";

export default function DirectoryPage() {
  const { settings } = useSettings();
  const { data: owners, meta } = useApi("/member/directory");
  void owners;
  const liveCommittee = meta?.committee;
  const staff = meta?.staff ?? [];
  // committee may be an array (current) or a legacy {role:{name,phone}} object.
  // No live committee configured yet → empty (no sample names).
  const legacyLabel = { secretary: "Honorary Secretary", president: "President", treasurer: "Treasurer" };
  const committee = Array.isArray(liveCommittee)
    ? liveCommittee
    : liveCommittee && typeof liveCommittee === "object" && Object.keys(liveCommittee).length
      ? Object.entries(liveCommittee).map(([k, v]) => ({
          role: legacyLabel[k] ?? k,
          name: typeof v === "object" ? v?.name : v,
          phone: typeof v === "object" ? v?.phone : "",
        }))
      : [];

  // Helplines come from association settings (admin-configured); empty until set.
  const helplines = settings.helplines;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Contact Directory"
        subtitle="Committee members and community helplines"
      />

      <Card>
        <CardHeader title="Association committee" icon="users" />
        {committee.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No committee members configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            {committee.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 text-center">
                <Avatar name={c.name} size={52} className="mx-auto" />
                <p className="mt-3 font-semibold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">{c.role}</p>
                {c.phone && (
                  <a
                    href={`tel:${String(c.phone).replace(/\s/g, "")}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
                  >
                    <Icon name="phone" size={14} />
                    {c.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="Helplines" icon="phone-call" />
        <div className="divide-y divide-slate-100">
          {helplines.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No helplines configured yet.</p>
          ) : helplines.map((h, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <Icon name={h.icon || "phone-call"} size={18} />
              </span>
              <p className="flex-1 font-medium text-slate-800">{h.label}</p>
              {h.phone && (
                <a
                  href={`tel:${String(h.phone).replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                >
                  <Icon name="phone" size={14} />
                  {h.phone}
                </a>
              )}
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
