"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatCard,
  StatusBadge,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { SendReminderModal } from "@/components/SendReminderModal";
import { useToast } from "@/components/Toast";
import { useSettings } from "@/lib/useSettings";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

const channels = [
  { id: "whatsapp", label: "WhatsApp", icon: "message-circle" },
  { id: "sms", label: "SMS", icon: "smartphone" },
  { id: "email", label: "Email", icon: "mail" },
];

export default function RemindersPage() {
  const toast = useToast();
  const { settings } = useSettings();
  const { data: rawReminders, reload } = useApi("/admin/reminders");
  const reminders = normalizeList(rawReminders);
  const { data: ps } = useApi("/admin/plots/summary");
  const { data: bsum } = useApi("/admin/billing/invoices/summary");
  const pendingCount = ps?.pendingCount ?? 0;
  const overdueCount = bsum?.defaulters ?? 0;
  const stats = { pendingCount };

  const [channel, setChannel] = useState("whatsapp");
  const [audience, setAudience] = useState("pending");
  const [when, setWhen] = useState("now");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const recipientCount =
    audience === "overdue" ? overdueCount : audience === "pending" ? pendingCount : 1;

  // Real batch: create a reminder record per pending plot, per chosen channel.
  // Nothing is dispatched until the admin confirms the channels in the dialog.
  const send = async (selectedChannels) => {
    setSending(true);
    try {
      const { data: plots } = await api.get("/admin/plots", { status: "pending", page_size: 300 });
      const status = when === "now" ? "sent" : "scheduled";
      const targets = normalizeList(plots).slice(0, 50);
      const results = await Promise.all(
        targets.flatMap((p) =>
          selectedChannels.map((ch) =>
            api.post("/admin/reminders", {
              plotNo: p.plotNo, ownerName: p.ownerName, amount: p.amountDue,
              channel: ch, status,
              email: p.email || undefined, phone: p.phone || undefined,
            }).then(({ data }) => data?.delivery).catch(() => null),
          ),
        ),
      );
      const via = selectedChannels.length > 1 ? `${selectedChannels.length} channels` : (channels.find((c) => c.id === selectedChannels[0])?.label ?? selectedChannels[0]);
      // Count real sends (email + WhatsApp) and failures so the admin knows what
      // actually went out. SMS has no gateway yet, so it's only recorded.
      if (status === "sent") {
        const delivered = results.filter((d) => d?.sent).length;
        const failed = results.filter((d) => d?.ok === false).length;
        toast(
          `Reminder sent for ${recipientCount} owners via ${via}` +
            (delivered ? ` · ${delivered} delivered` : "") +
            (failed ? ` · ${failed} failed (check Settings)` : ""),
          failed && !delivered ? "error" : "success",
        );
      } else {
        toast(`Reminder scheduled for ${recipientCount} owners via ${via}`);
      }
      setConfirmOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not send reminders", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payment Reminders"
        subtitle="Compose and schedule maintenance-fee reminders"
        actions={<Button variant="secondary" icon="history" onClick={() => toast("Showing reminder history", "info")}>History</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pending owners" value={`${stats.pendingCount}`} icon="users" tone="amber" />
        <StatCard label="Overdue > 45 days" value={`${overdueCount}`} icon="alarm-clock" tone="rose" />
        <StatCard label="Scheduled" value="8" icon="calendar-clock" tone="sky" />
        <StatCard label="Response rate" value="67%" icon="reply" tone="brand" hint="paid after reminder" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Composer */}
        <Card className="lg:col-span-3">
          <CardHeader title="Compose reminder" icon="bell-ring" />
          <div className="space-y-5 p-5">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">Channel</p>
              <div className="flex gap-2">
                {channels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setChannel(c.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                      channel === c.id
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Icon name={c.icon} size={16} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Recipients">
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className={inputClass}
              >
                <option value="pending">All pending ({stats.pendingCount})</option>
                <option value="overdue">Overdue only ({overdueCount})</option>
                <option value="custom">Custom selection…</option>
              </select>
            </Field>

            <Field label="Message" hint="Variables: [Owner Name], [Amount], [Plot No.]">
              <textarea
                rows={4}
                className={inputClass}
                defaultValue={`Dear [Owner Name], This is a reminder that your maintenance fee of ₹[Amount] for Plot [Plot No.] at ${settings.name} is pending for FY ${settings.fy}. Kindly pay at your earliest convenience. — Secretary`}
              />
            </Field>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">Schedule</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "now", label: "Send now" },
                  { id: "tomorrow", label: "Tomorrow 9 AM" },
                  { id: "custom", label: "Custom" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setWhen(s.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm transition-colors",
                      when === s.id
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" icon="eye" onClick={() => toast("Preview updated", "info")}>
                Preview
              </Button>
              <Button icon="send" onClick={() => setConfirmOpen(true)} loading={sending}>
                {when === "now" ? "Send now" : "Schedule"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Preview + scheduled */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Preview" icon="message-square" />
            <div className="p-4">
              <div className="rounded-2xl rounded-tl-sm bg-brand-50 p-4 text-sm leading-relaxed text-slate-700">
                Dear <b>{"{owner name}"}</b>, this is a reminder that your maintenance
                fee of <b>{"{amount due}"}</b> for Plot <b>{"{plot no}"}</b> at {settings.name} is
                pending for FY {settings.fy}. Kindly pay soon. — Secretary
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                via {channels.find((c) => c.id === channel)?.label}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Scheduled & sent" icon="calendar-clock" />
            <div className="divide-y divide-slate-100">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon
                      name={
                        r.channel === "whatsapp"
                          ? "message-circle"
                          : r.channel === "sms"
                            ? "smartphone"
                            : "mail"
                      }
                      size={14}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {r.ownerName} · {r.plotNo}
                    </p>
                    <p className="text-xs text-slate-400">{formatINR(r.amount)} due</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <SendReminderModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={send}
        sending={sending}
        defaultChannels={[channel]}
        title={when === "now" ? "Send reminders now" : "Schedule reminders"}
        confirmLabel={when === "now" ? "Send now" : "Schedule"}
        recipientLabel={`${recipientCount} ${audience === "overdue" ? "overdue" : audience === "pending" ? "pending" : "selected"} owner${recipientCount === 1 ? "" : "s"}`}
      />
    </div>
  );
}
