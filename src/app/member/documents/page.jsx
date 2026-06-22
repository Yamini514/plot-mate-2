"use client";

import { PageHeader, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

const catIcon = {
  Legal: "scale",
  Financial: "indian-rupee",
  "Meeting Minutes": "file-text",
  Layout: "map",
  Maintenance: "wrench",
  Other: "file",
};

function DocCard({ d }) {
  const open = () => {
    if (d.url && d.url !== "#") window.open(d.url, "_blank", "noopener,noreferrer");
  };
  const hasFile = d.url && d.url !== "#";
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon name={catIcon[d.category] ?? "file"} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800">{d.name}</p>
        <p className="text-xs text-slate-400">
          {d.category} · {d.size} · {formatDate(d.date)}
        </p>
      </div>
      <button
        onClick={open}
        disabled={!hasFile}
        title={hasFile ? "Open document" : "No file attached"}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-40"
      >
        <Icon name="download" size={16} />
      </button>
    </Card>
  );
}

export default function MemberDocumentsPage() {
  const { data: raw } = useApi("/member/documents");
  const documents = normalizeList(raw);
  // The backend only returns approved documents the member is allowed to see —
  // association-wide ("owners") or scoped to their own plot ("plot").
  const association = documents.filter((d) => (d.visibility ?? "owners") !== "plot");
  const mine = documents.filter((d) => d.visibility === "plot");

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader title="Documents" subtitle="Records the association has shared with you" />

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon name="users" size={16} className="text-slate-400" /> Association documents
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{association.length}</span>
        </h2>
        {association.length === 0 ? (
          <Card className="p-0">
            <EmptyState icon="folder-open" title="No shared documents yet" subtitle="Association-wide records will appear here once published." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {association.map((d) => <DocCard key={d.id} d={d} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon name="map-pin" size={16} className="text-slate-400" /> My plot documents
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{mine.length}</span>
        </h2>
        {mine.length === 0 ? (
          <Card className="p-0">
            <EmptyState icon="file-text" title="Nothing for your plot yet" subtitle="Documents the admin shares specifically with your plot (agreements, maintenance, receipts) show up here." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mine.map((d) => <DocCard key={d.id} d={d} />)}
          </div>
        )}
      </section>
    </div>
  );
}
