"use client";

import { useMemo, useState } from "react";
import { PageHeader, Card, Badge, Segmented } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

export default function MemberPhotosPage() {
  const { data: raw } = useApi("/member/photos");
  const sitePhotos = normalizeList(raw);
  const [cat, setCat] = useState("all");
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(sitePhotos.map((p) => p.category)))],
    [sitePhotos],
  );
  const filtered = sitePhotos.filter((p) => cat === "all" || p.category === cat);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Site Photos"
        subtitle="Construction and development progress"
      />

      <div className="mb-4">
        <Segmented
          value={cat}
          onChange={setCat}
          options={categories.map((c) => ({
            value: c,
            label: c === "all" ? "All" : c,
          }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <Card key={p.id} className="group overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption}
              className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="p-3">
              <Badge tone="brand">{p.category}</Badge>
              <p className="mt-2 text-sm font-medium text-slate-700">{p.caption}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Icon name="calendar" size={12} />
                {formatDate(p.date)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
