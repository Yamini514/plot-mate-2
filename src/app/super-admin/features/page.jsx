"use client";

import { useState } from "react";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { cn, formatDate } from "@/lib/utils";

const STATUS_TONE = { active: "green", suspended: "rose" };

function Switch({ on, busy, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50",
        on ? "bg-brand-600" : "bg-slate-300",
      )}
    >
      <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

export default function FeaturesPage() {
  const toast = useToast();
  const { data, loading, reload } = useApi("/super/features");
  const features = data?.features ?? [];
  const ventures = data?.ventures ?? [];

  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState(null);

  const selected = ventures.find((v) => v.id === selectedId) || ventures[0] || null;
  const filtered = ventures.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = async (featureKey, next) => {
    if (!selected) return;
    setBusyKey(featureKey);
    try {
      await api.post(`/super/features/${selected.id}/toggle`, { feature: featureKey, enabled: next });
      toast(`${next ? "Enabled" : "Disabled"} ${featureKey.replace(/_/g, " ")}`);
      reload();
    } catch (e) {
      toast(e.message || "Could not update feature", "error");
    } finally { setBusyKey(null); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Feature management" subtitle="Enable or disable modules per venture" />

      {loading && !data ? (
        <Card className="p-10 text-center text-slate-400">
          <Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…
        </Card>
      ) : ventures.length === 0 ? (
        <EmptyState icon="building-2" title="No ventures" subtitle="Feature toggles appear once ventures exist." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Venture picker */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
                  placeholder="Search ventures"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {filtered.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border-b border-slate-50 px-4 py-3 text-left text-sm transition-colors",
                      selected?.id === v.id ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="truncate font-medium">{v.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {Object.values(v.features).filter((f) => f.on).length}/{features.length}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="p-4 text-center text-sm text-slate-400">No matches.</li>}
            </ul>
          </Card>

          {/* Feature toggles for the selected venture */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">{selected?.name}</h2>
                <p className="text-xs text-slate-400">Toggle modules available to this venture</p>
              </div>
              {selected && <Badge tone={STATUS_TONE[selected.status] ?? "slate"}>{selected.status}</Badge>}
            </div>
            <ul className="divide-y divide-slate-100">
              {features.map((f) => {
                const state = selected?.features?.[f.key] || {};
                return (
                  <li key={f.key} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="font-medium text-slate-800">{f.label}</p>
                      <p className="text-xs text-slate-400">{f.description}</p>
                      {state.enabledAt && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {state.on ? "Enabled" : "Disabled"} · {formatDate(state.enabledAt)}
                        </p>
                      )}
                    </div>
                    <Switch on={!!state.on} busy={busyKey === f.key} onChange={(next) => toggle(f.key, next)} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
