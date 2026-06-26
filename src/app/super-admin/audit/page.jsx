"use client";

import { useState } from "react";
import {
  PageHeader, Card, Badge, Table, Th, SortTh, Td, Tr, inputClass, Pagination, Drawer, Field,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState(null);
  const c = useListControls();
  const q = useDebounced(search);
  const { data: raw, meta, loading } = useApi("/super/audit-logs", { action, search: q, from, to, ...c.query });
  const logs = normalizeList(raw);
  const actions = meta?.actions ?? [];
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Audit logs" subtitle="Every critical platform action, append-only" />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${inputClass} w-52`} value={action} onChange={(e) => { setAction(e.target.value); c.setPage(1); }}>
              <option value="">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="date" aria-label="From date" className={`${inputClass} w-40`} value={from} onChange={(e) => { setFrom(e.target.value); c.setPage(1); }} />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" aria-label="To date" className={`${inputClass} w-40`} value={to} onChange={(e) => { setTo(e.target.value); c.setPage(1); }} />
            {(from || to) && (
              <button type="button" className="text-xs font-medium text-slate-500 hover:text-brand-700" onClick={() => { setFrom(""); setTo(""); c.setPage(1); }}>Clear</button>
            )}
          </div>
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-72"
              placeholder="Search summary or actor"
              value={search}
              onChange={(e) => { setSearch(e.target.value); c.setPage(1); }}
            />
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <SortTh sortKey="created_at" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>When</SortTh>
              <SortTh sortKey="actor" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Actor</SortTh>
              <SortTh sortKey="action" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Action</SortTh>
              <Th>Summary</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <Tr key={l.dbId} className="cursor-pointer" onClick={() => setDetail(l)}>
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
        <Pagination
          page={c.page}
          totalPages={totalPages}
          total={meta?.total}
          pageSize={c.pageSize}
          onPage={c.setPage}
          onPageSize={c.setPageSize}
        />
      </Card>

      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.action}
        subtitle={detail ? formatDate(detail.createdAt) : ""}
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Actor"><div className="text-slate-700">{detail.actorName || "—"}<span className="block text-xs text-slate-400">{detail.actorRole || ""}</span></div></Field>
              <Field label="Action"><Badge tone={ACTION_TONE(detail.action)}>{detail.action}</Badge></Field>
              <Field label="Entity"><div className="text-slate-700">{detail.entityType || "—"}{detail.entityId ? ` #${detail.entityId}` : ""}</div></Field>
              <Field label="Venture"><div className="text-slate-700">{detail.clientId ?? "—"}</div></Field>
              <Field label="IP address"><div className="font-mono text-xs text-slate-600">{detail.ip || "—"}</div></Field>
            </div>
            <Field label="Summary"><p className="rounded-lg bg-slate-50 p-3 text-slate-700">{detail.summary || "—"}</p></Field>
            {detail.userAgent && (
              <Field label="User agent"><p className="break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-500">{detail.userAgent}</p></Field>
            )}
            <Field label="Details (before / after)">
              {detail.meta && Object.keys(detail.meta).length ? (
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
                  {JSON.stringify(detail.meta, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-400">No additional detail recorded.</p>
              )}
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  );
}
