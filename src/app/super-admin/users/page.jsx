"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, SortTh, Td, Tr, Modal, Field, inputClass, Pagination, ActionMenu,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/useApi";
import { useListControls } from "@/lib/useList";
import { useToast } from "@/components/Toast";

const ROLE_LABEL = { 0: "Owner", 1: "Guard", 2: "Venture Admin", 3: "Super Admin" };
const ROLE_TONE = { 0: "slate", 1: "sky", 2: "violet", 3: "brand" };

export default function PlatformUsersPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const c = useListControls();
  const q = useDebounced(search);
  const { data: raw, meta, reload, loading } = useApi("/super/users", {
    status: filter, role, search: q, ...c.query,
  });
  const users = normalizeList(raw);
  const counts = meta?.counts ?? {};
  const totalPages = meta?.totalPages ?? 1;

  const [busyId, setBusyId] = useState(null);
  const [block, setBlock] = useState(null);   // user pending block
  const [reason, setReason] = useState("");
  const [creds, setCreds] = useState(null);

  const doBlock = async () => {
    if (!block) return;
    setBusyId(block.dbId);
    try {
      await api.post(`/super/users/${block.dbId}/block`, { reason: reason.trim() || null });
      toast(`${block.fullName} blocked`);
      setBlock(null); setReason("");
      reload();
    } catch (e) {
      toast(e.message || "Could not block user", "error");
    } finally { setBusyId(null); }
  };

  const unblock = async (u) => {
    setBusyId(u.dbId);
    try {
      await api.post(`/super/users/${u.dbId}/unblock`, {});
      toast(`${u.fullName} unblocked`);
      reload();
    } catch (e) {
      toast(e.message || "Could not unblock user", "error");
    } finally { setBusyId(null); }
  };

  const resetPw = async (u) => {
    setBusyId(u.dbId);
    try {
      const { data } = await api.post(`/super/users/${u.dbId}/reset-password`, {});
      setCreds({ email: u.email, tempPassword: data?.tempPassword });
      reload();
    } catch (e) {
      toast(e.message || "Could not reset password", "error");
    } finally { setBusyId(null); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Users" subtitle="Every user across every venture" />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            value={filter}
            onChange={(v) => { setFilter(v); c.setPage(1); }}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "blocked", label: "Blocked", count: counts.blocked },
            ]}
          />
          <div className="flex gap-2">
            <select className={`${inputClass} w-40`} value={role} onChange={(e) => { setRole(e.target.value); c.setPage(1); }}>
              <option value="">All roles</option>
              <option value="0">Owners</option>
              <option value="1">Guards</option>
              <option value="2">Venture Admins</option>
            </select>
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
        </div>
        <Table>
          <thead>
            <tr>
              <SortTh sortKey="name" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>User</SortTh>
              <SortTh sortKey="role" sort={c.sort} dir={c.dir} onSort={c.toggleSort}>Role</SortTh>
              <Th>Venture</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <Tr key={u.dbId}>
                <Td>
                  <span className="font-medium text-slate-800">{u.fullName}</span>
                  <span className="block text-xs text-slate-400">{u.email}</span>
                </Td>
                <Td><Badge tone={ROLE_TONE[u.role] ?? "slate"}>{ROLE_LABEL[u.role] ?? u.roleName}</Badge></Td>
                <Td className="text-slate-600">{u.venture || "—"}</Td>
                <Td>
                  {u.active ? (
                    <Badge tone="green">active</Badge>
                  ) : (
                    <Badge tone="rose" title={u.blockReason || ""}>blocked</Badge>
                  )}
                </Td>
                <Td>
                  <ActionMenu
                    items={[
                      { label: "Reset password", icon: "key-round", loading: busyId === u.dbId, onClick: () => resetPw(u) },
                      u.active
                        ? { label: "Block", icon: "ban", tone: "danger", onClick: () => { setBlock(u); setReason(""); } }
                        : { label: "Unblock", icon: "circle-check", loading: busyId === u.dbId, onClick: () => unblock(u) },
                    ]}
                  />
                </Td>
              </Tr>
            ))}
            {users.length === 0 && (
              <Tr>
                <Td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                  {loading ? (
                    <><Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Loading users…</>
                  ) : "No users in this view."}
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
        open={!!block}
        onClose={() => setBlock(null)}
        title={`Block · ${block?.fullName ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBlock(null)}>Cancel</Button>
            <Button variant="danger" icon="ban" loading={busyId === block?.dbId} onClick={doBlock}>Block user</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Blocking signs <span className="font-medium text-slate-800">{block?.email}</span> out and prevents
          sign-in until unblocked. The reason is recorded in the audit trail.
        </p>
        <div className="mt-4">
          <Field label="Reason (optional)">
            <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this account being blocked?" />
          </Field>
        </div>
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
