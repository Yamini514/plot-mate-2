"use client";

import { useState } from "react";
import { PageHeader, Card, CardHeader, Badge, Progress } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function MemberPollsPage() {
  const { data: raw, reload } = useApi("/member/polls");
  const polls = normalizeList(raw);
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);

  const vote = async (poll, optionId) => {
    setBusyId(optionId);
    try {
      await api.post(`/member/polls/${poll.dbId}/vote`, { optionId });
      reload();
    } catch (e) {
      toast(e.message || "Could not record vote", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Polls & Voting" subtitle="Have your say in community decisions" />

      <div className="space-y-4">
        {polls.map((p) => {
          const voted = !!p.voted;
          const total = p.options.reduce((s, o) => s + o.votes, 0);
          return (
            <Card key={p.id}>
              <CardHeader
                title={p.question}
                subtitle={`Closes ${formatDate(p.closesAt)}`}
                icon="vote"
                action={<Badge tone={p.status === "active" ? "green" : "slate"}>{p.status}</Badge>}
              />
              <div className="space-y-3 p-5">
                <p className="text-sm text-slate-500">{p.description}</p>
                {p.options.map((o) => {
                  const count = o.votes;
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  const mine = false;
                  if (!voted && p.status === "active") {
                    return (
                      <button
                        key={o.id}
                        onClick={() => vote(p, o.id)}
                        disabled={busyId === o.id}
                        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyId === o.id ? (
                          <Icon name="loader-circle" size={20} className="animate-spin text-brand-500" />
                        ) : (
                          <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-slate-300" />
                        )}
                        {o.label}
                      </button>
                    );
                  }
                  return (
                    <div key={o.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className={cn("flex items-center gap-1.5", mine ? "font-semibold text-brand-700" : "text-slate-600")}>
                          {mine && <Icon name="check" size={14} />}
                          {o.label}
                        </span>
                        <span className="text-slate-500">{pct}%</span>
                      </div>
                      <Progress value={pct} tone={mine ? "brand" : "amber"} />
                    </div>
                  );
                })}
                <p className="pt-1 text-xs text-slate-400">
                  {voted ? (
                    <span className="inline-flex items-center gap-1 text-brand-600">
                      <Icon name="circle-check-big" size={13} /> Your vote is recorded · {total} votes
                    </span>
                  ) : (
                    `${total} votes so far · tap an option to vote`
                  )}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
