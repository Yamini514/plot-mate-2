"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  Table,
  Th,
  Td,
  Tr,
  Segmented,
  Avatar,
  Modal,
  Field,
  inputClass,
  PasswordInput,
  EmptyState,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { ReceiptsModal } from "@/components/ReceiptsModal";
import { SendReminderModal } from "@/components/SendReminderModal";
import { PaymentSlipModal } from "@/components/PaymentSlip";
import { useSettings } from "@/lib/useSettings";
import { OwnersImportModal } from "./OwnersImportModal";
import { formatINR, formatDate, validateAccount, downloadCSV } from "@/lib/utils";

// ₹ per sq.yd used for the optional maintenance-due preview (matches the
// backend Plot model rate).
const RATE_PER_SQYD = 30;

const emptyForm = {
  plotNo: "", sizeSqyd: "", name: "", phone: "", email: "", phase: "Phase 1",
  applyDues: false,
  createLogin: false, password: "", confirmPassword: "",
};

export default function OwnersPage() {
  const toast = useToast();
  const { settings } = useSettings();
  // Live data from the backend (admin sees every plot in the association).
  const { data: plots, reload } = useApi("/admin/plots", { page_size: 300 });
  const { data: stats } = useApi("/admin/plots/summary");
  // Backend exposes owner_name -> ownerName; the table uses `name`.
  const allOwners = (plots ?? []).map((p) => ({ ...p, name: p.ownerName }));

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [receiptsFor, setReceiptsFor] = useState(null); // { plotNo, name }
  const [remindFor, setRemindFor] = useState(null); // owner the reminder dialog targets
  const [sendingReminder, setSendingReminder] = useState(false);
  const [billFor, setBillFor] = useState(null); // owner the sample bill is generated for

  // Plot numbers already on file — lets the importer flag rows as new vs. update.
  const existingPlotNos = useMemo(
    () => new Set(allOwners.map((o) => o.plotNo).filter(Boolean)),
    [allOwners],
  );

  const saveOwner = async () => {
    if (!form.plotNo.trim()) {
      toast("Plot number is required", "error");
      return;
    }
    // If granting app access, validate credentials before creating anything.
    if (form.createLogin) {
      const err = validateAccount({ email: form.email, password: form.password, confirm: form.confirmPassword });
      if (err) { toast(err, "error"); return; }
    }
    setSaving(true);
    try {
      // 1) Create the plot record in the registry.
      await api.post("/admin/plots", {
        plotNo: form.plotNo.trim(),
        ownerName: form.name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        sizeSqyd: Number(form.sizeSqyd) || 0,
        phase: form.phase,
        paymentStatus: "pending",
        // Dues are only billed when the admin opts in — otherwise the plot
        // starts with a zero balance.
        applyDues: form.applyDues,
      });
      // 2) Optionally create a secure member login linked to this plot.
      if (form.createLogin) {
        await api.post("/admin/users", {
          fullName: form.name.trim() || `Owner ${form.plotNo.trim()}`,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: 0, // member
          phoneNumber: form.phone.trim() || null,
          active: true,
          extras: { plot_no: form.plotNo.trim(), title: "Plot Owner" },
        });
      }
      toast(form.createLogin ? `Plot ${form.plotNo.trim()} added with member login` : `Plot ${form.plotNo.trim()} added`);
      setForm(emptyForm);
      setAddOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not add owner", "error");
    } finally {
      setSaving(false);
    }
  };

  // Fire a reminder for one owner over each chosen channel. Each channel is a
  // real reminder record so it shows up in the reminder log / history.
  const sendReminder = async (channels) => {
    if (!remindFor) return;
    setSendingReminder(true);
    try {
      await Promise.all(
        channels.map((channel) =>
          api.post("/admin/reminders", {
            plotNo: remindFor.plotNo,
            ownerName: remindFor.name,
            amount: remindFor.amountDue,
            channel,
            status: "sent",
          }),
        ),
      );
      const via = channels.length > 1 ? `${channels.length} channels` : channels[0];
      toast(`Reminder sent to ${remindFor.name ?? remindFor.plotNo} via ${via}`);
      setRemindFor(null);
      setSelected(null);
    } catch (e) {
      toast(e.message || "Could not send reminder", "error");
    } finally {
      setSendingReminder(false);
    }
  };

  // Synthesize a printable "sample bill" for a plot from its maintenance dues —
  // the same slip the owner sees, with the full charges/funds breakdown. It has
  // no dbId, so the slip renders read-only (no payment recording).
  const sampleInvoice = useMemo(() => {
    if (!billFor) return null;
    const rate = Number(settings.ratePerSqyd) || RATE_PER_SQYD;
    const base = (Number(billFor.sizeSqyd) || 0) * rate;
    const due = Number(billFor.amountDue) || 0;
    const amount = base > 0 ? base : due;
    const balance = due > 0 ? due : base;
    return {
      number: `SAMPLE-${billFor.plotNo}`,
      ownerName: billFor.name || `Owner ${billFor.plotNo}`,
      property: billFor.plotNo,
      propertyType: billFor.phase,
      planName: "Maintenance",
      period: settings.fy ? `FY ${settings.fy}` : "",
      amount,
      lateFee: 0,
      tax: 0,
      discount: 0,
      paid: amount > balance ? amount - balance : 0,
      balance,
      issuedOn: new Date().toISOString().slice(0, 10),
      dueDate: settings.dueDate || "",
      status: balance > 0 ? "generated" : "paid",
    };
  }, [billFor, settings.ratePerSqyd, settings.fy, settings.dueDate]);

  const filtered = useMemo(() => {
    return allOwners.filter((o) => {
      if (filter !== "all" && o.paymentStatus !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          o.plotNo.toLowerCase().includes(q) ||
          (o.name?.toLowerCase().includes(q) ?? false) ||
          (o.phone?.includes(q) ?? false)
        );
      }
      return true;
    });
  }, [filter, query, allOwners]);

  const [visible, setVisible] = useState(40);
  const shown = filtered.slice(0, visible);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Plot Owners"
        subtitle={`Registry of all ${stats?.totalPlots ?? allOwners.length} plots`}
        actions={
          <>
            <Button variant="secondary" icon="upload" size="md" onClick={() => setImportOpen(true)}>
              Import
            </Button>
            <Button variant="secondary" icon="download" size="md" onClick={() => {
              downloadCSV("plotmate-owners.csv", filtered, [
                { label: "Plot", get: (o) => o.plotNo },
                { label: "Owner", get: (o) => o.name },
                { label: "Phone", get: (o) => o.phone },
                { label: "Email", get: (o) => o.email },
                { label: "Size (sqyd)", get: (o) => o.sizeSqyd },
                { label: "Phase", get: (o) => o.phase },
                { label: "Membership", get: (o) => o.membership },
                { label: "Amount due", get: (o) => o.amountDue },
                { label: "Payment status", get: (o) => o.paymentStatus },
              ]);
              toast(`Exported ${filtered.length} owners to CSV`);
            }}>
              Export
            </Button>
            <Button icon="user-plus" onClick={() => setAddOpen(true)}>
              Add owner
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total plots" value={`${stats?.totalPlots ?? "—"}`} icon="map-pinned" tone="violet" />
        <StatCard label="Paid" value={`${stats?.paidCount ?? 0}`} icon="circle-check-big" tone="brand" />
        <StatCard label="Pending" value={`${stats?.pendingCount ?? 0}`} icon="clock" tone="amber" />
        <StatCard label="Unknown contact" value={`${stats?.unknownCount ?? 0}`} icon="user-x" tone="slate" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setVisible(40);
            }}
            options={[
              { value: "all", label: "All", count: allOwners.length },
              { value: "paid", label: "Paid", count: stats?.paidCount ?? 0 },
              { value: "pending", label: "Pending", count: stats?.pendingCount ?? 0 },
              { value: "unknown", label: "Unknown", count: stats?.unknownCount ?? 0 },
            ]}
          />
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 sm:w-72">
            <Icon name="search" size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(40);
              }}
              placeholder="Search plot, owner or phone…"
              className="h-10 w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon="search-x" title="No owners match your filters" subtitle="Try a different search or status." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Plot</Th>
                <Th>Owner</Th>
                <Th>Contact</Th>
                <Th>Size</Th>
                <Th>Membership</Th>
                <Th className="text-right">Amount due</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <Tr key={o.id} onClick={() => setSelected(o)}>
                  <Td className="font-semibold text-slate-800">{o.plotNo}</Td>
                  <Td>
                    {o.name ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={o.name} size={28} />
                        <span>{o.name}</span>
                      </div>
                    ) : (
                      <span className="italic text-slate-400">Not registered</span>
                    )}
                  </Td>
                  <Td className="text-slate-500">{o.phone ?? "—"}</Td>
                  <Td>{o.sizeSqyd} sqyd</Td>
                  <Td>
                    <StatusBadge status={o.membership} />
                  </Td>
                  <Td className="text-right font-medium">
                    {o.amountDue > 0 ? formatINR(o.amountDue) : "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={o.paymentStatus} />
                  </Td>
                  <Td>
                    <Icon name="chevron-right" size={16} className="text-slate-300" />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}

        {visible < filtered.length && (
          <div className="border-t border-slate-100 p-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + 40)}>
              Load more ({filtered.length - visible} remaining)
            </Button>
          </div>
        )}
      </Card>

      {/* Owner detail drawer */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Plot ${selected?.plotNo}`}
        wide
        footer={
          <>
            <Button variant="secondary" icon="receipt" onClick={() => setReceiptsFor({ plotNo: selected?.plotNo, name: selected?.name })}>
              View receipts
            </Button>
            <Button variant="secondary" icon="receipt-indian-rupee" onClick={() => setBillFor(selected)}>
              Generate bill
            </Button>
            <Button icon="send" onClick={() => setRemindFor(selected)}>
              Send reminder
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar name={selected.name ?? "NA"} size={48} />
              <div>
                <p className="text-base font-semibold text-slate-800">
                  {selected.name ?? "Not registered"}
                </p>
                <p className="text-sm text-slate-500">
                  {selected.phase} · {selected.sizeSqyd} sqyd
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <StatusBadge status={selected.paymentStatus} />
                <StatusBadge status={selected.membership} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
              <Detail label="Phone" value={selected.phone ?? "—"} />
              <Detail label="Email" value={selected.email ?? "—"} />
              <Detail label="Amount due" value={selected.amountDue > 0 ? formatINR(selected.amountDue) : "Cleared"} />
              <Detail
                label="Last payment"
                value={selected.lastPaymentDate ? formatDate(selected.lastPaymentDate) : "—"}
              />
              {selected.daysOverdue > 0 && (
                <Detail label="Overdue by" value={`${selected.daysOverdue} days`} />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add owner */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add plot owner"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOwner} loading={saving}>Save owner</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plot number">
            <input className={inputClass} placeholder="P-281" value={form.plotNo} onChange={(e) => setForm({ ...form, plotNo: e.target.value })} />
          </Field>
          <Field label="Size (sqyd)">
            <input type="number" className={inputClass} placeholder="200" value={form.sizeSqyd} onChange={(e) => setForm({ ...form, sizeSqyd: e.target.value })} />
          </Field>
          <Field label="Owner name">
            <input className={inputClass} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className={inputClass} placeholder="+91 …" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className={inputClass} placeholder="name@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phase">
            <select className={inputClass} value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
              <option>Phase 1</option>
              <option>Phase 2</option>
              <option>Phase 3</option>
            </select>
          </Field>
        </div>
        {/* App access (optional) */}
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={form.createLogin}
              onChange={(e) => setForm({ ...form, createLogin: e.target.checked })}
            />
            Create an app login for this owner (member access)
          </label>
          {form.createLogin && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs text-slate-400">
                The owner signs in with the <b>email above</b>. Set a temporary password (min 8 chars) — it is securely hashed.
              </p>
              <Field label="Password">
                <PasswordInput placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              <Field label="Confirm password">
                <PasswordInput placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              </Field>
            </div>
          )}
        </div>
      </Modal>

      {receiptsFor && (
        <ReceiptsModal plotNo={receiptsFor.plotNo} ownerName={receiptsFor.name} onClose={() => setReceiptsFor(null)} />
      )}

      <SendReminderModal
        open={!!remindFor}
        onClose={() => setRemindFor(null)}
        onConfirm={sendReminder}
        sending={sendingReminder}
        title="Send payment reminder"
        recipientLabel={remindFor ? `${remindFor.name ?? "Plot " + remindFor.plotNo} · ${remindFor.plotNo}` : ""}
        amountLabel={remindFor?.amountDue > 0 ? `${formatINR(remindFor.amountDue)} due` : null}
      />

      {/* Sample bill / payment slip for a plot owner */}
      <PaymentSlipModal
        open={!!billFor}
        onClose={() => setBillFor(null)}
        invoice={sampleInvoice}
        role="admin"
      />

      {importOpen && (
        <OwnersImportModal
          existingPlotNos={existingPlotNos}
          onClose={() => setImportOpen(false)}
          onDone={reload}
        />
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}
