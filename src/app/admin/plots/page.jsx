"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatINR, cn } from "@/lib/utils";

const LS_KEY = "plotmate.layoutImage";

const statusColor = {
  paid: "bg-brand-500 hover:bg-brand-600 text-white",
  pending: "bg-amber-400 hover:bg-amber-500 text-white",
  unknown: "bg-slate-200 hover:bg-slate-300 text-slate-500",
};

const dotColor = {
  paid: "bg-brand-500 ring-brand-200",
  pending: "bg-amber-400 ring-amber-200",
  unknown: "bg-slate-300 ring-slate-200",
};

function csvEscape(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export default function PlotMapPage() {
  const [filter, setFilter] = useState("all");
  const [phase, setPhase] = useState("all");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("grid"); // grid | layout
  const [layoutImg, setLayoutImg] = useState(null);
  const [hover, setHover] = useState(null); // { o, x, y }
  const [opacity, setOpacity] = useState(0.9);
  const [zoom, setZoom] = useState(1);
  const [showMarkers, setShowMarkers] = useState(true);
  const fileRef = useRef(null);
  const toast = useToast();

  // Restore a previously uploaded layout (persists across reloads).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate saved layout/view on mount
        setLayoutImg(saved);
        setView("layout");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const phases = useMemo(
    () => ["all", ...Array.from(new Set(allOwners.map((o) => o.phase))).sort()],
    [],
  );

  const dimmed = (o) =>
    (filter !== "all" && o.paymentStatus !== filter) ||
    (phase !== "all" && o.phase !== phase);

  // Markers shown on the layout overlay (cap so a busy plan stays readable).
  const markerPlots = useMemo(() => allOwners.slice(0, 140), []);

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file (PNG or JPG)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      setLayoutImg(url);
      setView("layout");
      try {
        localStorage.setItem(LS_KEY, url);
      } catch {
        toast("Layout shown, but it was too large to save for next time", "info");
      }
      toast(`Layout "${file.name}" imported`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeLayout = () => {
    setLayoutImg(null);
    setView("grid");
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
    toast("Layout removed");
  };

  const downloadLayout = () => {
    if (!layoutImg) return;
    const a = document.createElement("a");
    a.href = layoutImg;
    a.download = "plotmate-layout.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast("Layout image downloaded");
  };

  const exportCSV = () => {
    const cols = [
      ["plotNo", "Plot No"],
      ["name", "Owner"],
      ["phone", "Phone"],
      ["email", "Email"],
      ["sizeSqyd", "Size (sqyd)"],
      ["phase", "Phase"],
      ["paymentStatus", "Status"],
      ["amountDue", "Amount Due"],
    ];
    const header = cols.map((c) => csvEscape(c[1])).join(",");
    const body = allOwners
      .map((o) => cols.map((c) => csvEscape(o[c[0]])).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plotmate-plots.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${allOwners.length} plots (CSV)`);
  };

  const showHover = (o, e) => setHover({ o, x: e.clientX, y: e.clientY });
  const moveHover = (e) =>
    setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h));
  const hideHover = () => setHover(null);

  const plotProps = (o) => ({
    onClick: () => setSelected(o),
    onMouseEnter: (e) => showHover(o, e),
    onMouseMove: moveHover,
    onMouseLeave: hideHover,
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Plot Map"
        subtitle={`Visual layout of all ${association.totalPlots} plots · import a site plan, hover any plot for owner details`}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="hidden"
            />
            <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>
              Import layout
            </Button>
            <Button variant="secondary" icon="download" onClick={exportCSV}>
              Export CSV
            </Button>
          </>
        }
      />

      {/* Filters + legend */}
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

      {/* View toggle + layout controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={(v) => {
            if (v === "layout" && !layoutImg) {
              fileRef.current?.click();
              return;
            }
            setView(v);
          }}
          options={[
            { value: "grid", label: "Grid view" },
            { value: "layout", label: "Layout view" },
          ]}
        />

        {view === "layout" && layoutImg && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <Icon name="square-stack" size={14} /> Overlay
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="accent-brand-600"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <Icon name="zoom-in" size={14} /> Zoom
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="accent-brand-600"
              />
            </label>
            <Button size="sm" variant="ghost" icon={showMarkers ? "eye-off" : "eye"} onClick={() => setShowMarkers((s) => !s)}>
              {showMarkers ? "Hide plots" : "Show plots"}
            </Button>
            <Button size="sm" variant="secondary" icon="download" onClick={downloadLayout}>
              Download layout
            </Button>
            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" icon="trash-2" onClick={removeLayout}>
              Remove
            </Button>
          </div>
        )}
      </div>

      {/* ---- GRID VIEW ---- */}
      {view === "grid" && (
        <Card className="p-5">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5 sm:gap-2">
            {allOwners.map((o) => (
              <button
                key={o.id}
                {...plotProps(o)}
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
      )}

      {/* ---- LAYOUT VIEW ---- */}
      {view === "layout" && (
        <Card className="p-3">
          {!layoutImg ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-slate-400 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <Icon name="image-up" size={40} />
              <p className="mt-3 text-sm font-medium text-slate-600">Import your site layout</p>
              <p className="mt-1 max-w-md text-center text-xs text-slate-400">
                Upload the approved master plan (PNG / JPG). Interactive plot markers appear on top — hover any plot to see owner &amp; plot details.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                <Icon name="upload" size={15} /> Choose image
              </span>
            </button>
          ) : (
            <div className="max-h-[74vh] overflow-auto rounded-xl bg-slate-100 p-2 text-center">
              {/* inline-block wrapper shrinks to the rendered image, so the marker overlay aligns exactly to the plan and never exceeds it */}
              <div
                className="relative inline-block origin-top align-top"
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s ease" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL; next/image cannot optimize arbitrary uploads */}
                <img
                  src={layoutImg}
                  alt="Plot layout"
                  className="block max-h-[70vh] w-auto max-w-full select-none"
                  draggable={false}
                />

                {/* Interactive plot overlay — clipped to the image so it can never overflow the plan */}
                {showMarkers && (
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    style={{ opacity }}
                  >
                    <div className="pointer-events-none absolute left-[3%] top-[5%] grid w-[55%] grid-cols-10 gap-[0.4%]">
                      {markerPlots.map((o) => (
                        <button
                          key={o.id}
                          {...plotProps(o)}
                          className={cn(
                            "pointer-events-auto aspect-square rounded-[2px] ring-1 ring-inset ring-white/60 transition-transform hover:scale-150 hover:ring-2",
                            dotColor[o.paymentStatus],
                            dimmed(o) && "opacity-25",
                          )}
                          aria-label={`${o.plotNo} ${o.name ?? "Unregistered"}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      <p className="mt-3 text-center text-xs text-slate-400">
        {view === "layout"
          ? "Hover a marker for owner details · click to open the full plot record."
          : "Hover or click any plot to view owner details and send a reminder."}
      </p>

      {/* ---- Floating hover card ---- */}
      {hover && <HoverCard hover={hover} />}

      {/* ---- Detail modal ---- */}
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
                <p className="font-semibold text-slate-800">{selected.name ?? "Not registered"}</p>
                <p className="text-sm text-slate-500">{selected.phase} · {selected.sizeSqyd} sqyd</p>
              </div>
              <span className="ml-auto"><StatusBadge status={selected.paymentStatus} /></span>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Phone</p>
                <p className="font-medium text-slate-700">{selected.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="truncate font-medium text-slate-700">{selected.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Membership</p>
                <p className="font-medium text-slate-700 capitalize">{selected.membership}</p>
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

function HoverCard({ hover }) {
  const { o, x, y } = hover;
  // Clamp so the card stays inside the viewport.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(x + 16, vw - 272);
  const top = Math.min(y + 16, vh - 200);

  return (
    <div
      className="pointer-events-none fixed z-[60] w-64 animate-fade-in rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
      style={{ left, top }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={o.name ?? "NA"} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{o.name ?? "Unregistered"}</p>
          <p className="text-xs text-slate-400">Plot {o.plotNo} · {o.phase}</p>
        </div>
        <span className="ml-auto"><StatusBadge status={o.paymentStatus} /></span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-xs">
        <Detail label="Size" value={`${o.sizeSqyd} sqyd`} />
        <Detail label="Membership" value={o.membership} className="capitalize" />
        <Detail label="Phone" value={o.phone ?? "—"} />
        <Detail label="Amount due" value={o.amountDue > 0 ? formatINR(o.amountDue) : "Cleared"} />
      </div>
      {o.paymentStatus === "pending" && o.daysOverdue > 0 && (
        <p className="mt-2 flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600">
          <Icon name="clock" size={11} /> {o.daysOverdue} days overdue
        </p>
      )}
    </div>
  );
}

function Detail({ label, value, className }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className={cn("font-medium text-slate-700", className)}>{value}</p>
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
