"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  CardHeader,
  Button,
  StatCard,
  StatusBadge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { deliveries as seed } from "@/lib/guard-data";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "waiting", label: "Awaiting pickup" },
  { value: "delivered", label: "Delivered" },
];

const courierIcon = {
  Amazon: "package",
  Flipkart: "shopping-bag",
  "Blue Dart": "truck",
  Swiggy: "bike",
  "Swiggy Instamart": "bike",
  Zepto: "bike",
  DTDC: "truck",
  Delhivery: "truck",
  Ekart: "truck",
};

export default function DeliveryTracking() {
  const toast = useToast();
  const [rows, setRows] = useState(seed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const waiting = rows.filter((r) => r.status === "waiting" || r.status === "received");

  const filtered = rows.filter((d) => {
    const matchQ =
      !query ||
      [d.id, d.courier, d.agent, d.resident, d.flat].join(" ").toLowerCase().includes(query.toLowerCase());
    const matchF = filter === "all" || d.status === filter;
    return matchQ && matchF;
  });

  const handover = (id, resident) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: "delivered", delivered: "Just now" } : r)));
    toast(`Package handed over to ${resident}`);
  };

  const logPackage = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newRow = {
      id: `PKG-${7751 + rows.length}`,
      courier: f.get("courier") || "Other",
      agent: f.get("agent") || "—",
      resident: f.get("resident") || "—",
      flat: f.get("flat") || "—",
      received: "Just now",
      delivered: "—",
      status: "received",
    };
    setRows((rs) => [newRow, ...rs]);
    setOpen(false);
    toast(`Package ${newRow.id} logged for ${newRow.resident}`);
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "Gate" }, { label: "Deliveries" }]} />
      <PageHeader
        title="Delivery Tracking"
        subtitle="Track courier and vendor packages received at the gate"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast("Delivery log exported")}>
              Export
            </Button>
            <Button icon="package-plus" onClick={() => setOpen(true)}>
              Log Package
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Received today" value={rows.length} icon="package" tone="sky" />
        <StatCard label="Awaiting pickup" value={waiting.length} icon="package-search" tone="amber" hint="Held at gate desk" />
        <StatCard label="Delivered today" value={counts.delivered ?? 0} icon="package-check" tone="brand" />
        <StatCard label="Avg. hold time" value="38 min" icon="timer" tone="violet" hint="Receipt → handover" />
      </div>

      {/* Packages waiting for pickup highlight card */}
      <Card className="mb-4">
        <CardHeader
          title="Packages waiting for pickup"
          subtitle={`${waiting.length} packages held at the gate`}
          icon="package-search"
          action={<span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{waiting.length} pending</span>}
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {waiting.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Icon name={courierIcon[d.courier] ?? "package"} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{d.resident}</p>
                <p className="truncate text-xs text-slate-400">{d.flat} · {d.courier} · {d.id}</p>
              </div>
              <Button size="sm" variant="secondary" icon="check" onClick={() => handover(d.id, d.resident)}>
                Handover
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Toolbar */}
      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:max-w-sm">
            <Icon name="search" size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search package ID, courier, flat…"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <Segmented options={FILTERS.map((f) => ({ ...f, count: counts[f.value] ?? 0 }))} value={filter} onChange={setFilter} />
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon="package" title="No packages found" subtitle="Adjust your search or filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Package ID</Th>
                <Th>Courier</Th>
                <Th>Resident</Th>
                <Th>Flat / Plot</Th>
                <Th>Received</Th>
                <Th>Delivered</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <Tr key={d.id}>
                  <Td className="font-medium text-slate-800">{d.id}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Icon name={courierIcon[d.courier] ?? "package"} size={15} className="text-slate-400" />
                      <span className="text-slate-700">{d.courier}</span>
                    </div>
                    <p className="ml-6 text-xs text-slate-400">{d.agent}</p>
                  </Td>
                  <Td className="text-slate-700">{d.resident}</Td>
                  <Td className="text-slate-500">{d.flat}</Td>
                  <Td className="text-slate-500">{d.received}</Td>
                  <Td className="text-slate-500">{d.delivered}</Td>
                  <Td><StatusBadge status={d.status} /></Td>
                  <Td className="text-right">
                    {d.status !== "delivered" ? (
                      <Button size="sm" variant="secondary" icon="check" onClick={() => handover(d.id, d.resident)}>
                        Handover
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400">Completed</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Log package modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log a Package"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="log-package" icon="package-plus">Log Package</Button>
          </>
        }
      >
        <form id="log-package" onSubmit={logPackage} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Courier / Vendor">
            <input name="courier" required className={inputClass} placeholder="e.g. Amazon, Blue Dart" />
          </Field>
          <Field label="Delivery agent (optional)">
            <input name="agent" className={inputClass} placeholder="e.g. Sameer K." />
          </Field>
          <Field label="Resident">
            <input name="resident" required className={inputClass} placeholder="e.g. Rohan Gupta" />
          </Field>
          <Field label="Flat / Plot no.">
            <input name="flat" required className={inputClass} placeholder="e.g. P-077" />
          </Field>
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 sm:col-span-2">
            <Icon name="info" size={14} />
            The package is held at the gate desk until the resident collects it or you mark it handed over.
          </div>
        </form>
      </Modal>
    </div>
  );
}
