"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  StatCard,
  Card,
  CardHeader,
  Button,
  Badge,
  StatusBadge,
  Avatar,
  Tabs,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  Modal,
  Drawer,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ShareModal } from "@/components/ShareModal";
import { QrCanvas, qrPngFile } from "@/components/Qr";
import { useToast } from "@/components/Toast";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { PURPOSES } from "@/lib/member-gate-data";

// Live visitors already carry the plot number, so the label IS the plot.
const propLabel = (id) => id ?? "—";

export default function MemberVisitors() {
  const toast = useToast();
  const { user } = useAuth();
  const { data: rawVisitors, reload } = useApi("/member/visitors");
  // Map live visitors to the labels this page renders.
  const all = normalizeList(rawVisitors).map((v) => ({
    ...v, property: v.plotNo, pass: v.passCode, date: v.expectedOn ?? "—",
    window: "All day", vehicle: v.vehicleNo, in: v.checkIn, out: v.checkOut,
  }));
  const approvals = all.filter((v) => v.status === "pending")
    .map((a) => ({ ...a, type: "visitor", gate: "Main Gate", requestedAt: "awaiting" }));
  const expected = all.filter((v) => ["approved", "expected"].includes(v.status));
  const history = all.filter((v) => ["checked_out", "left", "rejected", "inside"].includes(v.status));

  // Frequent passes & deliveries have no backend yet — start empty so a member
  // only ever sees their own data, never another plot's sample entries.
  const [passes, setPasses] = useState([]);
  const [deliveries, setDeliveries] = useState({ awaiting: [], expected: [], recent: [] });
  const [tab, setTab] = useState("expected");
  const [open, setOpen] = useState(false);
  const [passView, setPassView] = useState(null);
  const [shareFor, setShareFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Human-readable text for sharing a gate pass via any channel.
  const passShareText = (p) =>
    p
      ? `Gate pass ${p.pass} for ${p.name} at ${propLabel(p.property)}. Show this QR at the gate for entry${p.window ? ` (valid ${p.window})` : ""}.`
      : "";

  // Save the gate pass QR as a PNG image.
  const downloadPass = async (p) => {
    try {
      const file = await qrPngFile(p.pass, `gate-pass-${p.pass}.png`);
      const href = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = href;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(href);
      toast("Gate pass QR downloaded");
    } catch {
      toast("Could not download the pass", "error");
    }
  };

  const decide = async (v, ok) => {
    setBusyId(v.id);
    try {
      await api.post(`/member/visitors/${v.dbId}/${ok ? "approve" : "reject"}`);
      toast(ok ? `Entry approved for ${v.name}` : `Entry denied for ${v.name}`, ok ? "success" : "error");
      reload();
    } catch (e) {
      toast(e.message || "Could not update", "error");
    } finally {
      setBusyId(null);
    }
  };

  const togglePass = (id) => {
    setPasses((ps) => ps.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
    const p = passes.find((x) => x.id === id);
    toast(`${p.name}'s pass ${p.active ? "paused" : "activated"}`);
  };

  const collected = (id) => {
    setDeliveries((d) => ({ ...d, awaiting: d.awaiting.filter((x) => x.id !== id) }));
    toast("Marked as collected");
  };

  const preRegister = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    try {
      const { data } = await api.post("/member/visitors", {
        name: f.get("name") || "Guest",
        phone: f.get("phone"),
        purpose: f.get("purpose") || "Guest",
        vehicleNo: f.get("vehicle"),
        expectedOn: f.get("date"),
      });
      setOpen(false);
      setPassView({ name: data.name, property: data.plotNo, pass: data.passCode, purpose: data.purpose, window: data.expectedOn });
      toast(`${data.name} pre-registered · gate pass ${data.passCode} generated`);
      reload();
    } catch (err) {
      toast(err.message || "Could not pre-register", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelPass = async (v) => {
    setBusyId(v.id);
    try {
      await api.post(`/member/visitors/${v.dbId}/reject`);
      toast(`Cancelled pass for ${v.name}`, "info");
      reload();
    } catch (e) {
      toast(e.message || "Could not cancel", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/member" }, { label: "Me" }, { label: "Gate & Visitors" }]} />
      <PageHeader
        title="Gate & Visitors"
        subtitle="Pre-approve guests, manage passes and track deliveries at your gate"
        actions={<Button icon="user-plus" onClick={() => setOpen(true)}>Pre-register visitor</Button>}
      />

      {/* Live approvals banner */}
      {approvals.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-600">
              <Icon name="bell-ring" size={16} />
            </span>
            <p className="text-sm font-semibold text-amber-800">{approvals.length} visitor(s) waiting at the gate for your approval</p>
          </div>
          <div className="space-y-2">
            {approvals.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3">
                <Avatar name={a.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {a.name} <Badge tone={a.type === "delivery" ? "sky" : "violet"}>{a.type}</Badge>
                  </p>
                  <p className="text-xs text-slate-400">{a.purpose} · {propLabel(a.property)} · {a.gate} · {a.requestedAt}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon="phone" onClick={() => { window.location.href = `tel:${String(a.phone).replace(/\s/g, "")}`; }}>Call</Button>
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" icon="x" loading={busyId === a.id} onClick={() => decide(a, false)}>Deny</Button>
                  <Button size="sm" icon="check" loading={busyId === a.id} onClick={() => decide(a, true)}>Approve</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Expected" value={expected.length} icon="calendar-clock" tone="brand" />
        <StatCard label="Awaiting approval" value={approvals.length} icon="bell-ring" tone={approvals.length ? "amber" : "slate"} />
        <StatCard label="Parcels at gate" value={deliveries.awaiting.length} icon="package" tone="sky" />
        <StatCard label="Active passes" value={passes.filter((p) => p.active).length} icon="id-card" tone="violet" hint="Maid, cook, driver…" />
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "expected", label: "Expected", count: expected.length },
            { value: "frequent", label: "Frequent passes", count: passes.length },
            { value: "deliveries", label: "Deliveries", count: deliveries.awaiting.length + deliveries.expected.length },
            { value: "history", label: "History" },
          ]}
        />
      </div>

      {/* EXPECTED */}
      {tab === "expected" && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {expected.length === 0 ? (
            <Card className="md:col-span-2"><EmptyState icon="user-plus" title="No expected visitors" subtitle="Pre-register a guest to generate a gate pass." /></Card>
          ) : (
            expected.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={v.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{v.name}</p>
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{v.purpose} · {propLabel(v.property)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Icon name="calendar" size={12} /> {v.date} · {v.window}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-mono text-xs font-semibold text-slate-500">{v.pass}</span>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" icon="qr-code" onClick={() => setPassView(v)}>Pass</Button>
                    <Button size="sm" variant="ghost" icon="share-2" onClick={() => setShareFor(v)}>Share</Button>
                    <button onClick={() => cancelPass(v)} disabled={busyId === v.id} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50" title="Cancel">
                      <Icon name={busyId === v.id ? "loader-circle" : "trash-2"} size={15} className={busyId === v.id ? "animate-spin" : undefined} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* FREQUENT PASSES */}
      {tab === "frequent" && (
        <Card className="mt-4">
          <CardHeader title="Frequent passes" subtitle="Recurring access for household help" icon="repeat" />
          <div className="divide-y divide-slate-100">
            {passes.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar name={p.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    <Badge tone="slate">{p.role}</Badge>
                    <StatusBadge status={p.active ? "active" : "paused"} />
                  </div>
                  <p className="text-xs text-slate-400">{propLabel(p.property)} · {p.days} · {p.window}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" icon="qr-code" onClick={() => setPassView({ name: p.name, property: p.property, pass: p.pass, window: p.window, purpose: p.role })}>Pass</Button>
                  <Button size="sm" variant="ghost" icon={p.active ? "pause" : "play"} onClick={() => togglePass(p.id)}>{p.active ? "Pause" : "Resume"}</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3">
            <Button size="sm" variant="secondary" icon="plus" onClick={() => toast("Add frequent pass — opens form", "info")}>Add household help</Button>
          </div>
        </Card>
      )}

      {/* DELIVERIES */}
      {tab === "deliveries" && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Awaiting pickup" subtitle="Held at gate" icon="package-search" action={<Badge tone="amber">{deliveries.awaiting.length}</Badge>} />
            <div className="divide-y divide-slate-100">
              {deliveries.awaiting.length === 0 ? (
                <EmptyState icon="package" title="Nothing waiting" />
              ) : deliveries.awaiting.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600"><Icon name="package" size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{d.courier}</p>
                    <p className="text-xs text-slate-400">{propLabel(d.property)} · {d.received}</p>
                  </div>
                  <Button size="sm" variant="secondary" icon="check" onClick={() => collected(d.id)}>Collected</Button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Expected" subtitle="Inbound today" icon="truck" />
            <div className="divide-y divide-slate-100">
              {deliveries.expected.map((d) => (
                <div key={d.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{d.courier}</p>
                    <span className="text-xs text-slate-400">{d.eta}</span>
                  </div>
                  <p className="text-xs text-slate-400">{propLabel(d.property)}</p>
                  <button onClick={() => toast(`Preference saved for ${d.courier}`)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                    <Icon name="settings-2" size={12} /> {d.note}
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recently delivered" icon="package-check" />
            <div className="divide-y divide-slate-100">
              {deliveries.recent.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon name="package-check" size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{d.courier}</p>
                    <p className="text-xs text-slate-400">{propLabel(d.property)} · {d.delivered}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <Card className="mt-4">
          <Table>
            <thead>
              <tr>
                <Th>Visitor</Th>
                <Th>Property</Th>
                <Th>Purpose</Th>
                <Th>In</Th>
                <Th>Out</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <Tr><Td className="text-slate-400" colSpan={6}>No visitor history yet.</Td></Tr>
              ) : history.map((v) => (
                <Tr key={v.id}>
                  <Td className="font-medium text-slate-800">{v.name}</Td>
                  <Td className="text-slate-500">{v.property}</Td>
                  <Td className="text-slate-600">{v.purpose}</Td>
                  <Td className="text-slate-500">{v.in ?? "—"}</Td>
                  <Td className="text-slate-500">{v.out ?? "—"}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Pre-register modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Pre-register a Visitor"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="prereg" icon="qr-code" loading={saving}>Generate gate pass</Button>
          </>
        }
      >
        <form id="prereg" onSubmit={preRegister} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Visitor name">
            <input name="name" required className={inputClass} placeholder="e.g. Anil Deshmukh" />
          </Field>
          <Field label="Phone number">
            <input name="phone" className={inputClass} placeholder="+91 9XXXX XXXXX" />
          </Field>
          <Field label="Property">
            <input name="property" className={inputClass} value={user?.plotNo ?? "—"} readOnly />
          </Field>
          <Field label="Purpose">
            <select name="purpose" className={inputClass} defaultValue="Guest">
              {PURPOSES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input name="date" className={inputClass} placeholder="Today / 14 Jun 2026" defaultValue="Today" />
          </Field>
          <Field label="Time window">
            <input name="window" className={inputClass} placeholder="06:00 PM – 09:00 PM" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Vehicle number (optional)">
              <input name="vehicle" className={inputClass} placeholder="e.g. TS 09 GK 4412" />
            </Field>
          </div>
          <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" name="recurring" className="h-4 w-4 accent-brand-600" />
            Make this a recurring pass (daily household help)
          </label>
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 sm:col-span-2">
            <Icon name="info" size={14} />
            A QR gate pass is generated — share it so the guard can scan & allow instant entry.
          </div>
        </form>
      </Modal>

      {/* QR pass drawer */}
      <Drawer
        open={!!passView}
        onClose={() => setPassView(null)}
        width="max-w-md"
        title="Gate Pass"
        subtitle={passView ? propLabel(passView.property) : ""}
        footer={
          passView && (
            <>
              <Button variant="secondary" icon="download" onClick={() => downloadPass(passView)}>Download</Button>
              <Button icon="share-2" onClick={() => setShareFor(passView)}>Share</Button>
            </>
          )
        }
      >
        {passView && (
          <div className="flex flex-col items-center text-center">
            <QrCanvas value={passView.pass} size={150} className="rounded-xl bg-white p-2 ring-1 ring-slate-200" />
            <p className="mt-4 font-mono text-lg font-bold tracking-wider text-slate-800">{passView.pass}</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{passView.name}</p>
            <p className="text-xs text-slate-400">{passView.purpose} · {propLabel(passView.property)}</p>
            {passView.window && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                <Icon name="clock" size={12} /> Valid {passView.window}
              </span>
            )}
            <div className="mt-6 w-full rounded-xl bg-slate-50 p-4 text-left text-xs text-slate-500">
              <p className="flex items-center gap-1.5"><Icon name="shield-check" size={13} className="text-brand-600" /> Show this QR at the gate for instant, contactless entry.</p>
              <p className="mt-1.5 flex items-center gap-1.5"><Icon name="bell" size={13} className="text-brand-600" /> You&apos;ll be notified when {passView.name} arrives.</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* Share gate pass — native share sheet + explicit options */}
      <ShareModal
        open={!!shareFor}
        onClose={() => setShareFor(null)}
        title="Share gate pass"
        shareTitle={shareFor ? `Gate pass for ${shareFor.name}` : "Gate pass"}
        text={passShareText(shareFor)}
        getFile={shareFor ? () => qrPngFile(shareFor.pass, `gate-pass-${shareFor.pass}.png`) : undefined}
      />
    </div>
  );
}
