"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader, Card, Badge, Segmented, Table, Th, SortTh, Td, Tr, ConfirmDialog, Pagination, ActionMenu,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

export default function VenturesPage() {
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const c = useListControls();
  const q = useDebounced(search);
  const { data: raw, meta, reload, loading } = useApi("/super/ventures", { status: filter, search: q, ...c.query });
  const ventures = normalizeList(raw);
  const counts = meta?.counts ?? {};
  const totalPages = meta?.totalPages ?? 1;

  const [busyId, setBusyId] = useState(null);
  const [suspend, setSuspend] = useState(null); // venture pending suspension

  const setStatus = async (v, action) => {
    setBusyId(v.dbId);
    try {
      await api.post(`/super/ventures/${v.dbId}/${action}`, {});
      toast(`${v.name} ${action === "suspend" ? "suspended" : "activated"}`);
      setSuspend(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not update venture", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ventures"
        subtitle="Every workspace on the platform"
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={filter}
            onChange={(v) => { setFilter(v); c.setPage(1); }}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "suspended", label: "Suspended", count: counts.suspended },
            ]}
          />
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-64"
              placeholder="Search name or email"
              value={search}
              onChange={(e) => { setSearch(e.target.value); c.setPage(1); }}
            />
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <SortTh sortKey="name" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Venture</SortTh>
              <SortTh sortKey="email" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Email</SortTh>
              <Th className="text-right">Users</Th>
              <Th className="text-right">Plots</Th>
              <SortTh sortKey="created_at" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Created</SortTh>
              <SortTh sortKey="status" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Status</SortTh>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {ventures.map((v) => (
              <Tr key={v.id} className="cursor-pointer" onClick={() => router.push(`/super-admin/ventures/${v.dbId}`)}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name="building-2" size={15} />
                    </span>
                    <span className="font-medium text-slate-800">{v.name}</span>
                  </div>
                </Td>
                <Td className="text-slate-500">{v.email || "—"}</Td>
                <Td className="text-right text-slate-600">{v.users}</Td>
                <Td className="text-right text-slate-600">{v.plots}</Td>
                <Td className="text-slate-500">{formatDate(v.createdAt)}</Td>
                <Td>
                  <Badge tone={v.status === "active" ? "green" : "rose"}>{v.status}</Badge>
                </Td>
                <Td>
                  <ActionMenu
                    items={[
                      v.status === "active"
                        ? { label: "Suspend", icon: "pause", onClick: () => setSuspend(v) }
                        : { label: "Activate", icon: "play", loading: busyId === v.dbId, onClick: () => setStatus(v, "activate") },
                      { label: "View details", icon: "arrow-right", onClick: () => router.push(`/super-admin/ventures/${v.dbId}`) },
                    ]}
                  />
                </Td>
              </Tr>
            ))}
            {ventures.length === 0 && (
              <Tr>
                <Td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading ventures…</>
                  ) : (
                    "No ventures in this view."
                  )}
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
        <Pagination
          page={c.page}
          totalPages={totalPages}
          total={meta?.total}
          pageSize={c.pageSize}
          onPage={c.setPage}
          onPageSize={c.setPageSize}
        />
      </Card>

      <ConfirmDialog
        open={!!suspend}
        onClose={() => setSuspend(null)}
        onConfirm={() => setStatus(suspend, "suspend")}
        loading={busyId === suspend?.dbId}
        title="Suspend venture"
        confirmLabel="Suspend"
        message={`Suspend "${suspend?.name}"? The workspace is flagged suspended on the platform. Existing logins are not force-revoked.`}
      />
    </div>
  );
}
