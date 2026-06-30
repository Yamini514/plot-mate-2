"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, Td, Tr,
  Modal, Field, inputClass, inputErrorClass, ActionMenu,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { AvatarUpload } from "@/components/AvatarUpload";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate, digitsOnly, cn } from "@/lib/utils";
import { presence, email as vemail, phone as vphone, number as vnumber, collect, hasErrors } from "@/lib/validate";

const STATUS_TONE = { submitted: "amber", approved: "green", rejected: "rose" };
const emptyForm = {
  ventureName: "", location: "", description: "",
  requesterName: "", requesterEmail: "", requesterPhone: "", plotCount: "", notes: "",
};

export default function OnboardingPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data: raw, meta, reload, loading } = useApi("/super/onboarding", { status: filter });
  const requests = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const openForm = () => { setForm(emptyForm); setErrors({}); setOpen(true); };

  // Approval / rejection
  const [busyId, setBusyId] = useState(null);
  const [reject, setReject] = useState(null); // request pending rejection
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(null); // request pending approval
  const [avatarUrl, setAvatarUrl] = useState("");
  const [approved, setApproved] = useState(null); // { ventureName, email, tempPassword }

  const logRequest = async () => {
    const errs = collect({
      ventureName: presence(form.ventureName, "Venture name"),
      requesterName: presence(form.requesterName, "Requester name"),
      requesterEmail: vemail(form.requesterEmail),
      requesterPhone: vphone(form.requesterPhone),
      plotCount: vnumber(form.plotCount, { positive: true, integer: true, required: false, label: "Plot count" }),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    try {
      await api.post("/onboarding-requests", {
        ventureName: form.ventureName.trim(),
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        requesterName: form.requesterName.trim(),
        requesterEmail: form.requesterEmail.trim().toLowerCase(),
        requesterPhone: form.requesterPhone.trim() || null,
        plotCount: form.plotCount ? Number(form.plotCount) : null,
        notes: form.notes.trim() || null,
      });
      toast("Onboarding request logged");
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (e) {
      toast(e.message || "Could not submit request", "error");
    } finally {
      setSaving(false);
    }
  };

  const openApprove = (r) => {
    setApproving(r);
    setAvatarUrl("");
  };

  const confirmApprove = async () => {
    if (!approving) return;
    const r = approving;
    setBusyId(r.dbId);
    try {
      const { data } = await api.post(`/super/onboarding/${r.dbId}/approve`, { avatarUrl: avatarUrl || null });
      setApproving(null);
      setApproved({ ventureName: r.ventureName, email: r.requesterEmail, tempPassword: data?.tempPassword });
      toast(`${r.ventureName} approved — workspace activated`);
      reload();
    } catch (e) {
      toast(e.message || "Could not approve", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async () => {
    if (!reject) return;
    setBusyId(reject.dbId);
    try {
      await api.post(`/super/onboarding/${reject.dbId}/reject`, { reason: reason.trim() || null });
      toast(`${reject.ventureName} rejected`);
      setReject(null);
      setReason("");
      reload();
    } catch (e) {
      toast(e.message || "Could not reject", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Onboarding requests"
        subtitle="Review venture requests, then approve to activate a workspace"
        actions={<Button icon="plus" onClick={openForm}>Log request</Button>}
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "submitted", label: "Submitted", count: counts.submitted },
              { value: "approved", label: "Approved", count: counts.approved },
              { value: "rejected", label: "Rejected", count: counts.rejected },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Request</Th>
              <Th>Venture</Th>
              <Th>Requester</Th>
              <Th className="text-right">Plots</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <Tr key={r.id}>
                <Td className="font-mono text-xs text-slate-500">{r.code}</Td>
                <Td>
                  <span className="font-medium text-slate-800">{r.ventureName}</span>
                  {r.location && <span className="block text-xs text-slate-400">{r.location}</span>}
                </Td>
                <Td className="text-slate-600">
                  {r.requesterName}
                  <span className="block text-xs text-slate-400">{r.requesterEmail}</span>
                </Td>
                <Td className="text-right text-slate-500">{r.plotCount ?? "—"}</Td>
                <Td><Badge tone={STATUS_TONE[r.status] ?? "slate"}>{r.status}</Badge></Td>
                <Td>
                  {r.status === "submitted" ? (
                    <ActionMenu
                      items={[
                        { label: "Approve", icon: "check", loading: busyId === r.dbId && !!approving, onClick: () => openApprove(r) },
                        { label: "Reject", icon: "x", tone: "danger", onClick: () => { setReject(r); setReason(""); } },
                      ]}
                    />
                  ) : (
                    <span className="flex justify-end text-xs text-slate-400">
                      {r.status === "approved" ? "Workspace activated" : "Closed"}
                      {r.decidedAt ? ` · ${formatDate(r.decidedAt)}` : ""}
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
            {requests.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading requests…</>
                  ) : (
                    "No requests in this view."
                  )}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Log a request manually */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log an onboarding request"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="check" loading={saving} onClick={logRequest}>Submit request</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Venture name" required error={errors.ventureName}>
            <input className={cn(inputClass, errors.ventureName && inputErrorClass)} value={form.ventureName} onChange={(e) => setField("ventureName", e.target.value)} placeholder="e.g. Green Aero View" />
          </Field>
          <Field label="Location">
            <input className={inputClass} value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="City / area" />
          </Field>
          <Field label="Requester name" required error={errors.requesterName}>
            <input className={cn(inputClass, errors.requesterName && inputErrorClass)} value={form.requesterName} onChange={(e) => setField("requesterName", e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Requester email" required error={errors.requesterEmail}>
            <input type="email" className={cn(inputClass, errors.requesterEmail && inputErrorClass)} value={form.requesterEmail} onChange={(e) => setField("requesterEmail", e.target.value)} placeholder="admin@venture.in" />
          </Field>
          <Field label="Requester phone" error={errors.requesterPhone}>
            <input type="tel" inputMode="numeric" maxLength={10} className={cn(inputClass, errors.requesterPhone && inputErrorClass)} value={form.requesterPhone} onChange={(e) => setField("requesterPhone", digitsOnly(e.target.value))} placeholder="10-digit mobile" />
          </Field>
          <Field label="Approx. plots" error={errors.plotCount}>
            <input type="number" className={cn(inputClass, errors.plotCount && inputErrorClass)} value={form.plotCount} onChange={(e) => setField("plotCount", e.target.value)} placeholder="e.g. 280" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Anything the super admin should know" />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Approve — optional admin photo; a temp password is generated */}
      <Modal
        open={!!approving}
        onClose={() => setApproving(null)}
        title={`Approve · ${approving?.ventureName ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproving(null)}>Cancel</Button>
            <Button icon="check" loading={busyId === approving?.dbId} onClick={confirmApprove}>
              Approve &amp; activate
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This creates the venture workspace and a Venture Admin login for{" "}
          <span className="font-medium text-slate-800">{approving?.requesterName}</span> ({approving?.requesterEmail}).
          A one-time temporary password is generated and shown next.
        </p>
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-medium text-slate-600">Admin profile photo (optional)</span>
          <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} name={approving?.requesterName ?? ""} />
        </div>
      </Modal>

      {/* Reject with reason */}
      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title={`Reject · ${reject?.ventureName ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReject(null)}>Cancel</Button>
            <Button variant="danger" icon="x" loading={busyId === reject?.dbId} onClick={doReject}>Reject request</Button>
          </>
        }
      >
        <Field label="Reason (optional)">
          <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shown in the audit trail" />
        </Field>
      </Modal>

      {/* Approval result — show the one-time temp password */}
      <Modal
        open={!!approved}
        onClose={() => setApproved(null)}
        title="Workspace activated"
        footer={<Button icon="check" onClick={() => setApproved(null)}>Done</Button>}
      >
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">{approved?.ventureName}</span> is now active with a
          Venture Admin login. Share these one-time credentials securely — the admin can reset the password
          after first sign-in.
        </p>
        <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm">
          <div className="flex justify-between gap-3"><span className="text-slate-400">Email</span><span className="text-slate-800">{approved?.email}</span></div>
          <div className="flex justify-between gap-3"><span className="text-slate-400">Temp password</span><span className="font-semibold text-slate-800">{approved?.tempPassword}</span></div>
        </div>
      </Modal>
    </div>
  );
}
