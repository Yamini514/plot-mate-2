"use client";

import { useState } from "react";
import { PageHeader, Breadcrumbs, Card, Button, Badge, Segmented, Table, Th, Td, Tr, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useApi, useDebounced } from "@/lib/useApi";
import { formatDate, downloadCSV, printReport } from "@/lib/utils";

const KIND_TONE = { visitor: "sky", delivery: "violet", vehicle: "amber", domestic: "slate" };
const KIND_ICON = { visitor: "users-round", delivery: "package", vehicle: "car", domestic: "hard-hat" };

export default function GateRegisterPage() {
  const [kind, setKind] = useState("");
  const [rejected, setRejected] = useState(false);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data: raw, loading } = useApi("/guard/gate-register", { kind: kind || undefined, rejected: rejected ? "true" : undefined, search: q });
  const rows = Array.isArray(raw) ? raw : [];

  const COLUMNS = [
    { label: "Type", get: (r) => r.kind }, { label: "Ref", get: (r) => r.code },
    { label: "Name", get: (r) => r.name }, { label: "Detail", get: (r) => r.detail },
    { label: "Status", get: (r) => r.status }, { label: "Entry", get: (r) => r.at },
    { label: "Exit", get: (r) => r.exitAt },
  ];

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Gate" }, { label: "Register" }]} />
      <PageHeader title="Gate Register" subtitle="Unified, searchable log of everyone in and out"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon="file-text" disabled={!rows.length} onClick={() => downloadCSV("gate-register.csv", rows, COLUMNS)}>CSV</Button>
            <Button variant="secondary" icon="printer" disabled={!rows.length} onClick={() => printReport("Gate Register", rows, COLUMNS, `${rows.length} entries`)}>PDF</Button>
          </div>
        } />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented value={kind} onChange={setKind} options={[
            { value: "", label: "All" }, { value: "visitor", label: "Visitors" },
            { value: "delivery", label: "Deliveries" }, { value: "vehicle", label: "Vehicles" },
            { value: "domestic", label: "Staff" },
          ]} />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" checked={rejected} onChange={(e) => setRejected(e.target.checked)} /> Rejected only</label>
            <div className="relative">
              <Icon name="search" size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm sm:w-64" placeholder="Search name / ref / plot" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon="scroll-text" title="No entries" subtitle={loading ? "Loading…" : "Gate activity appears here."} />
        ) : (
          <Table>
            <thead><tr><Th>Type</Th><Th>Name</Th><Th>Detail</Th><Th>Status</Th><Th>Entry</Th><Th>Exit</Th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <Tr key={`${r.kind}-${r.code}-${i}`}>
                  <Td><span className="inline-flex items-center gap-1.5"><Icon name={KIND_ICON[r.kind] ?? "dot"} size={14} className="text-slate-400" /><Badge tone={KIND_TONE[r.kind] ?? "slate"}>{r.kind}</Badge></span></Td>
                  <Td><span className="font-medium text-slate-800">{r.name || "—"}</span><span className="block text-xs text-slate-400">{r.code}</span></Td>
                  <Td className="text-slate-600">{r.detail || "—"}</Td>
                  <Td><Badge tone={r.status === "rejected" ? "rose" : "slate"}>{r.status}</Badge></Td>
                  <Td className="text-slate-500">{r.at ? formatDate(r.at) : "—"}</Td>
                  <Td className="text-slate-500">{r.exitAt ? formatDate(r.exitAt) : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
