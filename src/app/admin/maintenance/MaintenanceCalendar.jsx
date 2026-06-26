"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const DUE_DOT = { overdue: "bg-rose-500", due_soon: "bg-amber-500", ok: "bg-brand-500", inactive: "bg-slate-300", unscheduled: "bg-slate-300" };
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Month calendar plotting maintenance schedules on their next-due date.
export function MaintenanceCalendar({ schedules }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const byDay = {};
  for (const s of schedules) {
    if (!s.nextDueOn) continue;
    const d = new Date(s.nextDueOn);
    if (d.getFullYear() === cursor.y && d.getMonth() === cursor.m) {
      (byDay[d.getDate()] ||= []).push(s);
    }
  }

  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = first.getDay();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const monthLabel = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const move = (delta) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" icon="chevron-left" onClick={() => move(-1)} />
          <Button size="sm" variant="secondary" onClick={() => setCursor(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })}>Today</Button>
          <Button size="sm" variant="secondary" icon="chevron-right" onClick={() => move(1)} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
        {WD.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={cn("min-h-[72px] rounded-lg border p-1.5", day ? "border-slate-100" : "border-transparent")}>
            {day && (
              <>
                <span className="text-xs text-slate-400">{day}</span>
                <div className="mt-1 space-y-1">
                  {(byDay[day] || []).slice(0, 3).map((s) => (
                    <div key={s.dbId} className="flex items-center gap-1 truncate text-[11px] text-slate-600" title={s.title}>
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DUE_DOT[s.dueState] || "bg-slate-300")} />
                      <span className="truncate">{s.title}</span>
                    </div>
                  ))}
                  {(byDay[day] || []).length > 3 && (
                    <span className="text-[10px] text-slate-400">+{byDay[day].length - 3} more</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Overdue</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Due soon</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-500" /> OK</span>
      </p>
    </div>
  );
}
