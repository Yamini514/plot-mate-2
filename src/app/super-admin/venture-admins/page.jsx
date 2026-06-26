"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, SortTh, Td, Tr, Modal, Pagination,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

export default function VentureAdminsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const c = useListControls();
  const q = useDebounced(search);
  const { data: raw, meta, reload, loading } = useApi("/super/venture-admins", { status: filter, search: q, ...c.query });
  const admins = normalizeList(raw);
  const counts = meta?.counts ?? {};
  const totalPages = meta?.totalPages ?? 1;

  const [busyId, setBusyId] = useState(null);
  const [reset, setReset] = useState(null);        // admin pending reset
  const [creds, setCreds] = useState(null);         // { email, tempPassword }

  const toggle = async (a) => {
    const action = a.active ? "deactivate" : "activate";
    setBusyId(a.dbId);
    try {
      await api.post(`/super/venture-admins/${a.dbId}/${action}`, {});
      toast(`${a.fullName} ${action}d`);
      reload();
    } catch (e) {
      toast(e.message || "Could not update admin", "error");
    } finally {
      setBusyId(null);
    }
  };

  const doReset = async () => {
    if (!reset) return;
    setBusyId(reset.dbId);
    try {
      const { data } = await api.post(`/super/venture-admins/${reset.dbId}/reset-password`, {});
      setCreds({ email: reset.email, tempPassword: data?.tempPassword });
      setReset(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not reset password", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Venture admins" subtitle="The Venture Admin (role 2) of every workspace" />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            value={filter}
            onChange={(v) => { setFilter(v); c.setPage(1); }}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "inactive", label: "Inactive", count: counts.inactive },
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
              <SortTh sortKey="name" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Admin</SortTh>
              <Th>Venture</Th>
              <Th>Phone</Th>
              <Th>Last login</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <Tr key={a.dbId}>
                <Td>
                  <span className="font-medium text-slate-800">{a.fullName}</span>
                  <span className="block text-xs text-slate-400">{a.email}</span>
                </Td>
                <Td className="text-slate-600">{a.venture || "—"}</Td>
                <Td className="text-slate-500">{a.phoneNumber || "—"}</Td>
                <Td className="text-slate-500">{a.lastLoggedInAt ? formatDate(a.lastLoggedInAt) : "—"}</Td>
                <Td><Badge tone={a.active ? "green" : "slate"}>{a.active ? "active" : "inactive"}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1.5">
                    <Button variant="secondary" icon="key-round" onClick={() => setReset(a)}>Reset</Button>
                    {a.active ? (
                      <Button variant="secondary" icon="user-x" loading={busyId === a.dbId} onClick={() => toggle(a)}>Deactivate</Button>
                    ) : (
                      <Button icon="user-check" loading={busyId === a.dbId} onClick={() => toggle(a)}>Activate</Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
            {admins.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading admins…</>
                  ) : "No venture admins in this view."}
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

      <Modal
        open={!!reset}
        onClose={() => setReset(null)}
        title={`Reset password · ${reset?.fullName ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReset(null)}>Cancel</Button>
            <Button icon="key-round" loading={busyId === reset?.dbId} onClick={doReset}>Generate temp password</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          A one-time temporary password is generated for <span className="font-medium text-slate-800">{reset?.email}</span>.
          Share it securely — the admin can reset it after signing in.
        </p>
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
