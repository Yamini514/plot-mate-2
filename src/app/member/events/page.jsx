"use client";

import { useState } from "react";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { events } from "@/lib/mock-data";

const typeTone = {
  meeting: "sky",
  social: "violet",
  maintenance: "amber",
  festival: "brand",
};

export default function MemberEventsPage() {
  const [rsvped, setRsvped] = useState({});

  return (
    <div className="animate-fade-in">
      <PageHeader title="Events & Meetings" subtitle="What's happening in the community" />

      <div className="space-y-4">
        {events.map((e) => {
          const going = rsvped[e.id];
          return (
            <Card key={e.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="flex shrink-0 items-center justify-center gap-3 bg-brand-50 px-6 py-4 text-brand-700 sm:w-28 sm:flex-col sm:gap-0">
                  <span className="text-3xl font-bold">{new Date(e.date).getDate()}</span>
                  <span className="text-xs uppercase">
                    {new Date(e.date).toLocaleDateString("en-IN", { month: "short", weekday: "short" })}
                  </span>
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800">{e.title}</h3>
                    <Badge tone={typeTone[e.type]}>
                      <span className="capitalize">{e.type}</span>
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{e.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="clock" size={13} /> {e.time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="map-pin" size={13} /> {e.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="users" size={13} /> {e.rsvpCount + (going ? 1 : 0)} attending
                    </span>
                  </div>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant={going ? "secondary" : "primary"}
                      icon={going ? "check" : "calendar-plus"}
                      onClick={() => setRsvped((r) => ({ ...r, [e.id]: !r[e.id] }))}
                    >
                      {going ? "You're going" : "RSVP"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
