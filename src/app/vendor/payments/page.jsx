"use client";

import { PageHeader, Card, Button, Badge, Table, Th, Td, Tr, StatCard, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR, formatDate, downloadCSV } from "@/lib/utils";

const PAY_TONE = { pending: "amber", approved: "sky", paid: "green" };

export default function VendorPaymentsPage() {
  const { data: raw } = useApi("/vendor/payments");
  const jobs = normalizeList(raw);
  const totalEarned = jobs.reduce((s, j) => s + (j.totalCost || 0), 0);
  const paid = jobs.filter((j) => j.paymentStatus === "paid").reduce((s, j) => s + (j.totalCost || 0), 0);

  const exportCsv = () => downloadCSV("vendor-statement.csv", jobs, [
    { label: "Work order", get: (j) => j.code }, { label: "Job", get: (j) => j.subject },
    { label: "Completed", get: (j) => j.created }, { label: "Labour", get: (j) => j.labourCost },
    { label: "Materials", get: (j) => j.materialsCost }, { label: "Total", get: (j) => j.totalCost },
    { label: "Payment", get: (j) => j.paymentStatus },
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Payments" subtitle="Your completed jobs and their payment status"
        actions={<Button variant="secondary" icon="download" onClick={exportCsv} disabled={jobs.length === 0}>Statement (CSV)</Button>} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Completed jobs" value={`${jobs.length}`} icon="circle-check" tone="brand" />
        <StatCard label="Total billed" value={formatINR(totalEarned, { compact: true })} icon="indian-rupee" tone="sky" />
        <StatCard label="Paid" value={formatINR(paid, { compact: true })} icon="banknote" tone="green" />
      </div>

      <Card>
        {jobs.length === 0 ? (
          <EmptyState icon="banknote" title="No completed jobs yet" subtitle="Completed work orders and their payment status appear here." />
        ) : (
          <Table>
            <thead><tr><Th>Work order</Th><Th className="text-right">Labour</Th><Th className="text-right">Materials</Th><Th className="text-right">Total</Th><Th>Payment</Th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <Tr key={j.dbId}>
                  <Td><p className="font-medium text-slate-800">{j.subject}</p><p className="text-xs text-slate-400">{j.code} · {formatDate(j.created)}</p></Td>
                  <Td className="text-right text-slate-600">{formatINR(j.labourCost || 0)}</Td>
                  <Td className="text-right text-slate-600">{formatINR(j.materialsCost || 0)}</Td>
                  <Td className="text-right font-semibold text-slate-800">{formatINR(j.totalCost || 0)}</Td>
                  <Td><Badge tone={PAY_TONE[j.paymentStatus] ?? "slate"}>{j.paymentStatus || "pending"}</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Icon name="info" size={12} /> Payment status is set by the association. This is a read-only view.</p>
    </div>
  );
}
