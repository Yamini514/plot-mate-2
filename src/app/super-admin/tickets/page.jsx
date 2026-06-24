"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, Td, Tr, Drawer, Field, inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const PRIORITY_TONE = { low: "slate", medium: "sky", high: "amber", critical: "rose" };
const STATUS_TONE = {
  open: "amber", assigned: "sky", in_progress: "violet", waiting_venture: "slate",
  resolved: "green", closed: "slate", escalated: "rose",
};
const STATUS_OPTS = ["open", "assigned", "in_progress", "waiting_venture", "resolved", "closed"];

export default function PlatformTicketsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data: raw, meta, reload, loading } = useApi("/super/tickets", { status: filter });
  const tickets = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [openId, setOpenId] = useState(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  // Detail is fetched through the shared hook (re-fetches when openId changes;
  // a null path while the drawer is closed means "don't fetch").
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/super/tickets/${openId}` : null);

  const act = async (fn, label) => {
    setBusy(true);
    try {
      await fn();
      reloadDetail();
      reload();
      if (label) toast(label);
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally { setBusy(false); }
  };

  const sendReply = () =>
    act(async () => {
      if (!reply.trim()) return;
      await api.post(`/super/tickets/${openId}/reply`, { body: reply.trim(), internal });
      setReply(""); setInternal(false);
    }, "Reply sent");

  return (
    <div className="animate-fade-in">
      <PageHeader title="Support tickets" subtitle="Venture ↔ platform support, triage and escalation" />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "open", label: "Open", count: counts.open },
              { value: "in_progress", label: "In progress", count: counts.in_progress },
              { value: "escalated", label: "Escalated", count: counts.escalated },
              { value: "resolved", label: "Resolved", count: counts.resolved },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Ticket</Th>
              <Th>Venture</Th>
              <Th>Subject</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <Tr key={t.dbId} onClick={() => setOpenId(t.dbId)}>
                <Td className="font-mono text-xs text-slate-500">{t.code}</Td>
                <Td className="text-slate-600">{t.venture || "—"}</Td>
                <Td className="font-medium text-slate-800">{t.subject}</Td>
                <Td><Badge tone={PRIORITY_TONE[t.priority] ?? "slate"}>{t.priority}</Badge></Td>
                <Td><Badge tone={STATUS_TONE[t.status] ?? "slate"}>{t.status}</Badge></Td>
                <Td><Icon name="chevron-right" size={16} className="text-slate-300" /></Td>
              </Tr>
            ))}
            {tickets.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading tickets…</>
                  ) : "No tickets in this view."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Drawer
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={detail?.code ?? "Ticket"}
        subtitle={detail?.subject}
      >
        {!detail ? (
          <div className="py-10 text-center text-slate-400">
            <Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={PRIORITY_TONE[detail.priority] ?? "slate"}>{detail.priority}</Badge>
              <Badge tone={STATUS_TONE[detail.status] ?? "slate"}>{detail.status}</Badge>
              <Badge tone="slate">{detail.escalationLevel}</Badge>
              {detail.venture && <Badge tone="sky">{detail.venture}</Badge>}
            </div>

            {detail.description && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{detail.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon="user-plus" loading={busy}
                onClick={() => act(() => api.post(`/super/tickets/${openId}/assign`, {}), "Assigned to you")}>
                Assign to me
              </Button>
              <Button variant="secondary" icon="trending-up" loading={busy}
                onClick={() => act(() => api.post(`/super/tickets/${openId}/escalate`, {}), "Escalated")}>
                Escalate
              </Button>
              <select
                className={`${inputClass} w-44`}
                value={detail.status}
                onChange={(e) => act(() => api.post(`/super/tickets/${openId}/status`, { status: e.target.value }), "Status updated")}
              >
                {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Conversation</h3>
              <ul className="space-y-2">
                {(detail.messages ?? []).map((m) => (
                  <li key={m.id} className={`rounded-lg p-3 text-sm ${m.internal ? "bg-amber-50" : "bg-slate-50"}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium text-slate-600">{m.authorName} · {m.authorRole}</span>
                      <span>{formatDate(m.createdAt)}{m.internal ? " · internal note" : ""}</span>
                    </div>
                    <p className="text-slate-700">{m.body}</p>
                  </li>
                ))}
                {(detail.messages ?? []).length === 0 && (
                  <li className="text-sm text-slate-400">No messages yet.</li>
                )}
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Field label="Reply">
                <textarea className={inputClass} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply to the venture…" />
              </Field>
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note (not visible to the venture)
              </label>
              <div className="mt-3 flex justify-end">
                <Button icon="send" loading={busy} onClick={sendReply}>Send</Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
