"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Badge, Drawer, Field, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { uploadDocument } from "@/lib/upload";
import { formatDate } from "@/lib/utils";

const TYPE_LABEL = {
  plot_claim: "Plot claim", ownership_transfer: "Ownership transfer",
  document_verification: "Document verification", owner_verification: "Owner verification", other: "Request",
};
const STATUS_TONE = {
  submitted: "amber", under_review: "sky", changes_requested: "amber", approved: "green", rejected: "rose",
};

export default function MemberRequestsPage() {
  const toast = useToast();
  const { data: raw, reload } = useApi("/member/requests");
  const requests = normalizeList(raw);
  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/member/requests/${openId}` : null);
  const [busy, setBusy] = useState(false);

  const refresh = () => { reload(); reloadDetail(); };

  const attach = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadDocument(file);
      await api.post(`/member/requests/${openId}/documents`, { name: file.name, url });
      toast("Document added");
      refresh();
    } catch (e) { toast(e.message || "Could not upload", "error"); }
    finally { setBusy(false); }
  };

  const resubmit = async () => {
    setBusy(true);
    try { await api.post(`/member/requests/${openId}/resubmit`, {}); toast("Resubmitted"); refresh(); }
    catch (e) { toast(e.message || "Could not resubmit", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="My Requests" subtitle="Track your plot claims, transfers and document submissions" />

      {requests.length === 0 ? (
        <Card><EmptyState icon="file-search" title="No requests yet" subtitle="Your plot claims and transfer requests appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.dbId} className="cursor-pointer p-4 transition-colors hover:border-brand-200" onClick={() => setOpenId(r.dbId)}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-800">{TYPE_LABEL[r.requestType] ?? r.requestType}</p>
                  <p className="text-xs text-slate-400">{r.code} · {formatDate(r.createdAt)}</p>
                </div>
                <Badge tone={STATUS_TONE[r.status] ?? "slate"}>{(r.status || "").replace(/_/g, " ")}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!openId} onClose={() => setOpenId(null)} title={detail ? (TYPE_LABEL[detail.requestType] ?? detail.requestType) : "Request"} subtitle={detail?.code}>
        {!detail ? (
          <div className="py-10 text-center text-slate-400"><Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-5">
            <Badge tone={STATUS_TONE[detail.status] ?? "slate"}>{(detail.status || "").replace(/_/g, " ")}</Badge>
            {detail.decisionReason && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><span className="font-medium">Note:</span> {detail.decisionReason}</p>
            )}

            {/* Documents already attached */}
            {Array.isArray(detail.payload?.documents) && detail.payload.documents.length > 0 && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Documents</h4>
                <ul className="space-y-1">
                  {detail.payload.documents.map((d, i) => (
                    <li key={i}><a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline"><Icon name="file" size={14} /> {d.name}</a></li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline</h4>
              <ul className="space-y-2.5">
                {(detail.timeline ?? []).map((t) => (
                  <li key={t.id} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon name="dot" size={14} /></span>
                    <div>
                      <p className="text-slate-700">{(t.action || "").replace(/_/g, " ")}{t.note ? ` — ${t.note}` : ""}</p>
                      <p className="text-xs text-slate-400">{t.actorName || "system"} · {formatDate(t.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Owner actions while open */}
            {["submitted", "under_review", "changes_requested"].includes(detail.status) && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Field label="Add a supporting document">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={(e) => attach(e.target.files?.[0])} />
                </Field>
                {detail.status === "changes_requested" && (
                  <Button icon="send" loading={busy} onClick={resubmit}>Resubmit for review</Button>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
