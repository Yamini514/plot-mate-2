"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  Segmented,
  Modal,
  Avatar,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { owners as allOwners, stats, association } from "@/lib/mock-data";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusColor = {
  paid: "bg-brand-500 hover:bg-brand-600 text-white",
  pending: "bg-amber-400 hover:bg-amber-500 text-white",
  unknown: "bg-slate-200 hover:bg-slate-300 text-slate-500",
};

export default function PlotMapPage() {
  const [filter, setFilter] = useState("all");
  const [phase, setPhase] = useState("all");
  const [selected, setSelected] = useState(null);
  const toast = useToast();

  const phases = useMemo(
    () => ["all", ...Array.from(new Set(allOwners.map((o) => o.phase))).sort()],
    [],
  );

  const dimmed = (o) =>
    (filter !== "all" && o.paymentStatus !== filter) ||
    (phase !== "all" && o.phase !== phase);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Plot Map"
        subtitle={`Visual layout of all ${association.totalPlots} plots, colour-coded by payment status`}
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={() => toast("Plot map downloaded (PNG)")}>
              Download map
            </Button>
            <Button variant="secondary" icon="maximize-2" onClick={() => toast("Full-screen view is not available in this demo", "info")}>
              Full screen
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
              { value: "unknown", label: "Unknown" },
            ]}
          />
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
          >
            {phases.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "All phases" : p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <Legend color="bg-brand-500" label={`Paid (${stats.paidCount})`} />
          <Legend color="bg-amber-400" label={`Pending (${stats.pendingCount})`} />
          <Legend color="bg-slate-200" label={`Unknown (${stats.unknownCount})`} />
        </div>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5 sm:gap-2">
          {allOwners.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              title={`${o.plotNo} · ${o.name ?? "Unregistered"}`}
              className={cn(
                "aspect-square rounded-md text-[9px] font-semibold transition-all sm:text-[10px]",
                statusColor[o.paymentStatus],
                dimmed(o) && "opacity-20",
              )}
            >
              {o.plotNo.replace("P-", "")}
            </button>
          ))}
        </div>
      </Card>

      <p className="mt-3 text-center text-xs text-slate-400">
        Click any plot to view owner details and send a reminder.
      </p>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Plot ${selected?.plotNo}`}
        footer={
          <>
            <Button variant="secondary" icon="receipt" onClick={() => toast(`Opening receipts for ${selected?.plotNo}`, "info")}>
              Receipts
            </Button>
            <Button icon="send" onClick={() => { toast(`Reminder sent to ${selected?.name ?? selected?.plotNo}`); setSelected(null); }}>
              Send reminder
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={selected.name ?? "NA"} size={44} />
              <div>
                <p className="font-semibold text-slate-800">
                  {selected.name ?? "Not registered"}
                </p>
                <p className="text-sm text-slate-500">
                  {selected.phase} · {selected.sizeSqyd} sqyd
                </p>
              </div>
              <span className="ml-auto">
                <StatusBadge status={selected.paymentStatus} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="font-medium text-slate-700">{selected.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Amount due</p>
                <p className="font-medium text-slate-700">
                  {selected.amountDue > 0 ? formatINR(selected.amountDue) : "Cleared"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded", color)} />
      {label}
    </span>
  );
}
