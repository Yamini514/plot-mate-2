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

const STATUS_TONE = {
  submitted: "amber", under_review: "sky", changes_requested: "violet",
  approved: "green", rejected: "rose",
};
const TYPE_LABEL = {
  owner_verification: "Owner verification",
  plot_claim: "Plot claim",
  ownership_transfer: "Ownership transfer",
  document_verification: "Document verification",
  other: "Other",
};

export default function ApprovalsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("open");
  const { data: raw, meta, reload, loading } = useApi("/admin/approvals", { status: filter });
  const requests = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/admin/approvals/${openId}` : null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (action, label) => {
    setBusy(true);
    try {
      await api.post(`/admin/approvals/${openId}/${action}`, { reason: note.trim() || null, note: note.trim() || null });
      setNote("");
      reloadDetail();
      reload();
      toast(label);
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const isOpen = detail && ["submitted", "under_review", "changes_requested"].includes(detail.status);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Approvals" subtitle="Review and decide on requests routed to you" />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "open", label: "Open", count: counts.open },
              { value: "approved", label: "Approved", count: counts.approved },
              { value: "rejected", label: "Rejected", count: counts.rejected },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Request</Th>
              <Th>Type</Th>
              <Th>Submitted by</Th>
              <Th>Raised</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <Tr key={r.dbId} onClick={() => setOpenId(r.dbId)}>
                <Td className="font-mono text-xs text-slate-500">{r.code}</Td>
                <Td className="font-medium text-slate-800">{TYPE_LABEL[r.requestType] ?? r.requestType}</Td>
                <Td className="text-slate-600">{r.submittedByName || "—"}</Td>
                <Td className="text-slate-500">{formatDate(r.createdAt)}</Td>
                <Td><Badge tone={STATUS_TONE[r.status] ?? "slate"}>{r.status?.replace("_", " ")}</Badge></Td>
                <Td><Icon name="chevron-right" size={16} className="text-slate-300" /></Td>
              </Tr>
            ))}
            {requests.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading requests…</>
                  ) : "Nothing to review here."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Drawer
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={detail?.code ?? "Request"}
        subtitle={detail ? (TYPE_LABEL[detail.requestType] ?? detail.requestType) : ""}
      >
        {!detail ? (
          <div className="py-10 text-center text-slate-400">
            <Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[detail.status] ?? "slate"}>{detail.status?.replace("_", " ")}</Badge>
              {detail.submittedByName && <Badge tone="slate">by {detail.submittedByName}</Badge>}
            </div>

            {detail.payload && Object.keys(detail.payload).length > 0 && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="mb-1 font-medium text-slate-700">Details</p>
                <dl className="space-y-1 text-slate-600">
                  {Object.entries(detail.payload).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-slate-400">{k}</dt>
                      <dd className="text-slate-700">{v == null ? "—" : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {detail.kyc && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="mb-2 font-medium text-slate-700">KYC details</p>
                <dl className="space-y-1 text-slate-600">
                  <KycRow label="ID type" value={detail.kyc.idType} />
                  <KycRow label="ID number" value={detail.kyc.idNumber} />
                  <KycRow label="Address" value={detail.kyc.address} />
                </dl>
                {detail.kyc.idDocument?.url ? (
                  <a
                    href={detail.kyc.idDocument.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-brand-700 hover:border-brand-400 hover:bg-brand-50"
                  >
                    <Icon name={detail.kyc.idDocument.type === "application/pdf" ? "file-text" : "image"} size={15} />
                    View ID document
                    <span className="text-xs font-normal text-slate-400">({detail.kyc.idDocument.name || "file"})</span>
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">No ID document was uploaded.</p>
                )}
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Timeline</h3>
              <ol className="space-y-2 border-l border-slate-200 pl-4">
                {(detail.timeline ?? []).map((t) => (
                  <li key={t.id} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-400" />
                    <p className="text-slate-700">
                      <span className="font-medium">{t.action.replace("_", " ")}</span>
                      {t.actorName ? ` · ${t.actorName}` : ""}
                    </p>
                    {t.note && <p className="text-slate-500">{t.note}</p>}
                    <p className="text-xs text-slate-400">{formatDate(t.createdAt)}</p>
                  </li>
                ))}
                {(detail.timeline ?? []).length === 0 && <li className="text-sm text-slate-400">No activity yet.</li>}
              </ol>
            </div>

            {isOpen ? (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <Field label="Note / reason (optional)">
                  <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Recorded in the timeline" />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button icon="check" loading={busy} onClick={() => act("approve", "Approved")}>Approve</Button>
                  <Button variant="secondary" icon="rotate-ccw" loading={busy} onClick={() => act("request-changes", "Changes requested")}>Request changes</Button>
                  <Button variant="danger" icon="x" loading={busy} onClick={() => act("reject", "Rejected")}>Reject</Button>
                  <Button variant="secondary" icon="message-square" loading={busy} onClick={() => act("comment", "Comment added")}>Comment</Button>
                </div>
              </div>
            ) : (
              <p className="border-t border-slate-100 pt-4 text-sm text-slate-500">
                This request is {detail.status?.replace("_", " ")}{detail.decisionReason ? ` — ${detail.decisionReason}` : ""}.
              </p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

function KycRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-700">{value || "—"}</dd>
    </div>
  );
}
