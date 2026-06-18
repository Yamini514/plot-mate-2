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
import { ShareModal } from "@/components/ShareModal";
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

// Where added funds come from. "Other" reveals a manual category field.
const INCOME_CATEGORIES = [
  "Maintenance collection", "Donation", "Grant / Sponsorship",
  "Interest", "Opening balance", "Other",
];
const emptyFund = { date: "", amount: "", category: "Maintenance collection", customCategory: "", reference: "", note: "" };

// Friendly labels + tone for ledger categories coming back from the backend.
const INCOME_KEYS = { maintenance: "Maintenance", other_income: "Other income" };

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
  // Full treasury ledger — money in (credits) and out (debits), newest first.
  const { data: ledgerRaw, meta: ledgerMeta, reload: reloadLedger } = useApi("/admin/treasury/transactions", { page_size: 12 });
  const ledger = normalizeList(ledgerRaw);
  const ledgerBalance = ledgerMeta?.balance ?? { income: 0, expense: 0, net: 0 };
  const expenses = normalizeList(raw);
  // Live treasury/collection figures — all zero on a fresh DB.
  const stats = {
    treasuryBalance: rep?.treasury?.balance ?? ledgerBalance.net ?? 0,
    income: ledgerBalance.income ?? 0,
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
  const [fundsOpen, setFundsOpen] = useState(false);
  const [fundForm, setFundForm] = useState(emptyFund);
  const [savingFunds, setSavingFunds] = useState(false);
  const [confirmTxn, setConfirmTxn] = useState(null); // manual ledger entry to reverse
  const [deletingTxn, setDeletingTxn] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const addFunds = async () => {
    const amount = Number(fundForm.amount) || 0;
    const category = fundForm.category === "Other" ? fundForm.customCategory.trim() : fundForm.category;
    if (amount <= 0) { toast("Enter an amount greater than zero", "error"); return; }
    if (fundForm.category === "Other" && !category) { toast("Enter the fund category", "error"); return; }
    setSavingFunds(true);
    try {
      await api.post("/admin/treasury/funds", {
        amount,
        category,
        reference: fundForm.reference.trim() || undefined,
        note: fundForm.note.trim() || undefined,
        occurredOn: fundForm.date || undefined,
      });
      toast(`${formatINR(amount)} added to the treasury`);
      setFundForm(emptyFund);
      setFundsOpen(false);
      reloadLedger();
    } catch (e) {
      toast(e.message || "Could not add funds", "error");
    } finally {
      setSavingFunds(false);
    }
  };

  const removeTxn = async () => {
    if (!confirmTxn) return;
    setDeletingTxn(true);
    try {
      await api.del(`/admin/treasury/transactions/${confirmTxn.dbId}`);
      toast("Ledger entry reversed");
      setConfirmTxn(null);
      reloadLedger();
    } catch (e) {
      toast(e.message || "Could not reverse entry", "error");
    } finally {
      setDeletingTxn(false);
    }
  };

  // Plain-text fund summary the admin can share with owners for transparency.
  const fundSummary = [
    `${settings.name} — Treasury summary (FY ${settings.fy})`,
    `Funds in: ${formatINR(stats.income)}`,
    `Funds out (expenses): ${formatINR(totalExpenses)}`,
    `Current balance: ${formatINR(stats.treasuryBalance)}`,
    settings.ratePerSqyd ? `Maintenance rate: ₹${settings.ratePerSqyd}/sqyd/year` : "",
    stats.outstanding > 0 ? `Outstanding dues: ${formatINR(stats.outstanding)} (${stats.pendingCount} plots)` : "",
  ].filter(Boolean).join("\n");

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
            <Button variant="secondary" icon="share-2" onClick={() => setShareOpen(true)}>
              Share summary
            </Button>
            <Button variant="secondary" icon="download" onClick={() => { exportExpenses(expenses); toast(`Exported ${expenses.length} expenses (CSV)`); }}>
              Export
            </Button>
            <Button variant="secondary" icon="trending-up" onClick={() => { setFundForm(emptyFund); setFundsOpen(true); }}>
              Add funds
            </Button>
            <Button icon="plus" onClick={openCreate}>
              Add expense
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current balance" value={formatINR(stats.treasuryBalance)} icon="wallet" tone="brand" hint="Funds in − funds out" />
        <StatCard label="Funds in" value={formatINR(stats.income)} icon="trending-up" tone="sky" hint={`${formatINR(stats.collected, { compact: true })} from maintenance`} />
        <StatCard label="Funds out" value={formatINR(totalExpenses)} icon="trending-down" tone="amber" hint={`${expenses.length} expense${expenses.length === 1 ? "" : "s"}`} />
        <StatCard label="Outstanding dues" value={formatINR(stats.outstanding)} icon="triangle-alert" tone="rose" hint={`${stats.pendingCount} plots pending`} />
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

      {/* Fund flow — the full money circle: what comes in, what goes out */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Treasury ledger"
            subtitle="Every rupee in and out — maintenance, funds added, expenses"
            icon="arrow-left-right"
            action={
              <Button size="sm" variant="ghost" icon="trending-up" onClick={() => { setFundForm(emptyFund); setFundsOpen(true); }}>
                Add funds
              </Button>
            }
          />
          {ledger.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No ledger entries yet. Record a payment, add funds, or log an expense.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ledger.map((t) => {
                const credit = t.direction === "credit";
                const manual = !t.paymentId && !t.invoiceId;
                const label = INCOME_KEYS[t.category] ?? t.category ?? (credit ? "Income" : "Expense");
                return (
                  <div key={t.id} className="group flex items-center gap-3 px-5 py-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${credit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      <Icon name={credit ? "arrow-down-left" : "arrow-up-right"} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {t.note || label}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        <span className="capitalize">{label}</span> · {t.reference || "—"} · {formatDate(t.occurredOn)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${credit ? "text-emerald-600" : "text-rose-600"}`}>
                      {credit ? "+" : "−"}{formatINR(t.amount)}
                    </span>
                    {manual ? (
                      <button
                        onClick={() => setConfirmTxn(t)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                        title="Reverse this manual entry"
                      >
                        <Icon name="undo-2" size={15} />
                      </button>
                    ) : (
                      <span className="w-8 shrink-0" title="Posted by billing — managed in Billing">
                        <Icon name="lock" size={13} className="mx-auto text-slate-200" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* How funds work + share */}
        <Card>
          <CardHeader title="How funds work" icon="info" />
          <div className="space-y-4 p-5 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-1.5 text-emerald-600"><Icon name="arrow-down-left" size={14} /> Funds in</span>
                <span className="font-semibold text-slate-800">{formatINR(stats.income)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-1.5 text-rose-600"><Icon name="arrow-up-right" size={14} /> Funds out</span>
                <span className="font-semibold text-slate-800">−{formatINR(totalExpenses)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-700">Balance</span>
                <span className="text-base font-bold text-brand-700">{formatINR(stats.treasuryBalance)}</span>
              </div>
            </div>
            <ul className="space-y-2">
              <li className="flex gap-2"><Icon name="indian-rupee" size={14} className="mt-0.5 shrink-0 text-slate-400" /> Maintenance is billed at <b>₹{settings.ratePerSqyd || "—"}/sqyd/year</b>; collections post here automatically when recorded.</li>
              <li className="flex gap-2"><Icon name="trending-up" size={14} className="mt-0.5 shrink-0 text-slate-400" /> Use <b>Add funds</b> for donations, interest, opening balance or cash collected outside billing.</li>
              <li className="flex gap-2"><Icon name="trending-down" size={14} className="mt-0.5 shrink-0 text-slate-400" /> Each expense posts a matching debit, so the balance always reconciles.</li>
              <li className="flex gap-2"><Icon name="users" size={14} className="mt-0.5 shrink-0 text-slate-400" /> Owners see this same summary on their <b>Treasury</b> page for full transparency.</li>
            </ul>
            <Button variant="secondary" icon="share-2" className="w-full" onClick={() => setShareOpen(true)}>
              Share fund summary
            </Button>
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

      {/* Add funds (manual income) */}
      <Modal
        open={fundsOpen}
        onClose={() => setFundsOpen(false)}
        title="Add funds"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFundsOpen(false)}>Cancel</Button>
            <Button icon="trending-up" loading={savingFunds} onClick={addFunds}>
              Add {formatINR(Number(fundForm.amount) || 0)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Records money received into the treasury (a credit). Maintenance paid through Billing posts automatically — use this for donations, interest, opening balance or cash collected outside billing.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" className={inputClass} value={fundForm.date} onChange={(e) => setFundForm({ ...fundForm, date: e.target.value })} />
            </Field>
            <Field label="Amount (₹)">
              <input type="number" min="0" className={inputClass} placeholder="0" value={fundForm.amount} onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })} />
            </Field>
            <Field label="Source / category">
              <select className={inputClass} value={fundForm.category} onChange={(e) => setFundForm({ ...fundForm, category: e.target.value })}>
                {INCOME_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            {fundForm.category === "Other" && (
              <Field label="Enter category">
                <input className={inputClass} placeholder="e.g. Scrap sale" value={fundForm.customCategory} onChange={(e) => setFundForm({ ...fundForm, customCategory: e.target.value })} />
              </Field>
            )}
            <Field label="Reference (optional)">
              <input className={inputClass} placeholder="UTR / receipt no." value={fundForm.reference} onChange={(e) => setFundForm({ ...fundForm, reference: e.target.value })} />
            </Field>
          </div>
          <Field label="Note (optional)">
            <input className={inputClass} placeholder="What is this for?" value={fundForm.note} onChange={(e) => setFundForm({ ...fundForm, note: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmTxn}
        onClose={() => setConfirmTxn(null)}
        onConfirm={removeTxn}
        loading={deletingTxn}
        title="Reverse ledger entry"
        confirmLabel="Reverse"
        message={`Reverse this ${confirmTxn?.direction === "credit" ? "fund" : "entry"} of ${confirmTxn ? formatINR(confirmTxn.amount) : ""}? This removes it from the treasury balance.`}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share fund summary"
        shareTitle={`${settings.name} — Treasury summary`}
        text={fundSummary}
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
