"use client";

import { PageHeader, Card, Badge, Avatar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

const typeTone = {
  meeting: "sky",
  deadline: "amber",
  progress: "brand",
  general: "slate",
};

export default function MemberAnnouncementsPage() {
  const { data: raw } = useApi("/member/announcements");
  const announcements = normalizeList(raw);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Announcements" subtitle="Notices from the committee" />

      <div className="space-y-4">
        {announcements.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name="megaphone" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{a.title}</h3>
                  {a.pinned && (
                    <Badge tone="rose">
                      <Icon name="pin" size={11} /> Pinned
                    </Badge>
                  )}
                  <Badge tone={typeTone[a.type]}>
                    <span className="capitalize">{a.type}</span>
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.body}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Avatar name={a.author} size={20} />
                  {a.author} · {formatDate(a.date)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
