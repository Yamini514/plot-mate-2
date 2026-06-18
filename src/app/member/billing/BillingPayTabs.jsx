"use client";

import { useState } from "react";
import { Breadcrumbs, Tabs } from "@/components/ui";
import { useApi } from "@/lib/useApi";
import { normalizeList } from "@/lib/api";
import { DuesPanel } from "./DuesPanel";
import { InvoicesPanel } from "./InvoicesPanel";
import { HistoryPanel } from "./HistoryPanel";

const LABELS = { dues: "Dues & Pay", invoices: "Invoices", history: "History" };

export function BillingPayTabs({ initial = "dues" }) {
  const [tab, setTab] = useState(initial);
  const { data: overview } = useApi("/member/billing");
  const upcomingCount = normalizeList(overview?.upcoming).length;
  const historyCount = normalizeList(overview?.history).length;

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/member" }, { label: "Me" }, { label: `Billing & Payments · ${LABELS[tab]}` }]} />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "dues", label: "Dues & Pay" },
            { value: "invoices", label: "Invoices", count: upcomingCount || undefined },
            { value: "history", label: "History", count: historyCount || undefined },
          ]}
        />
      </div>
      {tab === "dues" && <DuesPanel />}
      {tab === "invoices" && <InvoicesPanel />}
      {tab === "history" && <HistoryPanel />}
    </div>
  );
}
