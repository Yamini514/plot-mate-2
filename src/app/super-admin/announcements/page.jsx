"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, SortTh, Td, Tr,
  Modal, ConfirmDialog, Field, inputClass, Pagination,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { text as vtext, presence, dateRange, collect, hasErrors } from "@/lib/validate";

const PRIORITY_TONE = { low: "slate", normal: "sky", high: "amber", critical: "rose" };
const STATUS_TONE = { draft: "slate", scheduled: "amber", published: "green" };

const EMPTY = {
  title: "", message: "", priority: "normal", audience: "all",
  clientIds: [], startAt: "", endAt: "", status: "draft",
};

export default function AnnouncementsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const c = useListControls();
  const q = useDebounced(search);
  const { data: raw, meta, reload, loading } = useApi("/super/announcements", {
    status: filter, search: q, ...c.query,
  });
  const items = normalizeList(raw);
  const counts = meta?.counts ?? {};
  const totalPages = meta?.totalPages ?? 1;

  // Ventures for the "selected audience" picker.
  const { data: ventureRaw } = useApi("/super/ventures", { page_size: 300 });
  const ventures = normalizeList(ventureRaw);

  const [form, setForm] = useState(null);     // edit/create draft (null = closed)
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => { setForm({ ...EMPTY }); setErrors({}); };
  const openEdit = (a) => {
    setForm({
      dbId: a.dbId, title: a.title || "", message: a.message || "",
      priority: a.priority || "normal", audience: a.audience || "all",
      clientIds: (a.clientIds || []).map(Number),
      startAt: a.startAt ? a.startAt.slice(0, 16) : "",
      endAt: a.endAt ? a.endAt.slice(0, 16) : "",
      status: a.status === "published" ? "published" : a.status || "draft",
    });
    setErrors({});
  };

  const validateForm = () => {
    const errs = collect({
      title: vtext(form.title, { max: 160, label: "Title" }),
      message: presence(form.message, "Message"),
      endAt: dateRange(form.startAt, form.endAt),
      clientIds: form.audience === "selected" && form.clientIds.length === 0 ? "Select at least one venture" : "",
    });
    setErrors(errs);
    return !hasErrors(errs);
  };

  const save = async () => {
    if (!validateForm()) return;
    setBusy(true);
    const body = {
      title: form.title.trim(), message: form.message.trim(), priority: form.priority,
      audience: form.audience, clientIds: form.audience === "selected" ? form.clientIds : [],
      startAt: form.startAt || null, endAt: form.endAt || null,
      status: form.status === "published" ? undefined : form.status,
    };
    try {
      if (form.dbId) await api.put(`/super/announcements/${form.dbId}`, body);
      else await api.post("/super/announcements", body);
      toast(form.dbId ? "Announcement updated" : "Announcement created");
      setForm(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not save", "error");
    } finally { setBusy(false); }
  };

  const publish = async (a) => {
    setBusy(true);
    try {
      await api.post(`/super/announcements/${a.dbId}/publish`, {});
      toast("Published");
      reload();
    } catch (e) {
      toast(e.message || "Could not publish", "error");
    } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.del(`/super/announcements/${del.dbId}`);
      toast("Deleted");
      setDel(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete", "error");
    } finally { setBusy(false); }
  };

  const toggleVenture = (id) =>
    set({ clientIds: form.clientIds.includes(id) ? form.clientIds.filter((x) => x !== id) : [...form.clientIds, id] });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notification Center"
        subtitle="Broadcast announcements to ventures across the platform"
        actions={<Button icon="plus" onClick={openCreate}>New announcement</Button>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={filter}
            onChange={(v) => { setFilter(v); c.setPage(1); }}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "draft", label: "Draft", count: counts.draft },
              { value: "scheduled", label: "Scheduled", count: counts.scheduled },
              { value: "published", label: "Published", count: counts.published },
            ]}
          />
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-64"
              placeholder="Search title or message"
              value={search}
              onChange={(e) => { setSearch(e.target.value); c.setPage(1); }}
            />
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <SortTh sortKey="title" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Title</SortTh>
              <SortTh sortKey="priority" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Priority</SortTh>
              <Th>Audience</Th>
              <SortTh sortKey="start_at" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Window</SortTh>
              <SortTh sortKey="status" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Status</SortTh>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <Tr key={a.dbId}>
                <Td>
                  <span className="font-medium text-slate-800">{a.title}</span>
                  <span className="block max-w-md truncate text-xs text-slate-400">{a.message}</span>
                </Td>
                <Td><Badge tone={PRIORITY_TONE[a.priority] ?? "slate"}>{a.priority}</Badge></Td>
                <Td className="text-slate-600">{a.audience === "all" ? "All ventures" : `${(a.clientIds || []).length} selected`}</Td>
                <Td className="text-xs text-slate-500">
                  {a.startAt ? formatDate(a.startAt) : "—"}{a.endAt ? ` → ${formatDate(a.endAt)}` : ""}
                </Td>
                <Td><Badge tone={STATUS_TONE[a.status] ?? "slate"}>{a.status}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    {a.status !== "published" && (
                      <Button variant="secondary" icon="send" loading={busy} onClick={() => publish(a)}>Publish</Button>
                    )}
                    <Button variant="secondary" icon="pencil" onClick={() => openEdit(a)}>Edit</Button>
                    <Button variant="ghost" icon="trash-2" onClick={() => setDel(a)} />
                  </div>
                </Td>
              </Tr>
            ))}
            {items.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading…</>
                  ) : "No announcements yet."}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
        <Pagination page={c.page} totalPages={totalPages} total={meta?.total} pageSize={c.pageSize} onPage={c.setPage} onPageSize={c.setPageSize} />
      </Card>

      {/* Create / edit */}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.dbId ? "Edit announcement" : "New announcement"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
            <Button icon="check" loading={busy} onClick={save}>Save</Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Title" required error={errors.title}>
              <input className={inputClass} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Scheduled maintenance window" />
            </Field>
            <Field label="Message" required error={errors.message}>
              <textarea className={inputClass} rows={4} value={form.message} onChange={(e) => set({ message: e.target.value })} placeholder="What do ventures need to know?" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority">
                <select className={inputClass} value={form.priority} onChange={(e) => set({ priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => set({ status: e.target.value })} disabled={form.status === "published"}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  {form.status === "published" && <option value="published">Published</option>}
                </select>
              </Field>
              <Field label="Start date" error={undefined}>
                <input type="datetime-local" className={inputClass} value={form.startAt} onChange={(e) => set({ startAt: e.target.value })} />
              </Field>
              <Field label="End date" error={errors.endAt}>
                <input type="datetime-local" className={inputClass} value={form.endAt} onChange={(e) => set({ endAt: e.target.value })} />
              </Field>
            </div>

            <Field label="Audience">
              <Segmented
                value={form.audience}
                onChange={(v) => set({ audience: v })}
                options={[{ value: "all", label: "All ventures" }, { value: "selected", label: "Selected ventures" }]}
              />
            </Field>
            {form.audience === "selected" && (
              <div>
                {errors.clientIds && <p className="mb-1 text-xs text-rose-500">{errors.clientIds}</p>}
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {ventures.length === 0 ? (
                    <p className="p-2 text-sm text-slate-400">No ventures available.</p>
                  ) : ventures.map((v) => (
                    <label key={v.dbId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                      <input type="checkbox" checked={form.clientIds.includes(v.dbId)} onChange={() => toggleVenture(v.dbId)} />
                      {v.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete announcement"
        confirmLabel="Delete"
        message={`Delete "${del?.title}"? This can't be undone.`}
      />
    </div>
  );
}
