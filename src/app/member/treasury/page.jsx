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
import { CollectionTrendChart, CategoryBarChart } from "@/components/charts";
import {
  stats,
  expenses,
  expenseByCategory,
  monthlyTrend,
  association,
} from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";

export default function MemberTreasuryPage() {
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Treasury"
        subtitle={`Association finances · FY ${association.fy}`}
      />

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        <Icon name="eye" size={16} />
        Full financial transparency — every owner can see how funds are collected and spent.
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Current balance" value={formatINR(stats.treasuryBalance)} icon="wallet" tone="brand" />
        <StatCard label="Collected" value={formatINR(stats.collected)} icon="trending-up" tone="sky" />
        <StatCard label="Spent" value={formatINR(totalExpenses)} icon="trending-down" tone="amber" />
        <StatCard label="Collection rate" value={`${stats.collectionRate}%`} icon="target" tone="violet" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Collections vs expenses" icon="bar-chart-3" />
          <div className="p-4">
            <CollectionTrendChart data={monthlyTrend} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Where money goes" icon="pie-chart" />
          <div className="p-4">
            <CategoryBarChart data={expenseByCategory} />
          </div>
        </Card>
      </div>

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
            {expenses.map((e) => (
              <Tr key={e.id}>
                <Td className="text-slate-500">{formatDate(e.date)}</Td>
                <Td className="font-medium text-slate-800">{e.description}</Td>
                <Td>
                  <Badge tone="slate">{e.category}</Badge>
                </Td>
                <Td className="text-slate-500">{e.vendor}</Td>
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
