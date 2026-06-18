"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui";
import { SecurityOverview } from "./SecurityOverview";
import { VisitorsPanel } from "./VisitorsPanel";

export function SecurityTabs({ initial = "overview" }) {
  const [tab, setTab] = useState(initial);

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "gate", label: "Gate log" },
          ]}
        />
      </div>
      {tab === "overview" ? <SecurityOverview /> : <VisitorsPanel />}
    </div>
  );
}
