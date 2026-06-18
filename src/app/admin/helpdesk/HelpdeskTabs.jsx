"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui";
import { useApi } from "@/lib/useApi";
import { HelpdeskOverview } from "./HelpdeskOverview";
import { TicketsPanel } from "./TicketsPanel";

export function HelpdeskTabs({ initial = "overview" }) {
  const [tab, setTab] = useState(initial);
  const { data: summary } = useApi("/admin/helpdesk/tickets/summary");

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "tickets", label: "Tickets", count: summary?.open ?? undefined },
          ]}
        />
      </div>
      {tab === "overview" ? <HelpdeskOverview /> : <TicketsPanel />}
    </div>
  );
}
