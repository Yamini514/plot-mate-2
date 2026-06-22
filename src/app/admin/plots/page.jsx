"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  Segmented,
  Modal,
  ConfirmDialog,
  Avatar,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ReceiptsModal } from "@/components/ReceiptsModal";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR, cn } from "@/lib/utils";

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

// SVG fill + stroke per payment status for the clickable plot rectangles.
const regionFill = {
  paid: "fill-brand-500/35 stroke-brand-600",
  pending: "fill-amber-400/40 stroke-amber-500",
  unknown: "fill-slate-400/30 stroke-slate-500",
};

function csvEscape(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export default function PlotMapPage() {
  const { data: plots } = useApi("/admin/plots", { page_size: 300 });
  const allOwners = useMemo(
    () => normalizeList(plots).map((p) => ({ ...p, name: p.ownerName })),
    [plots],
  );
  const plotById = useMemo(() => {
    const m = new Map();
    for (const o of allOwners) m.set(o.id, o);
    return m;
  }, [allOwners]);

  const { data: stats } = useApi("/admin/plots/summary");
  const totalPlots = stats?.totalPlots ?? allOwners.length;

  // Layout image + clickable regions live on the backend now (shared across
  // admins/devices), replacing the old localStorage-only image.
  const { data: mapData, reload: reloadMap } = useApi("/admin/plot-map");
  const layout = mapData?.layout || null;
  const layoutImg = layout?.imageData || layout?.imageUrl || null;
  const savedRegions = useMemo(() => mapData?.regions || [], [mapData]);
  // Mirror into a ref so the async file-reader callback in onUpload reads the
  // current count, not the value captured when its handler was created.
  const savedRegionsRef = useRef(savedRegions);
  savedRegionsRef.current = savedRegions;

  const [filter, setFilter] = useState("all");
  const [phase, setPhase] = useState("all");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("grid"); // grid | layout
  const [hover, setHover] = useState(null); // { o, x, y }
  const [opacity, setOpacity] = useState(0.9);
  const [zoom, setZoom] = useState(1);
  const [showMarkers, setShowMarkers] = useState(true);
  const [receiptsFor, setReceiptsFor] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // A freshly chosen image waiting on confirmation because replacing the plan
  // would orphan the rectangles already mapped on the previous image.
  const [pendingLayout, setPendingLayout] = useState(null);

  // --- Map editor state ---
  const [mode, setMode] = useState("view"); // view | edit
  const [draft, setDraft] = useState([]); // working copy of regions while editing
  const [selRegion, setSelRegion] = useState(null); // index into draft
  const [assign, setAssign] = useState(null); // { rect } (new) | { reassignIdx }
  const keyRef = useRef(1);

  const fileRef = useRef(null);
  const toast = useToast();

  // Once a saved layout arrives, open the layout view automatically (first load only).
  const didInitView = useRef(false);
  useEffect(() => {
    if (!didInitView.current && layoutImg) {
      didInitView.current = true;
      setView("layout");
    }
  }, [layoutImg]);

  const phases = ["all", ...Array.from(new Set(allOwners.map((o) => o.phase).filter(Boolean))).sort()];

  // Grid view, grouped by phase into aligned blocks (plots sorted by number within
  // each). Plots with no phase fall into a trailing "Unassigned" block.
  const gridBlocks = useMemo(() => {
    const byNo = (a, b) => (a.plotNo || "").localeCompare(b.plotNo || "", undefined, { numeric: true });
    const phaseNames = Array.from(new Set(allOwners.map((o) => o.phase).filter(Boolean))).sort();
    const named = phaseNames.map((ph) => ({ phase: ph, lots: allOwners.filter((o) => o.phase === ph).sort(byNo) }));
    const unphased = allOwners.filter((o) => !o.phase).sort(byNo);
    if (unphased.length) named.push({ phase: "Unassigned", lots: unphased });
    return named.filter((b) => b.lots.length);
  }, [allOwners]);

  const dimmed = (o) =>
    (filter !== "all" && o.paymentStatus !== filter) ||
    (phase !== "all" && o.phase !== phase);

  const regions = mode === "edit" ? draft : savedRegions;
  const mappedIds = useMemo(() => new Set(draft.map((r) => r.plotId)), [draft]);

  // Persist a chosen image as the layout. The drawn rectangles are positioned
  // relative to the current plan, so a *new* image makes them stale — when
  // replacing, clear them too so they don't float over the wrong spots.
  const saveLayout = async ({ name, imageData }, clearRegions) => {
    try {
      // Clear the now-stale rectangles *before* swapping the image, so a failure
      // can never leave the new plan showing plots mapped to the old one.
      if (clearRegions) await api.put("/admin/plot-map/regions", { regions: [] });
      await api.put("/admin/plot-map/layout", { name, imageData });
      await reloadMap();
      setView("layout");
      toast(
        clearRegions
          ? `Layout "${name}" imported · previously mapped plots were cleared — re-map on the new plan`
          : `Layout "${name}" imported`,
      );
    } catch (err) {
      toast(err.message || "Couldn't save the layout", "error");
    }
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file (PNG or JPG)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const next = { name: file.name, imageData: reader.result };
      // Replacing a plan that already has mapped plots: confirm first, since the
      // rectangles were drawn over the old image and won't line up with a new
      // one. Read the count from the ref so this async callback isn't stale.
      if (savedRegionsRef.current.length > 0) setPendingLayout(next);
      else saveLayout(next, false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeLayout = async () => {
    setConfirmRemove(false);
    try {
      await api.del("/admin/plot-map/layout");
      await reloadMap();
      setView("grid");
      setMode("view");
      toast("Layout removed");
    } catch (err) {
      toast(err.message || "Couldn't remove the layout", "error");
    }
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

  // --- Editor actions ---
  const enterEdit = () => {
    setDraft(savedRegions.map((r) => ({ ...r, _key: r._key ?? `s${r.id ?? keyRef.current++}` })));
    setSelRegion(null);
    setShowMarkers(true);
    setMode("edit");
  };
  const cancelEdit = () => {
    setMode("view");
    setDraft([]);
    setSelRegion(null);
    setAssign(null);
  };
  const onDrawComplete = (rect) => setAssign({ rect });
  const pickPlot = (plotId) => {
    if (assign?.rect) {
      setDraft((d) => [...d, { ...assign.rect, plotId, _key: `d${keyRef.current++}` }]);
    } else if (assign?.reassignIdx != null) {
      setDraft((d) => d.map((r, i) => (i === assign.reassignIdx ? { ...r, plotId } : r)));
    }
    setAssign(null);
  };
  const deleteRegion = (i) => {
    setDraft((d) => d.filter((_, idx) => idx !== i));
    setSelRegion(null);
  };
  const saveRegions = async () => {
    try {
      await api.put("/admin/plot-map/regions", {
        regions: draft.map((r) => ({ plotId: r.plotId, x: r.x, y: r.y, w: r.w, h: r.h })),
      });
      await reloadMap();
      toast(`Saved ${draft.length} mapped plot${draft.length === 1 ? "" : "s"}`);
      cancelEdit();
    } catch (err) {
      toast(err.message || "Couldn't save the map", "error");
    }
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Plot Map"
        subtitle={`Visual layout of all ${totalPlots} plots · import a site plan, map each plot, click any plot for owner details`}
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
              {layoutImg ? "Replace layout" : "Import layout"}
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
          <Legend color="bg-brand-500" label={`Paid (${stats?.paidCount ?? 0})`} />
          <Legend color="bg-amber-400" label={`Pending (${stats?.pendingCount ?? 0})`} />
          <Legend color="bg-slate-200" label={`Unknown (${stats?.unknownCount ?? 0})`} />
        </div>
      </div>

      {/* View toggle + layout controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={(v) => {
            if (mode === "edit") return; // don't switch views mid-edit
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
            {mode === "view" ? (
              <>
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
                <Button size="sm" variant="secondary" icon="pencil" onClick={enterEdit}>
                  Edit map
                </Button>
                <Button size="sm" variant="secondary" icon="download" onClick={downloadLayout}>
                  Download
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" icon="trash-2" onClick={() => setConfirmRemove(true)}>
                  Remove
                </Button>
              </>
            ) : (
              <>
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
                <Button size="sm" variant="ghost" icon="x" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" icon="check" onClick={saveRegions}>
                  Save map
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- GRID VIEW ---- */}
      {/* Grouped into per-phase blocks of uniform tiles so the grid mirrors the
          spatial organisation of the site plan (each phase is its own area)
          rather than one flat reflowing wall of plots. */}
      {view === "grid" && (
        <Card className="p-5">
          <div className="space-y-6">
            {gridBlocks.map(({ phase: ph, lots }) => (
              <div key={ph}>
                <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{ph}</span>
                  <span className="text-[11px] text-slate-400">{lots.length} plot{lots.length === 1 ? "" : "s"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {lots.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setSelected(o)}
                      onMouseEnter={(e) => showHover(o, e)}
                      onMouseMove={moveHover}
                      onMouseLeave={hideHover}
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-md text-[10px] font-semibold transition-all",
                        statusColor[o.paymentStatus],
                        dimmed(o) && "opacity-20",
                      )}
                    >
                      {o.plotNo.replace("P-", "")}
                    </button>
                  ))}
                </div>
              </div>
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
                Upload the approved master plan (PNG / JPG), then use <b>Edit map</b> to draw a clickable rectangle over each plot. Click any plot to see owner &amp; payment details.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                <Icon name="upload" size={15} /> Choose image
              </span>
            </button>
          ) : (
            <>
              <MapCanvas
                src={layoutImg}
                zoom={zoom}
                opacity={opacity}
                showMarkers={showMarkers}
                mode={mode}
                regions={regions}
                plotById={plotById}
                dimmed={dimmed}
                onPlotClick={setSelected}
                showHover={showHover}
                moveHover={moveHover}
                hideHover={hideHover}
                selRegion={selRegion}
                setSelRegion={setSelRegion}
                onDrawComplete={onDrawComplete}
              />
              {mode === "edit" && (
                <EditBar
                  count={draft.length}
                  total={allOwners.length}
                  selected={selRegion != null ? draft[selRegion] : null}
                  plotById={plotById}
                  onReassign={() => setAssign({ reassignIdx: selRegion })}
                  onDelete={() => deleteRegion(selRegion)}
                />
              )}
            </>
          )}
        </Card>
      )}

      <p className="mt-3 text-center text-xs text-slate-400">
        {view !== "layout"
          ? "Hover or click any plot to view owner details and send a reminder."
          : mode === "edit"
            ? "Drag on the plan to draw a plot rectangle · click a box to select, then change or delete it · Save map when done."
            : savedRegions.length === 0
              ? "No plots mapped yet — click “Edit map” to draw clickable plots over your layout."
              : "Hover a plot for owner details · click to open the full plot record."}
      </p>

      {/* ---- Floating hover card ---- */}
      {hover && mode === "view" && <HoverCard hover={hover} />}

      {/* ---- Assign-plot modal (editor) — mounted only while open so its search resets each time ---- */}
      {assign && (
        <AssignPlotModal
          onClose={() => setAssign(null)}
          plots={allOwners}
          mappedIds={mappedIds}
          currentPlotId={assign.reassignIdx != null ? draft[assign.reassignIdx]?.plotId : null}
          onPick={pickPlot}
        />
      )}

      {/* ---- Replace-layout confirm (would orphan mapped plots) ---- */}
      <ConfirmDialog
        open={!!pendingLayout}
        onClose={() => setPendingLayout(null)}
        onConfirm={() => {
          const next = pendingLayout;
          setPendingLayout(null);
          saveLayout(next, true);
        }}
        title="Replace the site plan?"
        message={`You have ${savedRegions.length} plot${savedRegions.length === 1 ? "" : "s"} mapped on the current plan. Those rectangles were drawn over the old image, so they won't line up with a different one — they'll be cleared and you can re-map from “Edit map”.`}
        confirmLabel="Replace & clear mapped plots"
        confirmVariant="danger"
      />

      {/* ---- Remove-layout confirm ---- */}
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={removeLayout}
        title="Remove this layout?"
        message="The site plan image and all plot rectangles you've mapped will be deleted. This can't be undone."
        confirmLabel="Remove layout"
        confirmVariant="danger"
      />

      {/* ---- Detail modal ---- */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Plot ${selected?.plotNo}`}
        footer={
          <>
            <Button variant="secondary" icon="receipt" onClick={() => setReceiptsFor({ plotNo: selected?.plotNo, name: selected?.name })}>
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

      {receiptsFor && (
        <ReceiptsModal plotNo={receiptsFor.plotNo} ownerName={receiptsFor.name} onClose={() => setReceiptsFor(null)} />
      )}
    </div>
  );
}

// Image + SVG overlay. In view mode each rectangle is a clickable plot; in edit
// mode you drag on empty space to draw a new rectangle and click a box to select.
function MapCanvas({
  src, zoom, opacity, showMarkers, mode, regions, plotById, dimmed,
  onPlotClick, showHover, moveHover, hideHover, selRegion, setSelRegion, onDrawComplete,
}) {
  const wrapRef = useRef(null);
  const [draw, setDraw] = useState(null); // { x0, y0, x1, y1 } in %

  const toPct = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  };

  const startDraw = (e) => {
    if (mode !== "edit") return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = toPct(e);
    setSelRegion(null);
    setDraw({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const moveDraw = (e) => {
    if (!draw) return;
    const p = toPct(e);
    setDraw((d) => ({ ...d, x1: p.x, y1: p.y }));
  };
  const endDraw = () => {
    if (!draw) return;
    const rect = {
      x: Math.min(draw.x0, draw.x1),
      y: Math.min(draw.y0, draw.y1),
      w: Math.abs(draw.x1 - draw.x0),
      h: Math.abs(draw.y1 - draw.y0),
    };
    setDraw(null);
    if (rect.w >= 0.8 && rect.h >= 0.8) onDrawComplete(rect);
  };

  return (
    <div className="max-h-[74vh] overflow-auto rounded-xl bg-slate-100 p-2 text-center">
      {/* inline-block wrapper shrinks to the rendered image, so the SVG overlay aligns exactly to the plan */}
      <div
        ref={wrapRef}
        className="relative inline-block origin-top align-top"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.15s ease" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL; next/image cannot optimize arbitrary uploads */}
        <img
          src={src}
          alt="Plot layout"
          className="block max-h-[70vh] w-auto max-w-full select-none"
          draggable={false}
        />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          style={{ touchAction: "none", cursor: mode === "edit" ? "crosshair" : "default" }}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
        >
          {showMarkers &&
            regions.map((reg, i) => {
              const o = plotById.get(reg.plotId);
              const status = o?.paymentStatus || "unknown";
              const selected = mode === "edit" && selRegion === i;
              // In view mode a region filtered out by the status/phase filters is
              // faded right back and made non-interactive, so the filters visibly
              // narrow the map to just the matching plots.
              const filteredOut = mode === "view" && o && dimmed(o);
              const op = mode === "view" ? (filteredOut ? 0.06 : opacity) : 1;
              return (
                <rect
                  key={reg._key ?? reg.id ?? i}
                  x={reg.x}
                  y={reg.y}
                  width={reg.w}
                  height={reg.h}
                  rx="0.4"
                  vectorEffect="non-scaling-stroke"
                  className={cn(
                    selected ? "fill-brand-500/50 stroke-brand-700" : regionFill[status],
                    mode === "view" && !filteredOut && "cursor-pointer",
                  )}
                  style={{
                    strokeWidth: selected ? 2.5 : 1.25,
                    opacity: op,
                    pointerEvents: filteredOut ? "none" : undefined,
                  }}
                  onClick={(e) => {
                    if (mode === "view") {
                      if (o) onPlotClick(o);
                    } else {
                      e.stopPropagation();
                      setSelRegion(i);
                    }
                  }}
                  onPointerDown={(e) => {
                    if (mode === "edit") {
                      e.stopPropagation();
                      setSelRegion(i);
                    }
                  }}
                  onMouseEnter={(e) => mode === "view" && o && showHover(o, e)}
                  onMouseMove={(e) => mode === "view" && moveHover(e)}
                  onMouseLeave={() => mode === "view" && hideHover()}
                />
              );
            })}

          {draw && (
            <rect
              x={Math.min(draw.x0, draw.x1)}
              y={Math.min(draw.y0, draw.y1)}
              width={Math.abs(draw.x1 - draw.x0)}
              height={Math.abs(draw.y1 - draw.y0)}
              className="fill-brand-500/25 stroke-brand-600"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 1.5, strokeDasharray: "3 2", pointerEvents: "none" }}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

// Footer shown under the canvas while editing: mapped count + selected-region tools.
function EditBar({ count, total, selected, plotById, onReassign, onDelete }) {
  const o = selected ? plotById.get(selected.plotId) : null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
      <span className="text-slate-500">
        <span className="font-semibold text-slate-700">{count}</span> of {total} plots mapped
      </span>
      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600">
            Selected:{" "}
            <span className="font-medium">{o ? `${o.plotNo} · ${o.name ?? "Unregistered"}` : "Unknown plot"}</span>
          </span>
          <Button size="sm" variant="secondary" icon="repeat" onClick={onReassign}>
            Change plot
          </Button>
          <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" icon="trash-2" onClick={onDelete}>
            Delete
          </Button>
        </div>
      ) : (
        <span className="text-xs text-slate-400">Drag to draw a new plot, or click an existing box to edit it.</span>
      )}
    </div>
  );
}

// Searchable plot picker used after drawing a rectangle (or when reassigning one).
function AssignPlotModal({ onClose, plots, mappedIds, currentPlotId, onPick }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = plots.filter(
    (o) =>
      !term ||
      o.plotNo?.toLowerCase().includes(term) ||
      o.name?.toLowerCase().includes(term),
  );

  return (
    <Modal open onClose={onClose} title="Assign a plot to this rectangle">
      <input
        autoFocus
        className={inputClass}
        placeholder="Search plot no. or owner…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-3 max-h-72 space-y-1 overflow-auto">
        {list.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No plots match “{q}”.</p>
        )}
        {list.map((o) => {
          const already = mappedIds.has(o.id) && o.id !== currentPlotId;
          return (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotColor[o.paymentStatus]?.split(" ")[0])} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-700">
                  {o.plotNo} · {o.name ?? "Unregistered"}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {o.phase} · {o.sizeSqyd} sqyd
                </span>
              </span>
              {o.id === currentPlotId ? (
                <span className="ml-auto shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">current</span>
              ) : already ? (
                <span className="ml-auto shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">already mapped</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Modal>
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
