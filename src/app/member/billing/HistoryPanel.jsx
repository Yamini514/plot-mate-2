"use client";

import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  StatCard,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR, formatDate } from "@/lib/utils";

export function HistoryPanel() {
  const { data: raw } = useApi("/member/payments");
  const memberPayments = normalizeList(raw).map((p) => ({ ...p, date: p.paidOn, type: p.purpose || p.planName || "Maintenance" }));
  const { data: billing } = useApi("/member/billing");
  const dues = billing?.summary?.totalDue ?? 0;
  const totalPaid = memberPayments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payment History"
        subtitle="All transactions for your plot"
        actions={<Button variant="secondary" icon="download">Download statement</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total paid (lifetime)" value={formatINR(totalPaid)} icon="banknote" tone="brand" />
        <StatCard label="Transactions" value={`${memberPayments.length}`} icon="receipt" tone="sky" />
        <StatCard
          label="Current dues"
          value={dues > 0 ? formatINR(dues) : "₹0"}
          icon="wallet"
          tone={dues > 0 ? "amber" : "brand"}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="Transactions" icon="history" />
        <Table>
          <thead>
            <tr>
              <Th>Receipt</Th>
              <Th>Date</Th>
              <Th>Paid for</Th>
              <Th>Mode</Th>
              <Th>Reference</Th>
              <Th>FY</Th>
              <Th className="text-right">Amount</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {memberPayments.map((p) => (
              <Tr key={p.id}>
                <Td className="font-mono text-xs text-slate-500">{p.id}</Td>
                <Td className="text-slate-500">{formatDate(p.date)}</Td>
                <Td className="capitalize">
                  <Badge tone="slate">{p.type}</Badge>
                  {p.verificationStatus === "pending" && <Badge tone="amber" className="ml-1.5">pending</Badge>}
                  {p.verificationStatus === "rejected" && <Badge tone="rose" className="ml-1.5">rejected</Badge>}
                </Td>
                <Td className="uppercase text-slate-500">{p.mode}</Td>
                <Td className="font-mono text-xs text-slate-500">{p.reference}</Td>
                <Td className="text-slate-500">{p.fy}</Td>
                <Td className="text-right font-semibold text-brand-700">
                  {formatINR(p.amount)}
                </Td>
                <Td>
                  <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                    <Icon name="download" size={15} />
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
