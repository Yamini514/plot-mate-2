"use client";

import { useState } from "react";
import { PageHeader, Card, Badge, Avatar, Button, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const typeTone = {
  meeting: "sky",
  deadline: "amber",
  progress: "brand",
  general: "slate",
};

// Reaction kinds the backend understands (announcement_reaction.rb KINDS).
const REACTIONS = [
  { kind: "like", icon: "thumbs-up", label: "Like" },
  { kind: "celebrate", icon: "party-popper", label: "Celebrate" },
  { kind: "concerned", icon: "frown", label: "Concerned" },
];

function AnnouncementCard({ a }) {
  const toast = useToast();
  const [acked, setAcked] = useState(false);
  const [acking, setAcking] = useState(false);
  const [reactions, setReactions] = useState({});
  const [mine, setMine] = useState(null); // optimistic "my reaction" highlight
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const ack = async () => {
    setAcking(true);
    try {
      await api.post(`/member/announcements/${a.dbId}/ack`);
      setAcked(true);
      toast("Marked as read");
    } catch (e) {
      toast(e.message || "Could not mark as read", "error");
    } finally {
      setAcking(false);
    }
  };

  const react = async (kind) => {
    setMine((m) => (m === kind ? null : kind));
    try {
      const { data } = await api.post(`/member/announcements/${a.dbId}/react`, { kind });
      setReactions(data?.reactions || {});
    } catch (e) {
      toast(e.message || "Could not react", "error");
    }
  };

  const loadDetail = async () => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/member/announcements/${a.dbId}`);
      setDetail(data);
      setReactions(data?.reactions || {});
    } catch (e) {
      toast(e.message || "Could not load discussion", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) loadDetail();
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post(`/member/announcements/${a.dbId}/comment`, {
        body: comment.trim(),
      });
      setComment("");
      toast(data?.status === "pending" ? "Comment submitted for moderation" : "Comment posted");
      loadDetail();
    } catch (e) {
      toast(e.message || "Could not post comment", "error");
    } finally {
      setPosting(false);
    }
  };

  const comments = detail?.comments || [];

  return (
    <Card className="p-5">
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
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{a.body}</p>

          {a.attachmentUrl && (
            <a
              href={a.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
            >
              <Icon name="paperclip" size={13} />
              {a.attachmentName || "Attachment"}
            </a>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <Avatar name={a.author} size={20} />
            {a.author} · {formatDate(a.date)}
          </div>

          {/* engagement bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <Button
              size="sm"
              variant={acked ? "secondary" : "primary"}
              icon={acked ? "check-check" : "check"}
              onClick={ack}
              loading={acking}
              disabled={acked}
            >
              {acked ? "Read" : "Mark as read"}
            </Button>

            {REACTIONS.map((r) => {
              const count = reactions[r.kind] || 0;
              const active = mine === r.kind;
              return (
                <button
                  key={r.kind}
                  onClick={() => react(r.kind)}
                  title={r.label}
                  className={
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors " +
                    (active
                      ? "bg-brand-50 text-brand-700 ring-brand-200"
                      : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50")
                  }
                >
                  <Icon name={r.icon} size={14} />
                  {count > 0 && count}
                </button>
              );
            })}

            {a.allowComments && (
              <button
                onClick={toggleExpand}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                <Icon name="message-circle" size={14} />
                Discussion
                <Icon name={expanded ? "chevron-up" : "chevron-down"} size={13} />
              </button>
            )}
          </div>

          {/* discussion thread */}
          {expanded && a.allowComments && (
            <div className="mt-3 space-y-3 rounded-xl bg-slate-50/70 p-3">
              {loadingDetail && <p className="text-xs text-slate-400">Loading discussion…</p>}
              {!loadingDetail && comments.length === 0 && (
                <p className="text-xs text-slate-400">No comments yet — start the conversation.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar name={c.authorName} size={26} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700">{c.authorName}</p>
                    <p className="text-sm text-slate-600">{c.body}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  className={inputClass}
                  placeholder="Write a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && postComment()}
                />
                <Button size="sm" icon="send" onClick={postComment} loading={posting}>
                  Post
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function MemberAnnouncementsPage() {
  const { data: raw } = useApi("/member/announcements");
  const announcements = normalizeList(raw);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Announcements" subtitle="Notices from the committee" />
      <div className="space-y-4">
        {announcements.map((a) => (
          <AnnouncementCard key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}
