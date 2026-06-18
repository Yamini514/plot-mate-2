"use client";

import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  StatCard,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CategoryBarChart } from "@/components/charts";
import { useApi } from "@/lib/useApi";
import { useSettings } from "@/lib/useSettings";
import { formatINR, formatDate } from "@/lib/utils";

export default function MemberTreasuryPage() {
  const { settings } = useSettings();
  // All figures derived from the live community treasury — zero/empty on a fresh DB.
  const { data: t } = useApi("/member/treasury");
  const balance = t?.summary?.balance ?? 0;
  const income = t?.summary?.income ?? 0;
  const totalExpenses = t?.summary?.expense ?? 0;
  const transactions = t?.transactions ?? [];
  const expenseTxns = transactions.filter((tx) => tx.direction === "debit");
  const expenseByCategory = (() => {
    const map = new Map();
    for (const e of expenseTxns) map.set(e.category ?? "Other", (map.get(e.category ?? "Other") ?? 0) + (e.amount || 0));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Treasury"
        subtitle={`Association finances · FY ${settings.fy}`}
      />

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        <Icon name="eye" size={16} />
        Full financial transparency — every owner can see how funds are collected and spent.
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current balance" value={formatINR(balance)} icon="wallet" tone="brand" />
        <StatCard label="Collected" value={formatINR(income)} icon="trending-up" tone="sky" />
        <StatCard label="Spent" value={formatINR(totalExpenses)} icon="trending-down" tone="amber" />
        <StatCard label="Transactions" value={transactions.length} icon="receipt" tone="violet" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Where money goes" icon="pie-chart" />
        <div className="p-4">
          {expenseByCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No expenses recorded yet.</p>
          ) : (
            <CategoryBarChart data={expenseByCategory} />
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Recent expenses" icon="receipt" />
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Category</Th>
              <Th>Vendor</Th>
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {expenseTxns.length === 0 ? (
              <Tr>
                <Td colSpan={5} className="py-8 text-center text-sm text-slate-400">No expenses recorded yet.</Td>
              </Tr>
            ) : expenseTxns.map((e) => (
              <Tr key={e.id}>
                <Td className="text-slate-500">{formatDate(e.occurredOn)}</Td>
                <Td className="font-medium text-slate-800">{e.note ?? e.reference ?? "—"}</Td>
                <Td>
                  <Badge tone="slate">{e.category ?? "Other"}</Badge>
                </Td>
                <Td className="text-slate-500">—</Td>
                <Td className="text-right font-semibold text-rose-600">
                  −{formatINR(e.amount)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
