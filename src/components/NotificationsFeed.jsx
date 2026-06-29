"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, Button, Badge, Segmented, EmptyState, Pagination } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const KIND_ICON = {
  payment: "indian-rupee", complaint: "message-square-warning", document: "folder",
  notice: "megaphone", project: "hammer", support: "life-buoy", work_order: "clipboard-list",
  plot_claim: "file-search", ownership_transfer: "arrow-left-right",
};

// Shared notification center for any role. `base` is the API/route prefix
// ("/member" or "/vendor"); the backend Notifications service is user-scoped.
export function NotificationsFeed({ base = "/member", subtitle }) {
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const c = useListControls();
  const { data: raw, meta, reload, loading } = useApi(`${base}/notifications`, {
    unread: filter === "unread" ? "true" : undefined, ...c.query,
  });
  const items = Array.isArray(raw) ? raw : [];
  const unread = meta?.unread ?? 0;
  const [busy, setBusy] = useState(false);

  const open = async (n) => {
    if (!n.read) { try { await api.post(`${base}/notifications/${n.id}/read`, {}); reload(); } catch { /* ignore */ } }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    setBusy(true);
    try { await api.post(`${base}/notifications/read-all`, {}); toast("All marked read"); reload(); }
    catch (e) { toast(e.message || "Could not update", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={subtitle || "Your updates"}
        actions={unread > 0 ? <Button variant="secondary" icon="check-check" loading={busy} onClick={markAll}>Mark all read</Button> : null}
      />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented value={filter} onChange={(v) => { setFilter(v); c.setPage(1); }}
            options={[{ value: "all", label: "All" }, { value: "unread", label: "Unread", count: unread || undefined }]} />
        </div>
        {items.length === 0 ? (
          <EmptyState icon="bell-off" title="No notifications" subtitle={filter === "unread" ? "You're all caught up." : "You'll see updates here."} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${n.read ? "" : "bg-brand-50/40"}`}>
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${n.read ? "bg-slate-100 text-slate-500" : "bg-brand-100 text-brand-700"}`}>
                    <Icon name={KIND_ICON[n.kind] ?? "bell"} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read ? "text-slate-700" : "font-semibold text-slate-900"}`}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.read && <Badge tone="brand">new</Badge>}
                </button>
              </li>
            ))}
            {loading && items.length === 0 && (
              <li className="py-10 text-center text-sm text-slate-400"><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading…</li>
            )}
          </ul>
        )}
        <Pagination page={c.page} totalPages={meta?.totalPages ?? 1} total={meta?.total} pageSize={c.pageSize} onPage={c.setPage} onPageSize={c.setPageSize} />
      </Card>
    </div>
  );
}
