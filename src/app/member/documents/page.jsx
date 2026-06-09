"use client";

import { PageHeader, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { documents } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

const catIcon = {
  Legal: "scale",
  Financial: "indian-rupee",
  "Meeting Minutes": "file-text",
  Layout: "map",
  Other: "file",
};

export default function MemberDocumentsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" subtitle="Association records available to all owners" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {documents.map((d) => (
          <Card key={d.id} className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon name={catIcon[d.category] ?? "file"} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">{d.name}</p>
              <p className="text-xs text-slate-400">
                {d.category} · {d.size} · {formatDate(d.date)}
              </p>
            </div>
            <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
              <Icon name="download" size={16} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
