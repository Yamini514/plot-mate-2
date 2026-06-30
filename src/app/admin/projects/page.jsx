"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, Td, Tr, Drawer, Modal,
  Field, inputClass, Progress,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList, fieldErrors } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";
import { presence, number as vnumber, dateRange, collect, hasErrors } from "@/lib/validate";

const STATUS_TONE = {
  planned: "slate", active: "sky", on_hold: "amber",
  delayed: "rose", completed: "green", cancelled: "slate",
};
const HEALTH_TONE = { on_track: "green", delayed: "rose", over_budget: "amber" };
const emptyForm = { name: "", description: "", budget: "", startDate: "", targetDate: "", affectedAreas: "", affectedPlots: "", vendorStaffId: "" };
const emptyUpdate = { title: "", note: "", percent: "", spent: "", isDelay: false };
const commentTone = { approved: "green", pending: "amber", hidden: "slate" };

export default function ProjectsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data: raw, meta, reload, loading } = useApi("/admin/projects", { status: filter });
  const projects = normalizeList(raw);
  const counts = meta?.counts ?? {};

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: vraw } = useApi("/admin/staff/eligible");
  const vendors = normalizeList(vraw);

  const [openId, setOpenId] = useState(null);
  const { data: detail, reload: reloadDetail } = useApi(openId ? `/admin/projects/${openId}` : null);
  const [upd, setUpd] = useState(emptyUpdate);
  const [busy, setBusy] = useState(false);
  const [updErrors, setUpdErrors] = useState({});
  const [ms, setMs] = useState({ title: "", dueOn: "" }); // new milestone
  const [msErrors, setMsErrors] = useState({});
  const [photoUrl, setPhotoUrl] = useState("");
  const [comment, setComment] = useState("");

  const addMilestone = async () => {
    const errs = collect({ title: presence(ms.title, "Milestone title") });
    setMsErrors(errs);
    if (hasErrors(errs)) return;
    try {
      await api.post(`/admin/projects/${openId}/milestones`, { title: ms.title.trim(), dueOn: ms.dueOn || null });
      setMs({ title: "", dueOn: "" });
      reloadDetail();
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setMsErrors(fe); else toast(e.message || "Could not add milestone", "error");
    }
  };
  const toggleMilestone = async (m) => {
    try { await api.post(`/admin/projects/${openId}/milestones/${m.id}/toggle`, {}); reloadDetail(); }
    catch (e) { toast(e.message || "Could not update", "error"); }
  };
  const deleteMilestone = async (m) => {
    try { await api.del(`/admin/projects/${openId}/milestones/${m.id}`); reloadDetail(); }
    catch (e) { toast(e.message || "Could not delete", "error"); }
  };
  const addPhoto = async () => {
    if (!photoUrl.trim()) return toast("Paste a photo URL", "error");
    try { await api.post(`/admin/projects/${openId}/photos`, { url: photoUrl.trim() }); setPhotoUrl(""); reloadDetail(); }
    catch (e) { toast(e.message || "Could not add photo", "error"); }
  };
  const addComment = async () => {
    if (!comment.trim()) return;
    try { await api.post(`/admin/projects/${openId}/comment`, { body: comment.trim() }); setComment(""); reloadDetail(); }
    catch (e) { toast(e.message || "Could not post", "error"); }
  };
  const moderate = async (c, status) => {
    try { await api.post(`/admin/projects/${openId}/comments/${c.id}/moderate`, { status }); reloadDetail(); }
    catch (e) { toast(e.message || "Could not update", "error"); }
  };
  const assignVendor = async (vendorStaffId) => {
    try { await api.put(`/admin/projects/${openId}`, { vendorStaffId: vendorStaffId ? Number(vendorStaffId) : null }); reloadDetail(); reload(); toast("Vendor updated"); }
    catch (e) { toast(e.message || "Could not assign", "error"); }
  };

  const createProject = async () => {
    const errs = collect({
      name: presence(form.name, "Project name"),
      budget: vnumber(form.budget, { positive: true, required: false, label: "Budget" }),
      targetDate: dateRange(form.startDate, form.targetDate),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    try {
      await api.post("/admin/projects", {
        name: form.name.trim(),
        description: form.description.trim() || null,
        budget: form.budget ? Number(form.budget) : 0,
        startDate: form.startDate || null,
        targetDate: form.targetDate || null,
        affectedAreas: form.affectedAreas ? form.affectedAreas.split(",").map((s) => s.trim()).filter(Boolean) : [],
        affectedPlots: form.affectedPlots ? form.affectedPlots.split(",").map((s) => s.trim()).filter(Boolean) : [],
        vendorStaffId: form.vendorStaffId ? Number(form.vendorStaffId) : null,
      });
      toast("Project created");
      setForm(emptyForm); setOpen(false); reload();
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setErrors(fe); else toast(e.message || "Could not create project", "error");
    } finally { setSaving(false); }
  };

  const postUpdate = async () => {
    const errs = collect({
      percent: vnumber(upd.percent, { min: 0, max: 100, required: false, label: "Progress %" }),
    });
    setUpdErrors(errs);
    if (hasErrors(errs)) return;
    setBusy(true);
    try {
      await api.post(`/admin/projects/${openId}/update`, {
        title: upd.title.trim() || null,
        note: upd.note.trim() || null,
        percent: upd.percent === "" ? null : Number(upd.percent),
        spent: upd.spent ? Number(upd.spent) : 0,
        isDelay: upd.isDelay,
      });
      toast("Update posted");
      setUpd(emptyUpdate);
      reloadDetail(); reload();
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setUpdErrors(fe); else toast(e.message || "Could not post update", "error");
    } finally { setBusy(false); }
  };

  const complete = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/projects/${openId}/complete`, {});
      toast("Project marked complete");
      reloadDetail(); reload();
    } catch (e) {
      toast(e.message || "Could not complete", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Projects"
        subtitle="Capital works — budget, progress, delays and records"
        actions={<Button icon="plus" onClick={() => { setForm(emptyForm); setErrors({}); setOpen(true); }}>New project</Button>}
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active" },
              { value: "delayed", label: "Delayed" },
              { value: "completed", label: "Completed", count: counts.completed },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Project</Th>
              <Th className="text-right">Budget</Th>
              <Th className="text-right">Spent</Th>
              <Th>Progress</Th>
              <Th>Target</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <Tr key={p.dbId} onClick={() => setOpenId(p.dbId)}>
                <Td>
                  <span className="font-medium text-slate-800">{p.name}</span>
                  {p.health !== "on_track" && (
                    <Badge tone={HEALTH_TONE[p.health] ?? "slate"} className="ml-2">{p.health?.replace("_", " ")}</Badge>
                  )}
                </Td>
                <Td className="text-right text-slate-600">{formatINR(p.budget)}</Td>
                <Td className="text-right text-slate-600">{formatINR(p.spent)}</Td>
                <Td className="w-40">
                  <div className="flex items-center gap-2">
                    <Progress value={p.progressPercent} className="flex-1" />
                    <span className="text-xs text-slate-500">{p.progressPercent}%</span>
                  </div>
                </Td>
                <Td className="text-slate-500">{p.targetDate ? formatDate(p.targetDate) : "—"}</Td>
                <Td><Badge tone={STATUS_TONE[p.status] ?? "slate"}>{p.status?.replace("_", " ")}</Badge></Td>
                <Td><Icon name="chevron-right" size={16} className="text-slate-300" /></Td>
              </Tr>
            ))}
            {projects.length === 0 && (
              <Tr>
                <Td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading projects…</>
                  ) : "No projects yet."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* Create */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New project"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="check" loading={saving} onClick={createProject}>Create</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Name" required error={errors.name}><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Clubhouse renovation" /></Field></div>
          <div className="sm:col-span-2"><Field label="Description"><textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <Field label="Budget (₹)" error={errors.budget}><input type="number" className={inputClass} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
          <Field label="Vendor / contractor">
            <select className={inputClass} value={form.vendorStaffId} onChange={(e) => setForm({ ...form, vendorStaffId: e.target.value })}>
              <option value="">{vendors.length ? "Unassigned" : "No verified vendors"}</option>
              {vendors.map((v) => <option key={v.dbId} value={v.dbId}>{v.name}</option>)}
            </select>
          </Field>
          <Field label="Affected areas" hint="Comma-separated"><input className={inputClass} value={form.affectedAreas} onChange={(e) => setForm({ ...form, affectedAreas: e.target.value })} placeholder="Clubhouse, Phase 2 road" /></Field>
          <Field label="Affected plots" hint="Comma-separated plot numbers"><input className={inputClass} value={form.affectedPlots} onChange={(e) => setForm({ ...form, affectedPlots: e.target.value })} placeholder="A-12, A-13" /></Field>
          <Field label="Start date"><input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="Target date" error={errors.targetDate}><input type="date" className={inputClass} value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
        </div>
      </Modal>

      {/* Detail + progress log */}
      <Drawer
        open={!!openId}
        onClose={() => setOpenId(null)}
        title={detail?.code ?? "Project"}
        subtitle={detail?.name}
        width="max-w-xl"
      >
        {!detail ? (
          <div className="py-10 text-center text-slate-400">
            <Icon name="loader-circle" size={18} className="inline animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[detail.status] ?? "slate"}>{detail.status?.replace("_", " ")}</Badge>
              <Badge tone={HEALTH_TONE[detail.health] ?? "slate"}>{detail.health?.replace("_", " ")}</Badge>
              {detail.vendorName && <Badge tone="violet">{detail.vendorName}</Badge>}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Budget" value={formatINR(detail.budget)} />
              <Stat label="Spent" value={formatINR(detail.spent)} />
              <Stat label="Progress" value={`${detail.progressPercent}%`} />
            </div>
            <Progress value={detail.progressPercent} />

            {detail.description && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{detail.description}</p>}
            {(detail.affectedAreas ?? []).length > 0 && (
              <p className="text-sm text-slate-500">Affects: {detail.affectedAreas.join(", ")}</p>
            )}
            {(detail.affectedPlots ?? []).length > 0 && (
              <p className="text-sm text-slate-500">Plots: {detail.affectedPlots.join(", ")}</p>
            )}

            {/* Vendor assignment */}
            <Field label="Vendor / contractor">
              <select className={inputClass} value={detail.vendorStaffId ?? ""} onChange={(e) => assignVendor(e.target.value)}>
                <option value="">{vendors.length ? "Unassigned" : "No verified vendors"}</option>
                {vendors.map((v) => <option key={v.dbId} value={v.dbId}>{v.name}</option>)}
              </select>
            </Field>

            {/* Milestones */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">Milestones</p>
              <div className="space-y-1.5">
                {(detail.milestones ?? []).length === 0 && <p className="text-xs text-slate-400">No milestones yet.</p>}
                {(detail.milestones ?? []).map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <button onClick={() => toggleMilestone(m)} className="shrink-0" title={m.status === "done" ? "Mark pending" : "Mark done"}>
                      <Icon name={m.status === "done" ? "check-square" : "square"} size={16} className={m.status === "done" ? "text-brand-600" : "text-slate-400"} />
                    </button>
                    <span className={"flex-1 text-sm " + (m.status === "done" ? "text-slate-400 line-through" : "text-slate-700")}>{m.title}</span>
                    {m.dueOn && <Badge tone={m.state === "overdue" ? "rose" : "slate"}>{formatDate(m.dueOn)}</Badge>}
                    <button onClick={() => deleteMilestone(m)} className="text-slate-300 hover:text-rose-500"><Icon name="x" size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <Field label="New milestone" error={msErrors.title}><input className={inputClass} value={ms.title} onChange={(e) => setMs({ ...ms, title: e.target.value })} placeholder="e.g. Tiling complete" /></Field>
                <input type="date" className={inputClass + " w-40"} value={ms.dueOn} onChange={(e) => setMs({ ...ms, dueOn: e.target.value })} />
                <Button size="sm" variant="secondary" icon="plus" onClick={addMilestone}>Add</Button>
              </div>
            </div>

            {/* Progress photos */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">Progress photos</p>
              <div className="flex flex-wrap gap-2">
                {(detail.photos ?? []).map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption || "progress"} className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                  </a>
                ))}
                {(detail.photos ?? []).length === 0 && <span className="text-xs text-slate-400">No photos yet.</span>}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <Field label="Add a photo (URL)"><input className={inputClass} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…/photo.jpg" /></Field>
                <Button size="sm" variant="secondary" icon="image-plus" onClick={addPhoto}>Add</Button>
              </div>
            </div>

            {detail.status !== "completed" && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">Post a progress update</p>
                <Field label="Title"><input className={inputClass} value={upd.title} onChange={(e) => setUpd({ ...upd, title: e.target.value })} placeholder="e.g. Foundation done" /></Field>
                <Field label="Note"><textarea className={inputClass} rows={2} value={upd.note} onChange={(e) => setUpd({ ...upd, note: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Progress %" error={updErrors.percent}><input type="number" min={0} max={100} className={inputClass} value={upd.percent} onChange={(e) => setUpd({ ...upd, percent: e.target.value })} /></Field>
                  <Field label="Spend this update (₹)"><input type="number" className={inputClass} value={upd.spent} onChange={(e) => setUpd({ ...upd, spent: e.target.value })} /></Field>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={upd.isDelay} onChange={(e) => setUpd({ ...upd, isDelay: e.target.checked })} /> Flag a delay
                </label>
                <div className="flex justify-between">
                  <Button variant="secondary" icon="circle-check-big" loading={busy} onClick={complete}>Mark complete</Button>
                  <Button icon="send" loading={busy} onClick={postUpdate}>Post update</Button>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Progress log</h3>
              <ol className="space-y-2 border-l border-slate-200 pl-4">
                {(detail.updates ?? []).map((u) => (
                  <li key={u.id} className="relative text-sm">
                    <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${u.isDelay ? "bg-rose-400" : "bg-brand-400"}`} />
                    <p className="font-medium text-slate-700">
                      {u.title || (u.isDelay ? "Delay flagged" : "Update")}
                      {u.percent != null && <span className="ml-2 text-xs text-slate-400">{u.percent}%</span>}
                    </p>
                    {u.note && <p className="text-slate-500">{u.note}</p>}
                    <p className="text-xs text-slate-400">
                      {u.authorName} · {formatDate(u.createdAt)}{u.spent ? ` · ${formatINR(u.spent)} spent` : ""}
                    </p>
                  </li>
                ))}
                {(detail.updates ?? []).length === 0 && <li className="text-sm text-slate-400">No updates yet.</li>}
              </ol>
            </div>

            {/* Discussion */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Discussion</h3>
              <div className="space-y-2">
                {(detail.comments ?? []).length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
                {(detail.comments ?? []).map((c) => (
                  <div key={c.id} className="rounded-lg bg-slate-50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700">{c.authorName}</span>
                      <div className="flex items-center gap-1">
                        <Badge tone={commentTone[c.status]}><span className="capitalize">{c.status}</span></Badge>
                        {c.status !== "approved" && <button onClick={() => moderate(c, "approved")} title="Approve" className="text-slate-400 hover:text-emerald-600"><Icon name="check" size={13} /></button>}
                        {c.status !== "hidden" && <button onClick={() => moderate(c, "hidden")} title="Hide" className="text-slate-400 hover:text-rose-600"><Icon name="eye-off" size={13} /></button>}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input className={inputClass} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reply as committee…" onKeyDown={(e) => e.key === "Enter" && addComment()} />
                <Button size="sm" icon="send" onClick={addComment}>Post</Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
