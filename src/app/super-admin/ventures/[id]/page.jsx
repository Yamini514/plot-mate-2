"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  PageHeader, Card, CardHeader, StatCard, Badge, Button, Table, Th, Td, Tr,
  Modal, ConfirmDialog, Field, inputClass, EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { text as vtext } from "@/lib/validate";
import { formatDate } from "@/lib/utils";

const STATUS_TONE = {
  active: "green", suspended: "rose", pending: "amber",
  modifications_requested: "amber", archived: "slate", rejected: "rose",
};

const INFO_ROWS = [
  ["registrationNumber", "Registration number"],
  ["ventureType", "Venture type"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["country", "Country"],
];

export default function VentureDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: v, loading, reload } = useApi(id ? `/super/ventures/${id}` : null);
  const { data: admins } = useApi(id ? `/super/ventures/${id}/admins` : null);
  const { data: docs } = useApi(id ? `/super/ventures/${id}/documents` : null);

  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);   // { action, title, message, confirmLabel }
  const [reasonModal, setReasonModal] = useState(null); // { action, title }
  const [reason, setReason] = useState("");
  const [editInfo, setEditInfo] = useState(null); // profile draft
  const [errors, setErrors] = useState({});
  const [creds, setCreds] = useState(null);       // reset-password result
  const [support, setSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({ minutes: 30, reason: "" });

  const info = v?.info ?? {};
  const stats = v?.stats ?? {};

  const act = async (action, body, label) => {
    setBusy(true);
    try {
      await api.post(`/super/ventures/${id}/${action}`, body || {});
      toast(label || "Done");
      setConfirm(null); setReasonModal(null); setReason(""); setSupport(false);
      reload();
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally { setBusy(false); }
  };

  const grantSupport = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/super/ventures/${id}/support-access`, {
        minutes: Number(supportForm.minutes) || 30, reason: supportForm.reason.trim() || null,
      });
      toast(`Support access granted for ${data?.minutes ?? supportForm.minutes} minutes`);
      setSupport(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not grant access", "error");
    } finally { setBusy(false); }
  };

  const saveInfo = async () => {
    const errs = {
      registrationNumber: vtext(editInfo.registrationNumber, { max: 80, required: false, label: "Registration number" }),
      ventureType: vtext(editInfo.ventureType, { max: 60, required: false, label: "Venture type" }),
      address: vtext(editInfo.address, { max: 240, required: false, label: "Address" }),
    };
    const clean = Object.fromEntries(Object.entries(errs).filter(([, m]) => m));
    setErrors(clean);
    if (Object.keys(clean).length) return;
    setBusy(true);
    try {
      await api.put(`/super/ventures/${id}/info`, editInfo);
      toast("Venture information updated");
      setEditInfo(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not save", "error");
    } finally { setBusy(false); }
  };

  const resetAdminPw = async (admin) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/super/venture-admins/${admin.dbId ?? admin.id}/reset-password`, {});
      setCreds({ email: admin.email, tempPassword: data?.tempPassword });
    } catch (e) {
      toast(e.message || "Could not reset password", "error");
    } finally { setBusy(false); }
  };

  if (loading && !v) {
    return (
      <div className="animate-fade-in">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Card key={i} className="h-40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!v) {
    return (
      <div className="animate-fade-in">
        <EmptyState icon="building-2" title="Venture not found" subtitle="This workspace may have been removed." />
        <div className="mt-4 text-center">
          <Link href="/super-admin/ventures" className="text-sm font-medium text-brand-700 hover:underline">← Back to ventures</Link>
        </div>
      </div>
    );
  }

  const isActive = v.status === "active";

  return (
    <div className="animate-fade-in">
      <Link href="/super-admin/ventures" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700">
        <Icon name="arrow-left" size={15} /> Ventures
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader title={v.name} subtitle={v.email || "No contact email on file"} />
        <Badge tone={STATUS_TONE[v.status] ?? "slate"} className="self-start">{v.status}</Badge>
      </div>

      {/* Lifecycle actions */}
      <div className="mt-2 flex flex-wrap gap-2">
        {isActive ? (
          <Button variant="secondary" icon="pause" onClick={() => setConfirm({
            action: "suspend", title: "Suspend venture", confirmLabel: "Suspend",
            message: `Suspend "${v.name}"? The workspace is flagged suspended on the platform.`,
          })}>Suspend</Button>
        ) : (
          <Button icon="play" loading={busy} onClick={() => act("activate", {}, "Venture activated")}>Activate</Button>
        )}
        <Button variant="secondary" icon="file-pen-line" onClick={() => { setReasonModal({ action: "request-changes", title: "Request changes" }); setReason(""); }}>Request changes</Button>
        <Button variant="secondary" icon="shield-check" onClick={() => { setSupport(true); setSupportForm({ minutes: 30, reason: "" }); }}>Support access</Button>
        <Button variant="secondary" icon="archive" onClick={() => setConfirm({
          action: "archive", title: "Archive venture", confirmLabel: "Archive",
          message: `Archive "${v.name}"? It leaves the active roster but is never hard-deleted.`,
        })}>Archive</Button>
        <Link href="/super-admin/audit"><Button variant="ghost" icon="scroll-text">Audit logs</Button></Link>
        <Link href="/super-admin/tickets"><Button variant="ghost" icon="life-buoy">Support tickets</Button></Link>
      </div>

      {v.status === "suspended" && v.suspensionReason && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          <Icon name="triangle-alert" size={16} className="mt-0.5" />
          <span><span className="font-medium">Suspended:</span> {v.suspensionReason}</span>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total plots" value={stats.totalPlots ?? 0} icon="map-pinned" tone="brand" />
        <StatCard label="Occupied plots" value={stats.occupiedPlots ?? 0} icon="house" tone="green" hint={`${stats.vacantPlots ?? 0} vacant`} />
        <StatCard label="Residents" value={stats.residents ?? 0} icon="users" tone="sky" />
        <StatCard label="Committee" value={stats.committee ?? 0} icon="user-cog" tone="violet" />
        <StatCard label="Staff" value={stats.staff ?? 0} icon="hard-hat" tone="slate" />
        <StatCard label="Vendors" value={stats.vendors ?? 0} icon="truck" tone="amber" />
        <StatCard label="Open tickets" value={stats.openTickets ?? 0} icon="life-buoy" tone="amber" />
        <StatCard label="Closed tickets" value={stats.closedTickets ?? 0} icon="circle-check" tone="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Venture information */}
        <Card>
          <CardHeader
            title="Venture information"
            icon="building-2"
            action={
              <Button variant="secondary" icon="pencil" onClick={() => { setEditInfo({
                registrationNumber: info.registrationNumber || "",
                ventureType: info.ventureType || "",
                address: info.address || "",
                city: info.city || "", state: info.state || "", country: info.country || "",
              }); setErrors({}); }}>Edit</Button>
            }
          />
          <div className="divide-y divide-slate-100 px-5 pb-2">
            <InfoRow label="Name" value={v.name} />
            <InfoRow label="Email" value={v.email} />
            {INFO_ROWS.map(([key, label]) => <InfoRow key={key} label={label} value={info[key]} />)}
            <InfoRow label="Location" value={info.location} />
            <InfoRow label="Plots requested" value={info.plotCount} />
            <InfoRow label="Created" value={v.createdAt ? formatDate(v.createdAt) : null} />
            <InfoRow label="Last updated" value={v.updatedAt ? formatDate(v.updatedAt) : null} />
          </div>
        </Card>

        {/* Venture admin information */}
        <Card>
          <CardHeader title="Venture admins" icon="user-cog" />
          <div className="px-5 pb-4">
            {(admins ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No venture admin on this workspace.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(admins ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{a.fullName || a.full_name}</p>
                      <p className="text-xs text-slate-400">{a.email}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {a.phoneNumber || a.phone_number || "No phone"} ·{" "}
                        {a.lastLoggedInAt || a.last_logged_in_at
                          ? `last login ${formatDate(a.lastLoggedInAt || a.last_logged_in_at)}`
                          : "never logged in"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={a.active ? "green" : "slate"}>{a.active ? "active" : "inactive"}</Badge>
                      <Button variant="secondary" icon="key-round" loading={busy} onClick={() => resetAdminPw(a)}>Reset</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Documents */}
      <Card className="mt-6">
        <CardHeader title="Documents" subtitle="Read-only view of the venture's documents" icon="file-text" />
        {(docs ?? []).length === 0 ? (
          <p className="px-5 pb-6 pt-2 text-center text-sm text-slate-400">No documents uploaded.</p>
        ) : (
          <Table>
            <thead>
              <tr><Th>Name</Th><Th>Type</Th><Th>Status</Th><Th>Uploaded</Th></tr>
            </thead>
            <tbody>
              {(docs ?? []).map((d) => (
                <Tr key={d.id}>
                  <Td className="font-medium text-slate-700">{d.name}</Td>
                  <Td className="text-slate-500">{d.docType || d.doc_type || "—"}</Td>
                  <Td><Badge tone={(d.status === "verified") ? "green" : "slate"}>{d.status || "—"}</Badge></Td>
                  <Td className="text-slate-500">{d.createdAt || d.created_at ? formatDate(d.createdAt || d.created_at) : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* --- modals --- */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => act(confirm.action, {}, `${confirm.title} done`)}
        loading={busy}
        title={confirm?.title}
        confirmLabel={confirm?.confirmLabel}
        message={confirm?.message}
      />

      <Modal
        open={!!reasonModal}
        onClose={() => setReasonModal(null)}
        title={reasonModal?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReasonModal(null)}>Cancel</Button>
            <Button loading={busy} onClick={() => act(reasonModal.action, { reason: reason.trim() || null }, `${reasonModal.title} sent`)}>Submit</Button>
          </>
        }
      >
        <Field label="Reason" hint="Shared with the venture admin and recorded in the audit trail.">
          <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What needs to change?" />
        </Field>
      </Modal>

      <Modal
        open={support}
        onClose={() => setSupport(false)}
        title="Grant support access"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSupport(false)}>Cancel</Button>
            <Button icon="shield-check" loading={busy} onClick={grantSupport}>Grant access</Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-slate-600">
          A time-boxed, audited grant to this venture&apos;s operational data. Every access under it is logged.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (minutes)">
            <input type="number" min={5} max={240} className={inputClass} value={supportForm.minutes}
              onChange={(e) => setSupportForm((f) => ({ ...f, minutes: e.target.value }))} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Reason (optional)">
            <textarea className={inputClass} rows={2} value={supportForm.reason}
              onChange={(e) => setSupportForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Why is access needed?" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!editInfo}
        onClose={() => setEditInfo(null)}
        title="Edit venture information"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditInfo(null)}>Cancel</Button>
            <Button icon="check" loading={busy} onClick={saveInfo}>Save</Button>
          </>
        }
      >
        {editInfo && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration number" error={errors.registrationNumber}>
              <input className={inputClass} value={editInfo.registrationNumber} onChange={(e) => setEditInfo((f) => ({ ...f, registrationNumber: e.target.value }))} />
            </Field>
            <Field label="Venture type" error={errors.ventureType}>
              <input className={inputClass} value={editInfo.ventureType} onChange={(e) => setEditInfo((f) => ({ ...f, ventureType: e.target.value }))} placeholder="Layout / Apartment / Gated" />
            </Field>
            <Field label="Address" error={errors.address} className="col-span-2">
              <input className={inputClass} value={editInfo.address} onChange={(e) => setEditInfo((f) => ({ ...f, address: e.target.value }))} />
            </Field>
            <Field label="City"><input className={inputClass} value={editInfo.city} onChange={(e) => setEditInfo((f) => ({ ...f, city: e.target.value }))} /></Field>
            <Field label="State"><input className={inputClass} value={editInfo.state} onChange={(e) => setEditInfo((f) => ({ ...f, state: e.target.value }))} /></Field>
            <Field label="Country"><input className={inputClass} value={editInfo.country} onChange={(e) => setEditInfo((f) => ({ ...f, country: e.target.value }))} /></Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title="Temporary password"
        footer={<Button icon="check" onClick={() => setCreds(null)}>Done</Button>}
      >
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-400">Email</span><span className="text-slate-800">{creds?.email}</span></div>
          <div className="flex justify-between gap-3"><span className="text-slate-400">Temp password</span><span className="font-semibold text-slate-800">{creds?.tempPassword}</span></div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-700">{value ?? "—"}</span>
    </div>
  );
}
