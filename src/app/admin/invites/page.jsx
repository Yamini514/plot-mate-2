"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, Td, Tr, Modal, Field, inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate, digitsOnly } from "@/lib/utils";

const STATUS_TONE = { pending: "amber", accepted: "green", revoked: "slate", expired: "rose" };
const ROLE_OPTS = [
  { value: 0, label: "Owner / Member" },
  { value: 2, label: "Committee / Admin" },
  { value: 1, label: "Security Guard" },
];
const emptyForm = { email: "", fullName: "", role: 0, plotId: "" };

export default function InvitesPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data: raw, meta, reload, loading } = useApi("/admin/invites", { status: filter });
  const invites = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // { email, inviteUrl }
  const [busyId, setBusyId] = useState(null);

  const sendInvite = async () => {
    if (!form.email.trim() && !form.fullName.trim()) {
      return toast("Enter at least an email or a name", "error");
    }
    setSaving(true);
    try {
      const { data } = await api.post("/admin/invites", {
        email: form.email.trim().toLowerCase() || null,
        fullName: form.fullName.trim() || null,
        role: Number(form.role),
        plotId: form.plotId ? Number(form.plotId) : null,
      });
      setCreated({ email: data?.email, inviteUrl: data?.inviteUrl });
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not create invite", "error");
    } finally {
      setSaving(false);
    }
  };

  const act = async (inv, action) => {
    setBusyId(inv.dbId);
    try {
      const { data } = await api.post(`/admin/invites/${inv.dbId}/${action}`, {});
      if (action === "resend" && data?.inviteUrl) {
        setCreated({ email: data.email, inviteUrl: data.inviteUrl });
      }
      toast(`Invite ${action === "resend" ? "re-issued" : "revoked"}`);
      reload();
    } catch (e) {
      toast(e.message || "Action failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const copy = (url) => {
    navigator.clipboard?.writeText(url);
    toast("Invite link copied");
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Invites"
        subtitle="Invite owners and committee members to complete their own profile"
        actions={<Button icon="user-plus" onClick={() => setOpen(true)}>New invite</Button>}
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "pending", label: "Pending", count: counts.pending },
              { value: "accepted", label: "Accepted", count: counts.accepted },
              { value: "revoked", label: "Revoked", count: counts.revoked },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Invite</Th>
              <Th>Recipient</Th>
              <Th>Role</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => (
              <Tr key={i.dbId}>
                <Td className="font-mono text-xs text-slate-500">{i.code}</Td>
                <Td>
                  <span className="font-medium text-slate-800">{i.fullName || "—"}</span>
                  <span className="block text-xs text-slate-400">{i.email || "no email"}</span>
                </Td>
                <Td className="text-slate-600">{i.roleName}</Td>
                <Td className="text-slate-500">{i.expiresAt ? formatDate(i.expiresAt) : "—"}</Td>
                <Td><Badge tone={STATUS_TONE[i.status] ?? "slate"}>{i.status}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    {i.status === "pending" && (
                      <>
                        <Button variant="secondary" icon="rotate-cw" loading={busyId === i.dbId} onClick={() => act(i, "resend")}>Resend</Button>
                        <Button variant="secondary" icon="x" loading={busyId === i.dbId} onClick={() => act(i, "revoke")}>Revoke</Button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {invites.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading invites…</>
                  ) : "No invites in this view."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="send" loading={saving} onClick={sendInvite}>Create invite</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name"><input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Recipient name" /></Field>
          <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="they@example.com" /></Field>
          <Field label="Role"><select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: Number(e.target.value) })}>{ROLE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
          <Field label="Plot ID (optional)" hint="Pre-link this owner to a plot"><input className={inputClass} value={form.plotId} onChange={(e) => setForm({ ...form, plotId: digitsOnly(e.target.value, 12) })} placeholder="e.g. 142" /></Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">An invite link is generated. If an email is set, we also email it (using your venture&rsquo;s SMTP). The recipient sets a password and submits their profile + KYC for your verification.</p>
      </Modal>

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        title="Invite link ready"
        footer={<Button icon="check" onClick={() => setCreated(null)}>Done</Button>}
      >
        <p className="text-sm text-slate-600">Share this link with {created?.email || "the recipient"}. It expires in 14 days.</p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <code className="flex-1 truncate text-xs text-slate-700">{created?.inviteUrl}</code>
          <Button variant="secondary" icon="copy" onClick={() => copy(created?.inviteUrl)}>Copy</Button>
        </div>
      </Modal>
    </div>
  );
}
