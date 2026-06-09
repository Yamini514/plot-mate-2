"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  StatCard,
  Segmented,
  Modal,
  Avatar,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const catIcon = {
  Roads: "construction",
  Water: "droplets",
  Electricity: "zap",
  Security: "shield",
  Cleanliness: "trash-2",
  Other: "circle-help",
};

export default function ComplaintsPage() {
  const { complaints: allComplaints, updateComplaint } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const counts = useMemo(() => {
    return {
      open: allComplaints.filter((c) => c.status === "open").length,
      in_progress: allComplaints.filter((c) => c.status === "in_progress").length,
      resolved: allComplaints.filter((c) => c.status === "resolved").length,
      high: allComplaints.filter((c) => c.priority === "high").length,
    };
  }, [allComplaints]);

  const filtered = allComplaints.filter(
    (c) => filter === "all" || c.status === filter,
  );

  const resolve = () => {
    if (!selected) return;
    updateComplaint(selected.id, { status: "resolved", updatedAt: "2025-06-09" });
    toast(`${selected.id} marked resolved`);
    setSelected(null);
  };
  const assign = () => {
    if (!selected) return;
    updateComplaint(selected.id, {
      status: selected.status === "open" ? "in_progress" : selected.status,
      assignedTo: "Maintenance Team",
    });
    toast(`${selected.id} assigned to Maintenance Team`);
    setSelected(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Complaints"
        subtitle="Resident-reported issues and resolution tracking"
        actions={<Button variant="secondary" icon="download" onClick={() => toast(`Exported ${filtered.length} complaints`)}>Export</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open" value={`${counts.open}`} icon="circle-dot" tone="rose" />
        <StatCard label="In progress" value={`${counts.in_progress}`} icon="loader" tone="amber" />
        <StatCard label="Resolved" value={`${counts.resolved}`} icon="circle-check-big" tone="brand" />
        <StatCard label="High priority" value={`${counts.high}`} icon="flame" tone="rose" />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: allComplaints.length },
              { value: "open", label: "Open", count: counts.open },
              { value: "in_progress", label: "In progress", count: counts.in_progress },
              { value: "resolved", label: "Resolved", count: counts.resolved },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="party-popper" title="Nothing here" subtitle="No complaints with this status." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Issue</Th>
                <Th>Category</Th>
                <Th>Raised by</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <Tr key={c.id} onClick={() => setSelected(c)}>
                  <Td className="font-mono text-xs text-slate-400">{c.id}</Td>
                  <Td className="font-medium text-slate-800">{c.title}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <Icon name={catIcon[c.category] ?? "circle-help"} size={14} />
                      {c.category}
                    </span>
                  </Td>
                  <Td className="text-slate-500">
                    {c.raisedBy} · {c.plotNo}
                  </Td>
                  <Td>
                    <StatusBadge status={c.priority} />
                  </Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td className="text-slate-500">{formatDate(c.updatedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        wide
        footer={
          <>
            <Button variant="secondary" icon="user-check" onClick={assign}>
              Assign
            </Button>
            <Button icon="circle-check-big" onClick={resolve}>Mark resolved</Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="slate">{selected.id}</Badge>
              <StatusBadge status={selected.status} />
              <StatusBadge status={selected.priority} />
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <Icon name={catIcon[selected.category] ?? "circle-help"} size={14} />
                {selected.category}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              {selected.description}
            </p>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Avatar name={selected.raisedBy} size={40} />
              <div>
                <p className="text-sm font-medium text-slate-700">{selected.raisedBy}</p>
                <p className="text-xs text-slate-400">
                  Plot {selected.plotNo} · raised {formatDate(selected.createdAt)}
                </p>
              </div>
              {selected.assignedTo && (
                <span className="ml-auto text-right">
                  <p className="text-xs text-slate-400">Assigned to</p>
                  <p className="text-sm font-medium text-slate-700">{selected.assignedTo}</p>
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
