"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader, Card, Badge, Button, Drawer, Progress, EmptyState, inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";

const STATUS_TONE = {
  planned: "slate", active: "sky", on_hold: "amber",
  delayed: "rose", completed: "green", cancelled: "slate",
};

const REACTIONS = [
  { kind: "like", icon: "thumbs-up" },
  { kind: "celebrate", icon: "party-popper" },
  { kind: "concerned", icon: "frown" },
];

function ProjectDrawer({ dbId, onClose }) {
  const toast = useToast();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [mine, setMine] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/member/projects/${dbId}`);
      setP(data);
    } catch (e) {
      toast(e.message || "Could not load", "error");
    } finally {
      setLoading(false);
    }
  }, [dbId, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    load();
  }, [load]);

  const react = async (kind) => {
    setMine((m) => (m === kind ? null : kind));
    try {
      const { data } = await api.post(`/member/projects/${dbId}/react`, { kind });
      setP((prev) => (prev ? { ...prev, reactions: data?.reactions || {} } : prev));
    } catch (e) {
      toast(e.message || "Could not react", "error");
    }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/member/projects/${dbId}/comment`, { body: comment.trim() });
      setComment("");
      toast(data?.status === "pending" ? "Comment submitted for moderation" : "Comment posted");
      load();
    } catch (e) {
      toast(e.message || "Could not post", "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Drawer open onClose={onClose} width="max-w-xl" title={p?.name || "Project"} subtitle={p?.code}>
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && p && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone={STATUS_TONE[p.status] ?? "slate"}>{p.status?.replace("_", " ")}</Badge>
            {p.vendorName && <Badge tone="violet">{p.vendorName}</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-400">Budget</p><p className="text-sm font-semibold text-slate-800">{formatINR(p.budget)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-400">Spent</p><p className="text-sm font-semibold text-slate-800">{formatINR(p.spent)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-xs text-slate-400">Progress</p><p className="text-sm font-semibold text-slate-800">{p.progressPercent}%</p></div>
          </div>
          <Progress value={p.progressPercent} />

          {p.description && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{p.description}</p>}

          {(p.milestones ?? []).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Milestones</h3>
              <div className="space-y-1.5">
                {p.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <Icon name={m.status === "done" ? "check-circle" : "circle"} size={15} className={m.status === "done" ? "text-brand-600" : "text-slate-300"} />
                    <span className={m.status === "done" ? "text-slate-400 line-through" : "text-slate-700"}>{m.title}</span>
                    {m.dueOn && <span className="text-xs text-slate-400">· {formatDate(m.dueOn)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(p.updates ?? []).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Progress log</h3>
              <ol className="space-y-2 border-l border-slate-200 pl-4">
                {p.updates.map((u) => (
                  <li key={u.id} className="relative text-sm">
                    <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${u.isDelay ? "bg-rose-400" : "bg-brand-400"}`} />
                    <p className="font-medium text-slate-700">{u.title || (u.isDelay ? "Delay flagged" : "Update")}{u.percent != null && <span className="ml-2 text-xs text-slate-400">{u.percent}%</span>}</p>
                    {u.note && <p className="text-slate-500">{u.note}</p>}
                    <p className="text-xs text-slate-400">{u.authorName} · {formatDate(u.createdAt)}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(p.photos ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {p.photos.map((ph) => (
                <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.url} alt={ph.caption || "progress"} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                </a>
              ))}
            </div>
          )}

          {/* Reactions + discussion */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex gap-2">
              {REACTIONS.map((r) => {
                const count = (p.reactions || {})[r.kind] || 0;
                return (
                  <button key={r.kind} onClick={() => react(r.kind)} className={"inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset " + (mine === r.kind ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50")}>
                    <Icon name={r.icon} size={14} />{count > 0 && count}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-2">
              {(p.comments ?? []).map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs font-medium text-slate-700">{c.authorName}</p>
                  <p className="text-sm text-slate-600">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input className={inputClass} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={(e) => e.key === "Enter" && postComment()} />
              <Button size="sm" icon="send" loading={posting} onClick={postComment}>Post</Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function MemberProjectsPage() {
  const { data: raw } = useApi("/member/projects");
  const projects = normalizeList(raw);
  const [openId, setOpenId] = useState(null);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Projects" subtitle="Capital works in your community — progress and updates" />

      {projects.length === 0 ? (
        <Card><EmptyState icon="hammer" title="No projects yet" subtitle="Community improvement projects will appear here." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id} className="cursor-pointer p-5 transition-shadow hover:shadow-md" onClick={() => setOpenId(p.dbId)}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800">{p.name}</p>
                <Badge tone={STATUS_TONE[p.status] ?? "slate"}>{p.status?.replace("_", " ")}</Badge>
              </div>
              {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
              <div className="mt-3 flex items-center gap-2">
                <Progress value={p.progressPercent} className="flex-1" />
                <span className="text-xs text-slate-500">{p.progressPercent}%</span>
              </div>
              {p.targetDate && <p className="mt-2 text-xs text-slate-400">Target: {formatDate(p.targetDate)}</p>}
            </Card>
          ))}
        </div>
      )}

      {openId && <ProjectDrawer dbId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
