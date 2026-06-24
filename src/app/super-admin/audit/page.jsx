"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Table, Th, Td, Tr, inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

// Colour critical actions so they stand out in a dense log.
const ACTION_TONE = (a) =>
  a?.includes("suspend") || a?.includes("block") || a?.includes("reject") ? "rose"
  : a?.includes("approve") || a?.includes("activate") || a?.includes("unblock") ? "green"
  : a?.includes("support") || a?.includes("escalate") ? "amber"
  : "slate";

export default function AuditLogPage() {
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data: raw, meta, loading } = useApi("/super/audit-logs", { action, search: q, page });
  const logs = normalizeList(raw);
  const actions = meta?.actions ?? [];
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Audit logs" subtitle="Every critical platform action, append-only" />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <select className={`${inputClass} w-56`} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-72"
              placeholder="Search summary or actor"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Summary</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <Tr key={l.dbId}>
                <Td className="whitespace-nowrap text-slate-500">{formatDate(l.createdAt)}</Td>
                <Td>
                  <span className="text-slate-700">{l.actorName || "—"}</span>
                  {l.actorRole && <span className="block text-xs text-slate-400">{l.actorRole}</span>}
                </Td>
                <Td><Badge tone={ACTION_TONE(l.action)}>{l.action}</Badge></Td>
                <Td className="text-slate-600">{l.summary || "—"}</Td>
                <Td className="font-mono text-xs text-slate-400">{l.ip || "—"}</Td>
              </Tr>
            ))}
            {logs.length === 0 && (
              <Tr>
                <Td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading audit trail…</>
                  ) : "No audit entries match this view."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-3 text-sm text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
