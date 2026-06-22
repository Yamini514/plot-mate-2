"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useDebounced } from "@/lib/useApi";
import { Icon } from "./Icon";

/**
 * Verify a plot number against the registry as the user types (gate flows:
 * visitor + delivery registration). Returns a status object:
 *   { status: "idle" | "checking" | "found" | "unregistered" | "missing",
 *     owner?, phone? }
 * An unknown plot is a normal, soft result (walk-in / unsold) — never an error.
 * Pass `active` (e.g. the modal's open flag) to pause lookups while hidden.
 */
export function usePlotVerify(plotNo, active = true) {
  const debounced = useDebounced((plotNo || "").trim(), 400);
  const [verify, setVerify] = useState({ status: "idle" });

  useEffect(() => {
    if (!active) return;
    const pn = debounced;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync verification to typed plot
    if (!pn) { setVerify({ status: "idle" }); return; }
    let cancelled = false;
    setVerify({ status: "checking" });
    api
      .get("/guard/verify-plot", { plot_no: pn })
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.found && data?.registered) setVerify({ status: "found", owner: data.ownerName, phone: data.phone });
        else if (data?.found) setVerify({ status: "unregistered" });
        else setVerify({ status: "missing" });
      })
      .catch(() => { if (!cancelled) setVerify({ status: "idle" }); });
    return () => { cancelled = true; };
  }, [debounced, active]);

  return verify;
}

/** Inline, colour-coded result of a plot lookup. Renders nothing when idle. */
export function PlotVerifyHint({ verify }) {
  if (!verify || verify.status === "idle") return null;
  const map = {
    checking: { icon: "loader-circle", spin: true, cls: "text-slate-400", text: "Checking registry…" },
    found: { icon: "badge-check", cls: "text-emerald-600", text: `Verified · owner ${verify.owner || "on file"}` },
    unregistered: { icon: "info", cls: "text-amber-600", text: "Plot exists but has no owner on file" },
    missing: { icon: "triangle-alert", cls: "text-amber-600", text: "Not in the registry — proceed only for a walk-in" },
  };
  const m = map[verify.status];
  if (!m) return null;
  return (
    <span className={`mt-1 flex items-center gap-1.5 text-xs ${m.cls}`}>
      <Icon name={m.icon} size={13} className={m.spin ? "animate-spin" : undefined} />
      {m.text}
    </span>
  );
}
