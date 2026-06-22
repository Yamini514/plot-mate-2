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
import { AvatarUpload } from "@/components/AvatarUpload";
import { formatINR, formatDate, validateAccount, validatePhone, digitsOnly, downloadCSV } from "@/lib/utils";

// ₹ per sq.yd used for the optional maintenance-due preview (matches the
// backend Plot model rate).
const RATE_PER_SQYD = 30;

const emptyForm = {
  plotNo: "", sizeSqyd: "", name: "", phone: "", email: "", phase: "Phase 1",
  applyDues: false,
  createLogin: false, password: "", confirmPassword: "", avatarUrl: "",
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
  const [editMode, setEditMode] = useState(false); // drawer edit toggle
  const [editForm, setEditForm] = useState(null); // editable plot fields
  const [savingEdit, setSavingEdit] = useState(false);
  const [applyingOne, setApplyingOne] = useState(false); // individual apply base pay
  const [applyOpen, setApplyOpen] = useState(false); // bulk apply dialog
  const [applyStatus, setApplyStatus] = useState("pending"); // which plots the bulk run targets
  const [applying, setApplying] = useState(false);

  // Base pay for a plot under the association's configured rule (no hardcoding).
  const basePayFor = (sizeSqyd) =>
    settings.basePayMode === "per_plot"
      ? Number(settings.basePayFlat) || 0
      : (Number(sizeSqyd) || 0) * (Number(settings.ratePerSqyd) || 0);
  const basePaySet =
    settings.basePayMode === "per_plot"
      ? (Number(settings.basePayFlat) || 0) > 0
      : (Number(settings.ratePerSqyd) || 0) > 0;

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
    // Validate optional contact details if provided, so a typo is caught here
    // rather than saved as bad data (and a login can't be created without them).
    const emailVal = form.email.trim();
    const phoneVal = form.phone.trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      toast("Enter a valid email address (or leave it blank).", "error");
      return;
    }
    const phoneErr = validatePhone(phoneVal);
    if (phoneErr) {
      toast(phoneErr, "error");
      return;
    }
    // If granting app access, validate credentials before creating anything.
    if (form.createLogin) {
      if (!emailVal) { toast("An email is required to create a member login.", "error"); return; }
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
          avatarUrl: form.avatarUrl || null,
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

  // Open the drawer in edit mode, seeding the form from the selected plot.
  const startEdit = () => {
    setEditForm({
      ownerName: selected.name ?? "",
      phone: selected.phone ?? "",
      email: selected.email ?? "",
      sizeSqyd: selected.sizeSqyd ?? "",
      phase: selected.phase ?? "Phase 1",
      paymentStatus: selected.paymentStatus ?? "pending",
    });
    setEditMode(true);
  };

  // Save plot edits; optionally (re)generate this plot's base pay in the same call.
  const saveEdit = async ({ applyDues = false } = {}) => {
    const phoneErr = validatePhone(editForm.phone);
    if (phoneErr) {
      toast(phoneErr, "error");
      return;
    }
    const setBusy = applyDues ? setApplyingOne : setSavingEdit;
    setBusy(true);
    try {
      const { data } = await api.put(`/admin/plots/${selected.id}`, {
        ownerName: editForm.ownerName.trim() || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        sizeSqyd: Number(editForm.sizeSqyd) || 0,
        phase: editForm.phase,
        paymentStatus: editForm.paymentStatus,
        applyDues,
      });
      setSelected({ ...selected, ...data, name: data.ownerName });
      setEditMode(false);
      toast(applyDues ? `Saved · base pay applied to ${selected.plotNo}` : `Plot ${selected.plotNo} updated`);
      reload();
    } catch (e) {
      toast(e.message || "Could not save plot", "error");
    } finally {
      setBusy(false);
    }
  };

  // Apply base pay to the selected plot without entering edit mode.
  const applyBasePayOne = async () => {
    if (!basePaySet) {
      toast("Set a base-pay rate under Settings → Fees & Dues first", "error");
      return;
    }
    setApplyingOne(true);
    try {
      const { data } = await api.put(`/admin/plots/${selected.id}`, { applyDues: true });
      setSelected({ ...selected, ...data, name: data.ownerName });
      toast(`Base pay applied to ${selected.plotNo} · ${formatINR(data.amountDue)}`);
      reload();
    } catch (e) {
      toast(e.message || "Could not apply base pay", "error");
    } finally {
      setApplyingOne(false);
    }
  };

  // Bulk (re)generate base pay across the chosen set of plots.
  const applyBasePayBulk = async () => {
    if (!basePaySet) {
      toast("Set a base-pay rate under Settings → Fees & Dues first", "error");
      return;
    }
    setApplying(true);
    try {
      const { data } = await api.post("/admin/plots/apply-base-pay", { status: applyStatus });
      toast(`Base pay applied to ${data.count} plot${data.count === 1 ? "" : "s"} · total ${formatINR(data.total)}`);
      setApplyOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not apply base pay", "error");
    } finally {
      setApplying(false);
    }
  };

  // Plots the bulk run will touch, for the dialog's live estimate.
  const bulkTargets = (allOwners ?? []).filter((o) => applyStatus === "all" || o.paymentStatus === applyStatus);
  const bulkEstimate = bulkTargets.reduce((sum, o) => sum + (o.paymentStatus === "paid" ? 0 : basePayFor(o.sizeSqyd)), 0);

  // Fire a reminder for one owner over each chosen channel. Each channel is a
  // real reminder record so it shows up in the reminder log / history.
  const sendReminder = async (channels) => {
    if (!remindFor) return;
    // Email needs an address — block early with a clear message.
    if (channels.includes("email") && !remindFor.email) {
      toast(`No email on file for ${remindFor.name ?? remindFor.plotNo}. Add one to email this owner.`, "error");
      return;
    }
    setSendingReminder(true);
    try {
      const results = await Promise.all(
        channels.map((channel) =>
          api.post("/admin/reminders", {
            plotNo: remindFor.plotNo,
            ownerName: remindFor.name,
            amount: remindFor.amountDue,
            channel,
            status: "sent",
            email: remindFor.email || undefined,
          }).then(({ data }) => ({ channel, delivery: data?.delivery })),
        ),
      );
      // Surface a real email-send failure (e.g. SMTP not configured) precisely.
      const emailRes = results.find((r) => r.channel === "email");
      if (emailRes?.delivery && emailRes.delivery.ok === false) {
        toast(`Logged, but email didn't send: ${emailRes.delivery.error || "check Settings → Email"}`, "error");
      } else {
        const via = channels.length > 1 ? `${channels.length} channels` : channels[0];
        const emailed = emailRes?.delivery?.sent ? ` · emailed ${emailRes.delivery.to}` : "";
        toast(`Reminder sent to ${remindFor.name ?? remindFor.plotNo} via ${via}${emailed}`);
      }
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
            <Button variant="secondary" icon="calculator" size="md" onClick={() => setApplyOpen(true)}>
              Apply base pay
            </Button>
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
        onClose={() => { setSelected(null); setEditMode(false); }}
        title={`Plot ${selected?.plotNo}`}
        wide
        footer={
          selected && (editMode ? (
            <>
              <Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button variant="secondary" icon="check" loading={savingEdit} onClick={() => saveEdit()}>Save</Button>
              <Button icon="calculator" loading={applyingOne} onClick={() => saveEdit({ applyDues: true })}>Save &amp; apply base pay</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" icon="pencil" onClick={startEdit}>Edit</Button>
              <Button variant="secondary" icon="calculator" loading={applyingOne} onClick={applyBasePayOne}>Apply base pay</Button>
              <Button variant="secondary" icon="receipt-indian-rupee" onClick={() => setBillFor(selected)}>Generate bill</Button>
              <Button icon="send" onClick={() => setRemindFor(selected)}>Send reminder</Button>
            </>
          ))
        }
      >
        {selected && !editMode && (
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

            {/* Base pay under the current rule */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-700">Base pay (current rate)</p>
                <p className="text-xs text-slate-400">
                  {settings.basePayMode === "per_plot"
                    ? `Flat ${formatINR(Number(settings.basePayFlat) || 0)} / plot`
                    : `${selected.sizeSqyd} sqyd × ${formatINR(Number(settings.ratePerSqyd) || 0)}`}
                </p>
              </div>
              <span className="text-base font-semibold text-slate-800">{formatINR(basePayFor(selected.sizeSqyd))}</span>
            </div>

            <button
              onClick={() => setReceiptsFor({ plotNo: selected.plotNo, name: selected.name })}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
            >
              <Icon name="receipt" size={14} /> View payment receipts
            </button>
          </div>
        )}

        {selected && editMode && editForm && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Owner name">
              <input className={inputClass} value={editForm.ownerName} onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })} placeholder="Full name" />
            </Field>
            <Field label="Size (sqyd)">
              <input type="number" min="0" className={inputClass} value={editForm.sizeSqyd} onChange={(e) => setEditForm({ ...editForm, sizeSqyd: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputClass} type="tel" inputMode="numeric" maxLength={10} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: digitsOnly(e.target.value) })} placeholder="10-digit mobile" />
            </Field>
            <Field label="Email">
              <input className={inputClass} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="name@example.com" />
            </Field>
            <Field label="Phase">
              <select className={inputClass} value={editForm.phase} onChange={(e) => setEditForm({ ...editForm, phase: e.target.value })}>
                <option>Phase 1</option>
                <option>Phase 2</option>
                <option>Phase 3</option>
              </select>
            </Field>
            <Field label="Payment status">
              <select className={inputClass} value={editForm.paymentStatus} onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
            <div className="col-span-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              <Icon name="calculator" size={14} className="text-slate-400" />
              Base pay at current rate:
              <span className="ml-auto font-semibold text-slate-800">{formatINR(basePayFor(editForm.sizeSqyd))}</span>
            </div>
            <p className="col-span-2 -mt-1 text-xs text-slate-400">
              “Save” updates details only. “Save &amp; apply base pay” also (re)generates this plot’s due. Marking it <b>Paid</b> clears the due to zero.
            </p>
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
            <input className={inputClass} type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: digitsOnly(e.target.value) })} />
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
        {/* Base pay (optional) */}
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={form.applyDues}
              onChange={(e) => setForm({ ...form, applyDues: e.target.checked })}
            />
            Apply base pay now
          </label>
          <p className="mt-1 text-xs text-slate-400">
            {basePaySet ? (
              <>
                Generates this plot’s due at the current rate:{" "}
                <b className="text-slate-600">{formatINR(basePayFor(form.sizeSqyd))}</b>
                {settings.basePayMode === "per_plot"
                  ? " (flat per plot)"
                  : ` (${form.sizeSqyd || 0} sqyd × ${formatINR(Number(settings.ratePerSqyd) || 0)})`}
                . Otherwise the plot starts at ₹0.
              </>
            ) : (
              <>No base-pay rate set yet — configure it under <b className="text-slate-600">Settings → Fees &amp; Dues</b> first.</>
            )}
          </p>
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
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Owner photo</span>
                <AvatarUpload value={form.avatarUrl} onChange={(url) => setForm({ ...form, avatarUrl: url })} name={form.name} />
              </div>
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

      {/* Bulk apply base pay */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Apply base pay"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button icon="calculator" loading={applying} onClick={applyBasePayBulk}>
              Apply to {bulkTargets.length} plot{bulkTargets.length === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-700">Current rule</p>
            <p className="mt-0.5 text-slate-500">
              {settings.basePayMode === "per_plot" ? (
                <>Flat <b>{formatINR(Number(settings.basePayFlat) || 0)}</b> per plot</>
              ) : (
                <><b>{formatINR(Number(settings.ratePerSqyd) || 0)}</b> per sqyd × plot size</>
              )}
            </p>
            {!basePaySet && <p className="mt-1 text-xs text-amber-600">Set a rate under Settings → Fees &amp; Dues to enable this.</p>}
          </div>
          <Field label="Apply to">
            <select className={inputClass} value={applyStatus} onChange={(e) => setApplyStatus(e.target.value)}>
              <option value="pending">Pending plots only</option>
              <option value="all">All plots</option>
              <option value="unknown">Unknown-status plots only</option>
            </select>
          </Field>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-600">{bulkTargets.length} plot{bulkTargets.length === 1 ? "" : "s"} · estimated total</span>
            <span className="text-base font-semibold text-slate-800">{formatINR(bulkEstimate)}</span>
          </div>
          <p className="text-xs text-slate-400">
            Re-runs are safe — each plot’s due is recalculated, not stacked. Plots marked <b>Paid</b> are cleared to ₹0.
          </p>
        </div>
      </Modal>
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
