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
  EmptyState,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { stats, association } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";

const emptyForm = { plotNo: "", sizeSqyd: "", name: "", phone: "", email: "", phase: "Phase 1" };

export default function OwnersPage() {
  const { owners: allOwners, addOwner } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const saveOwner = () => {
    if (!form.plotNo.trim()) {
      toast("Plot number is required", "error");
      return;
    }
    const size = Number(form.sizeSqyd) || 0;
    addOwner({
      id: form.plotNo.trim(),
      plotNo: form.plotNo.trim(),
      name: form.name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      sizeSqyd: size,
      phase: form.phase,
      amountDue: size * association.ratePerSqyd,
      paymentStatus: "pending",
      membership: "unverified",
      daysOverdue: 0,
      lastPaymentDate: null,
    });
    toast(`Plot ${form.plotNo.trim()} added`);
    setForm(emptyForm);
    setAddOpen(false);
  };

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
        subtitle={`Registry of all ${association.totalPlots} plots`}
        actions={
          <>
            <Button variant="secondary" icon="upload" size="md" onClick={() => toast("CSV import started — 0 new rows in demo", "info")}>
              Import CSV
            </Button>
            <Button variant="secondary" icon="download" size="md" onClick={() => toast(`Exported ${filtered.length} owners to CSV`)}>
              Export
            </Button>
            <Button icon="user-plus" onClick={() => setAddOpen(true)}>
              Add owner
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total plots" value={`${association.totalPlots}`} icon="map-pinned" tone="violet" />
        <StatCard label="Paid" value={`${stats.paidCount}`} icon="circle-check-big" tone="brand" />
        <StatCard label="Pending" value={`${stats.pendingCount}`} icon="clock" tone="amber" />
        <StatCard label="Unknown contact" value={`${stats.unknownCount}`} icon="user-x" tone="slate" />
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
              { value: "paid", label: "Paid", count: stats.paidCount },
              { value: "pending", label: "Pending", count: stats.pendingCount },
              { value: "unknown", label: "Unknown", count: stats.unknownCount },
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
            <Button variant="secondary" icon="receipt" onClick={() => toast(`Opening receipts for ${selected?.plotNo}`, "info")}>
              View receipts
            </Button>
            <Button icon="send" onClick={() => { toast(`Reminder sent to ${selected?.name ?? selected?.plotNo}`); setSelected(null); }}>
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
            <Button onClick={saveOwner}>Save owner</Button>
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
