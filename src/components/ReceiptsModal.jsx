"use client";

import { Modal, Table, Th, Td, Tr, EmptyState, Badge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useApi } from "@/lib/useApi";
import { normalizeList } from "@/lib/api";
import { formatINR } from "@/lib/utils";

/**
 * Shows the real payment receipts for a plot. Only mount this when `plotNo`
 * is set (e.g. `{plotNo && <ReceiptsModal .../>}`) so the fetch fires on open.
 * Pulls from /admin/billing/payments?search=<plotNo>.
 */
export function ReceiptsModal({ plotNo, ownerName, onClose }) {
  const { data, loading } = useApi("/admin/billing/payments", { search: plotNo, page_size: 100 });
  const rows = normalizeList(data).filter((p) => p.property === plotNo || !plotNo);
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <Modal
      open={!!plotNo}
      onClose={onClose}
      wide
      title={`Receipts · ${plotNo ?? ""}${ownerName ? ` · ${ownerName}` : ""}`}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Icon name="loader-circle" size={18} className="animate-spin" /> Loading receipts…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="receipt" title="No receipts yet" subtitle={`No payments have been recorded for ${plotNo}.`} />
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
            <span className="text-sm text-brand-700">{rows.length} receipt{rows.length > 1 ? "s" : ""}</span>
            <span className="text-sm font-semibold text-brand-800">{formatINR(total)} paid</span>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Receipt no.</Th>
                <Th>Date</Th>
                <Th>Paid for</Th>
                <Th>Mode</Th>
                <Th>Reference</Th>
                <Th className="text-right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-slate-800">{r.receiptNumber || r.number || "—"}</Td>
                  <Td className="text-slate-500">{r.paidOn || "—"}</Td>
                  <Td>
                    <p className="text-slate-700">{r.purpose || r.planName || "Maintenance"}</p>
                    <p className="text-xs text-slate-400">
                      {[r.period, r.invoiceNumber].filter(Boolean).join(" · ") || (r.fy ? `FY ${r.fy}` : "—")}
                    </p>
                  </Td>
                  <Td><Badge tone="slate" className="uppercase">{r.mode || "—"}</Badge></Td>
                  <Td className="text-slate-500">{r.reference || "—"}</Td>
                  <Td className="text-right font-semibold text-slate-800">{formatINR(r.amount)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Modal>
  );
}
