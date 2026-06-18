"use client";

import { useState } from "react";
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
  Drawer,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CategoryBarChart, CollectionTrendChart } from "@/components/charts";
import { useSettings } from "@/lib/useSettings";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate, downloadCSV } from "@/lib/utils";

const CATEGORIES = [
  "Road work", "Street lights", "Compound wall", "Plantation",
  "Salaries", "Drainage", "Security", "Water", "Other",
];
const emptyExpense = { date: "", amount: "", category: "Road work", vendor: "", description: "", notes: "" };

function exportExpenses(expenses) {
  downloadCSV("plotmate-treasury-expenses.csv", expenses, [
    { label: "Date", get: (e) => e.date },
    { label: "Description", get: (e) => e.description },
    { label: "Category", get: (e) => e.category },
    { label: "Vendor", get: (e) => e.vendor },
    { label: "Amount", get: (e) => e.amount },
    { label: "Notes", get: (e) => e.notes },
  ]);
}

export default function TreasuryPage() {
  const { settings } = useSettings();
  const { data: raw, reload } = useApi("/admin/treasury/expenses");
  const { data: rep } = useApi("/admin/reports/overview");
  const { data: ps } = useApi("/admin/plots/summary");
  const expenses = normalizeList(raw);
  // Live treasury/collection figures — all zero on a fresh DB.
  const stats = {
    treasuryBalance: rep?.treasury?.balance ?? 0,
    collected: rep?.collection?.collected ?? 0,
    target: rep?.collection?.billed ?? 0,
    outstanding: rep?.collection?.outstanding ?? 0,
    pendingCount: ps?.pendingCount ?? 0,
  };
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyExpense);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewing, setViewing] = useState(null); // expense shown in the side panel
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyExpense);
    setAddOpen(true);
  };
  const openEdit = (e) => {
    setEditing(e);
    setForm({
      date: e.date ? String(e.date).slice(0, 10) : "",
      amount: e.amount ?? "",
      category: e.category ?? "Road work",
      vendor: e.vendor && e.vendor !== "—" ? e.vendor : "",
      description: e.description ?? "",
      notes: e.notes ?? "",
    });
    setAddOpen(true);
  };

  const expenseByCategory = (() => {
    const map = new Map();
    for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + (e.amount || 0));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  const saveExpense = async () => {
    const amount = Number(form.amount) || 0;
    if (!form.description.trim() || amount <= 0) {
      toast("Enter a description and amount", "error");
      return;
    }
    const payload = {
      date: form.date || undefined,
      description: form.description.trim(),
      category: form.category,
      vendor: form.vendor.trim() || "—",
      amount,
      notes: form.notes.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/treasury/expenses/${editing.dbId}`, payload);
        toast(`Expense updated · ${formatINR(amount)}`);
      } else {
        await api.post("/admin/treasury/expenses", payload);
        toast(`Expense of ${formatINR(amount)} added`);
      }
      setForm(emptyExpense);
      setEditing(null);
      setAddOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not save expense", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/treasury/expenses/${confirmDelete.dbId}`);
      toast("Expense deleted");
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete expense", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Treasury"
        subtitle={`Income, expenses and balance · FY ${settings.fy}`}
        actions={
          <>
            <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <option>FY 2024–25</option>
              <option>FY 2023–24</option>
              <option>FY 2022–23</option>
            </select>
            <Button variant="secondary" icon="download" onClick={() => { exportExpenses(expenses); toast(`Exported ${expenses.length} expenses (CSV)`); }}>
              Export report
            </Button>
            <Button icon="plus" onClick={openCreate}>
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
            <CollectionTrendChart data={rep?.collectionTrend ?? []} />
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
            <Button size="sm" variant="ghost" icon="plus" onClick={openCreate}>
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
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <Tr key={e.id} onClick={() => setViewing(e)}>
                <Td className="text-slate-500">{formatDate(e.date)}</Td>
                <Td className="font-medium text-slate-800">{e.description}</Td>
                <Td>
                  <Badge tone="slate">{e.category}</Badge>
                </Td>
                <Td className="text-slate-500">{e.vendor}</Td>
                <Td className="text-right font-semibold text-rose-600">
                  −{formatINR(e.amount)}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      onClick={() => openEdit(e)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                      title="Edit"
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(e)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete"
                    >
                      <Icon name="trash-2" size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? "Edit expense" : "Add expense"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveExpense} loading={saving}>{editing ? "Save changes" : "Save expense"}</Button>
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

      {/* Expense detail — full record in a side panel */}
      <Drawer
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.description ?? "Expense"}
        subtitle={viewing ? `${viewing.code ?? "Expense"} · ${formatDate(viewing.date)}` : ""}
        footer={
          viewing && (
            <>
              <Button
                variant="ghost"
                icon="trash-2"
                className="text-rose-600 hover:bg-rose-50"
                onClick={() => { setConfirmDelete(viewing); setViewing(null); }}
              >
                Delete
              </Button>
              <Button icon="pencil" onClick={() => { openEdit(viewing); setViewing(null); }}>
                Edit expense
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-rose-50 p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-rose-500">Amount paid out</p>
              <p className="mt-1 text-3xl font-bold text-rose-600">−{formatINR(viewing.amount)}</p>
              <Badge tone="slate" className="mt-2">{viewing.category}</Badge>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <DetailRow label="Date" value={formatDate(viewing.date)} icon="calendar" />
              <DetailRow label="Category" value={viewing.category} icon="tag" />
              <DetailRow label="Vendor" value={viewing.vendor && viewing.vendor !== "—" ? viewing.vendor : "Not specified"} icon="store" />
              <DetailRow label="Reference" value={viewing.code ?? "—"} icon="hash" />
              <DetailRow label="Amount" value={formatINR(viewing.amount)} icon="indian-rupee" />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{viewing.description || "—"}</p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {viewing.notes?.trim() ? viewing.notes : <span className="text-slate-400">No additional notes.</span>}
              </p>
            </div>

            <p className="flex items-start gap-1.5 text-xs text-slate-400">
              <Icon name="info" size={13} className="mt-0.5 shrink-0" />
              This expense posts a matching debit to the treasury ledger, so the balance always reconciles.
            </p>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete expense"
        message={`Delete "${confirmDelete?.description}" (${confirmDelete ? formatINR(confirmDelete.amount) : ""})? The matching treasury ledger entry is also reversed.`}
      />
    </div>
  );
}

function DetailRow({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-sm last:border-0">
      <span className="flex items-center gap-2 text-slate-500">
        {icon && <Icon name={icon} size={14} className="text-slate-400" />}
        {label}
      </span>
      <span className="font-medium text-slate-700">{value ?? "—"}</span>
    </div>
  );
}
