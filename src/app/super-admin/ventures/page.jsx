"use client";

import { useState } from "react";
import {
  PageHeader, Card, Button, Badge, Segmented, Table, Th, Td, Tr, ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

export default function VenturesPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const { data: raw, meta, reload, loading } = useApi("/super/ventures", { status: filter });
  const ventures = normalizeList(raw);
  const counts = meta?.counts ?? {};

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
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "suspended", label: "Suspended", count: counts.suspended },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Venture</Th>
              <Th>Email</Th>
              <Th className="text-right">Users</Th>
              <Th className="text-right">Plots</Th>
              <Th>Created</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {ventures.map((v) => (
              <Tr key={v.id}>
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
                  <div className="flex justify-end">
                    {v.status === "active" ? (
                      <Button variant="secondary" icon="pause" onClick={() => setSuspend(v)}>
                        Suspend
                      </Button>
                    ) : (
                      <Button icon="play" loading={busyId === v.dbId} onClick={() => setStatus(v, "activate")}>
                        Activate
                      </Button>
                    )}
                  </div>
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
