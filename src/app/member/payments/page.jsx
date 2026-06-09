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
import { memberPayments, getMemberOwner } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";

export default function MemberPaymentsPage() {
  const me = getMemberOwner();
  const totalPaid = memberPayments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payment History"
        subtitle={`All transactions for Plot ${me.plotNo}`}
        actions={<Button variant="secondary" icon="download">Download statement</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total paid (lifetime)" value={formatINR(totalPaid)} icon="banknote" tone="brand" />
        <StatCard label="Transactions" value={`${memberPayments.length}`} icon="receipt" tone="sky" />
        <StatCard
          label="Current dues"
          value={me.amountDue > 0 ? formatINR(me.amountDue) : "₹0"}
          icon="wallet"
          tone={me.amountDue > 0 ? "amber" : "brand"}
        />
      </div>

      <Card className="mt-6">
        <CardHeader title="Transactions" icon="history" />
        <Table>
          <thead>
            <tr>
              <Th>Receipt</Th>
              <Th>Date</Th>
              <Th>Type</Th>
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
