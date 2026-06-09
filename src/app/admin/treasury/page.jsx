"use client";

import { useMemo, useState } from "react";
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
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { CategoryBarChart, CollectionTrendChart } from "@/components/charts";
import { monthlyTrend, stats, association } from "@/lib/mock-data";
import { useStore, newId } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";

const CATEGORIES = [
  "Road work", "Street lights", "Compound wall", "Plantation",
  "Salaries", "Drainage", "Security", "Water", "Other",
];
const emptyExpense = { date: "", amount: "", category: "Road work", vendor: "", description: "", notes: "" };

export default function TreasuryPage() {
  const { expenses, addExpense } = useStore();
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyExpense);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const expenseByCategory = useMemo(() => {
    const map = new Map();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const saveExpense = () => {
    const amount = Number(form.amount) || 0;
    if (!form.description.trim() || amount <= 0) {
      toast("Enter a description and amount", "error");
      return;
    }
    addExpense({
      id: newId("EXP"),
      date: form.date || "2025-06-09",
      description: form.description.trim(),
      category: form.category,
      vendor: form.vendor.trim() || "—",
      amount,
      notes: form.notes.trim() || undefined,
    });
    toast(`Expense of ${formatINR(amount)} added`);
    setForm(emptyExpense);
    setAddOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Treasury"
        subtitle={`Income, expenses and balance · FY ${association.fy}`}
        actions={
          <>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <option>FY 2024–25</option>
              <option>FY 2023–24</option>
              <option>FY 2022–23</option>
            </select>
            <Button variant="secondary" icon="download" onClick={() => toast("Treasury report exported (PDF)")}>
              Export report
            </Button>
            <Button icon="plus" onClick={() => setAddOpen(true)}>
              Add expense
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current balance" value={formatINR(stats.treasuryBalance)} icon="wallet" tone="brand" />
        <StatCard label="Total collected" value={formatINR(stats.collected)} icon="trending-up" tone="sky" hint={`of ${formatINR(stats.target, { compact: true })} target`} />
        <StatCard label="Total expenses" value={formatINR(totalExpenses)} icon="trending-down" tone="amber" />
        <StatCard label="Outstanding" value={formatINR(stats.outstanding)} icon="triangle-alert" tone="rose" hint={`${stats.pendingCount} plots`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Cash flow" subtitle="Collections vs expenses" icon="bar-chart-3" />
          <div className="p-4">
            <CollectionTrendChart data={monthlyTrend} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Expenses by category" icon="pie-chart" />
          <div className="p-4">
            <CategoryBarChart data={expenseByCategory} />
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Expense history"
          subtitle={`${expenses.length} entries`}
          icon="receipt"
          action={
            <Button size="sm" variant="ghost" icon="plus" onClick={() => setAddOpen(true)}>
              Add
            </Button>
          }
        />
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

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add expense"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveExpense}>Save expense</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Amount (₹)">
            <input type="number" className={inputClass} placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <input className={inputClass} placeholder="Vendor name" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <input className={inputClass} placeholder="What was this for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Notes (optional)">
              <textarea rows={2} className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
