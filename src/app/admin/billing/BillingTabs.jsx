"use client";

import { useState } from "react";
import { Breadcrumbs, Tabs } from "@/components/ui";
import { useApi } from "@/lib/useApi";
import { BillingOverview } from "./BillingOverview";
import { InvoicesPanel } from "./InvoicesPanel";

export function BillingTabs({ initial = "overview" }) {
  const [tab, setTab] = useState(initial);
  const { data: summary } = useApi("/admin/billing/invoices/summary");

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate" }, { label: "Billing" }, { label: tab === "invoices" ? "Invoices" : "Collections" }]} />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "invoices", label: "Invoices", count: summary?.unpaidCount ?? undefined },
          ]}
        />
      </div>
      {tab === "overview" ? <BillingOverview /> : <InvoicesPanel />}
    </div>
  );
}
