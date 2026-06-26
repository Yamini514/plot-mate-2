"use client";

import { useState } from "react";
import { Breadcrumbs, Tabs } from "@/components/ui";
import { useApi } from "@/lib/useApi";
import { BillingOverview } from "./BillingOverview";
import { InvoicesPanel } from "./InvoicesPanel";
import { PaymentsPanel } from "./PaymentsPanel";

const TAB_LABEL = { invoices: "Invoices", payments: "Payments", overview: "Collections" };

export function BillingTabs({ initial = "overview" }) {
  const [tab, setTab] = useState(initial);
  const { data: summary } = useApi("/admin/billing/invoices/summary");
  // Pending-verification count for the Payments tab badge.
  const { meta: payMeta } = useApi("/admin/billing/payments", { verification: "pending", page_size: 1 });
  const pending = payMeta?.counts?.pending;

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate" }, { label: "Billing" }, { label: TAB_LABEL[tab] }]} />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "invoices", label: "Invoices", count: summary?.unpaidCount ?? undefined },
            { value: "payments", label: "Payments", count: pending || undefined },
          ]}
        />
      </div>
      {tab === "overview" ? <BillingOverview /> : tab === "invoices" ? <InvoicesPanel /> : <PaymentsPanel />}
    </div>
  );
}
