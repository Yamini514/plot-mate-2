"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Drawer, Modal, ConfirmDialog, Avatar, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ReceiptsModal } from "@/components/ReceiptsModal";
import { SendReminderModal } from "@/components/SendReminderModal";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatINR, cn } from "@/lib/utils";
import { MapCanvas } from "./MapCanvas";
import {
  STATUS,
  STATUS_ORDER,
  LABEL_TYPES,
  mapStatus,
  boundingBox,
  parseSvgPlots,
} from "./mapkit";

const PLOT_STATUSES = ["available", "booked", "sold", "blocked"]; // admin-settable lifecycle

export default function PlotMapWorkspace() {
  const { data: plots, reload: reloadPlots } = useApi("/admin/plots", { page_size: 300 });
  const { data: mapData, reload: reloadMap } = useApi("/admin/plot-map");

  const allPlots = useMemo(() => normalizeList(plots), [plots]);
  const plotById = useMemo(() => {
    const m = new Map();
    for (const p of allPlots) m.set(p.id, p);
    return m;
  }, [allPlots]);
  // Match a layout-extracted plot code ("101") back to a plot by its number.
  const plotByCode = useMemo(() => {
    const m = new Map();
    for (const p of allPlots) {
      const d = (p.plotNo || "").match(/(\d+)\s*$/);
      if (d) m.set(d[1], p);
    }
    return m;
  }, [allPlots]);

  const layout = mapData?.layout || null;
  const layoutImg = layout?.imageData || layout?.imageUrl || null;
  const savedRegions = useMemo(() => mapData?.regions || [], [mapData]);
  // Mirror into a ref so the async file-reader callback in onUploadLayout reads
  // the current regions, not a value captured when the handler was created.
  const savedRegionsRef = useRef(savedRegions);
  useEffect(() => {
    savedRegionsRef.current = savedRegions;
  }, [savedRegions]);
  const regionByPlotId = useMemo(() => {
    const m = new Map();
    for (const r of savedRegions) if (r.kind !== "label" && r.plotId != null) m.set(r.plotId, r);
    return m;
  }, [savedRegions]);

  // Live status tallies — derived from the same mapStatus() the map colours by,
  // so the cards, legend and polygons can never disagree.
  const counts = useMemo(() => {
    const c = { available: 0, booked: 0, sold: 0, pending: 0, overdue: 0, blocked: 0 };
    for (const p of allPlots) c[mapStatus(p)]++;
    return c;
  }, [allPlots]);
  const outstanding = useMemo(
    () => allPlots.reduce((s, p) => s + (p.paymentStatus === "pending" ? p.amountDue || 0 : 0), 0),
    [allPlots],
  );

  const [dark, setDark] = useState(true);
  const [filter, setFilter] = useState("all"); // all | <status>
  const [phase, setPhase] = useState("all");
  const [q, setQ] = useState("");
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null); // { plot, reg }
  const [showNumbers, setShowNumbers] = useState(true);
  const [opacity, setOpacity] = useState(0.92);
  const [receiptsFor, setReceiptsFor] = useState(null);
  const [reminderFor, setReminderFor] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Editor state
  const [mode, setMode] = useState("view"); // view | edit
  const [tool, setTool] = useState("select"); // select | polygon | rectangle | label
  const [draft, setDraft] = useState([]);
  const [selDraftIdx, setSelDraftIdx] = useState(null);
  // Either { points } (a freshly drawn shape awaiting a plot) or
  // { reassignIdx } (changing the plot of an existing draft region).
  const [assign, setAssign] = useState(null);
  const [pendingLabel, setPendingLabel] = useState(null); // { points } awaiting label text
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pendingLayout, setPendingLayout] = useState(null);
  const keyRef = useRef(1);

  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const svgRef = useRef(null);
  const toast = useToast();

  const phases = useMemo(
    () => ["all", ...Array.from(new Set(allPlots.map((p) => p.phase).filter(Boolean))).sort()],
    [allPlots],
  );

  // What the canvas renders. View mode: saved regions, narrowed by the status /
  // phase filters (labels always shown for context). Edit mode: the full draft.
  const viewRegions = useMemo(() => {
    if (mode === "edit") return draft;
    return savedRegions.filter((r) => {
      if (r.kind === "label") return true;
      const p = plotById.get(r.plotId);
      if (filter !== "all" && mapStatus(p) !== filter) return false;
      if (phase !== "all" && p?.phase !== phase) return false;
      return true;
    });
  }, [mode, draft, savedRegions, plotById, filter, phase]);

  const t = theme(dark);

  /* ------------------------------- search ------------------------------- */
  const term = q.trim().toLowerCase();
  const matches = term
    ? allPlots
        .filter(
          (p) =>
            p.plotNo?.toLowerCase().includes(term) ||
            p.ownerName?.toLowerCase().includes(term) ||
            p.phone?.toLowerCase().includes(term),
        )
        .slice(0, 8)
    : [];

  const goToPlot = (p) => {
    const reg = regionByPlotId.get(p.id);
    setSelected({ plot: p, reg });
    setQ("");
    if (reg) canvasRef.current?.focusRegion(reg);
    else toast(`${p.plotNo} isn't mapped on the layout yet`, "info");
  };

  /* ------------------------------- layout ------------------------------- */
  const saveLayout = async ({ name, imageData }, clearRegions) => {
    try {
      if (clearRegions) await api.put("/admin/plot-map/regions", { regions: [] });
      await api.put("/admin/plot-map/layout", { name, imageData });
      await reloadMap();
      toast(clearRegions ? `Layout "${name}" imported · previous regions cleared` : `Layout "${name}" imported`);
    } catch (err) {
      toast(err.message || "Couldn't save the layout", "error");
    }
  };
  const onUploadLayout = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Choose an image (PNG or JPG)", "error");
    const reader = new FileReader();
    reader.onload = () => {
      const next = { name: file.name, imageData: reader.result };
      if (savedRegionsRef.current.length > 0) setPendingLayout(next);
      else saveLayout(next, false);
    };
    reader.readAsDataURL(file);
  };
  const removeLayout = async () => {
    setConfirmRemove(false);
    try {
      await api.del("/admin/plot-map/layout");
      await reloadMap();
      setMode("view");
      toast("Layout removed");
    } catch (err) {
      toast(err.message || "Couldn't remove the layout", "error");
    }
  };

  /* ------------------------------- editor ------------------------------- */
  const enterEdit = () => {
    setDraft(savedRegions.map((r) => ({ ...r, _key: `s${r.id ?? keyRef.current++}` })));
    setSelDraftIdx(null);
    setTool("select");
    setShowNumbers(true);
    setMode("edit");
  };
  const cancelEdit = () => {
    setMode("view");
    setDraft([]);
    setSelDraftIdx(null);
    setAssign(null);
    setPendingLabel(null);
  };
  const mappedDraftIds = useMemo(() => new Set(draft.map((r) => r.plotId).filter(Boolean)), [draft]);

  const regionFromPoints = (points, extra) => {
    const bb = boundingBox(points);
    return { points, x: bb.x, y: bb.y, w: bb.w, h: bb.h, _key: `d${keyRef.current++}`, ...extra };
  };
  const onShapeComplete = (points, which) => {
    if (which === "label") setPendingLabel({ points });
    else setAssign({ points });
    setTool("select");
  };
  const assignPlot = (plotId) => {
    if (assign?.points) {
      setDraft((d) => [...d, regionFromPoints(assign.points, { kind: "plot", plotId })]);
    } else if (assign?.reassignIdx != null) {
      setDraft((d) => d.map((r, i) => (i === assign.reassignIdx ? { ...r, plotId } : r)));
    }
    setAssign(null);
  };
  const addLabel = ({ label, labelType }) => {
    if (!pendingLabel) return;
    setDraft((d) => [...d, regionFromPoints(pendingLabel.points, { kind: "label", label, labelType })]);
    setPendingLabel(null);
  };
  const deleteDraft = () => {
    if (selDraftIdx == null) return;
    setDraft((d) => d.filter((_, i) => i !== selDraftIdx));
    setSelDraftIdx(null);
  };
  const saveRegions = async () => {
    try {
      await api.put("/admin/plot-map/regions", {
        regions: draft.map((r) => ({
          kind: r.kind || "plot",
          plotId: r.plotId ?? null,
          label: r.label ?? null,
          labelType: r.labelType ?? null,
          points: r.points ?? null,
          x: r.x,
          y: r.y,
          w: r.w,
          h: r.h,
        })),
      });
      await reloadMap();
      toast(`Saved ${draft.length} region${draft.length === 1 ? "" : "s"}`);
      cancelEdit();
    } catch (err) {
      toast(err.message || "Couldn't save the map", "error");
    }
  };

  // SVG vector import: parse id="plot_NN" shapes and match them to plots.
  const onImportSvg = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { plots: shapes, error } = parseSvgPlots(String(reader.result));
      if (error) return toast(error, "error");
      const existing = new Set((mode === "edit" ? draft : savedRegions).map((r) => r.plotId).filter(Boolean));
      const additions = [];
      let unmatched = 0;
      for (const s of shapes) {
        const p = plotByCode.get(s.code);
        if (!p) { unmatched++; continue; }
        if (existing.has(p.id)) continue;
        existing.add(p.id);
        additions.push(regionFromPoints(s.points, { kind: "plot", plotId: p.id }));
      }
      if (mode !== "edit") {
        setDraft(savedRegions.map((r) => ({ ...r, _key: `s${r.id ?? keyRef.current++}` })).concat(additions));
        setMode("edit");
        setTool("select");
      } else {
        setDraft((d) => [...d, ...additions]);
      }
      toast(
        `Imported ${additions.length} plot${additions.length === 1 ? "" : "s"} from SVG` +
          (unmatched ? ` · ${unmatched} shape(s) had no matching plot` : "") +
          ` · review and Save`,
      );
    };
    reader.readAsText(file);
  };

  /* --------------------------- plot status edit --------------------------- */
  const setPlotStatus = async (plot, status) => {
    setSavingStatus(true);
    try {
      await api.put(`/admin/plots/${plot.id}`, { status });
      await reloadPlots();
      setSelected((s) => (s ? { ...s, plot: { ...s.plot, status } } : s));
      toast(`${plot.plotNo} marked ${STATUS[mapStatus({ ...plot, status })].label.toLowerCase()}`);
    } catch (err) {
      toast(err.message || "Couldn't update status", "error");
    } finally {
      setSavingStatus(false);
    }
  };

  const selPlot = selected?.plot || null;
  const selStatus = STATUS[mapStatus(selPlot)] || STATUS.available;

  return (
    <div className={cn("animate-fade-in min-h-[80vh] rounded-3xl p-4 transition-colors sm:p-6", t.shell, t.text)}>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Plot Map</h1>
          <p className={cn("mt-1 text-sm", t.sub)}>
            Interactive site plan · {allPlots.length} plots · click a plot for owner &amp; payment details
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onUploadLayout} className="hidden" />
          <input ref={svgRef} type="file" accept=".svg,image/svg+xml" onChange={onImportSvg} className="hidden" />
          <Ctrl t={t} icon={dark ? "sun" : "moon"} onClick={() => setDark((d) => !d)}>
            {dark ? "Light" : "Dark"}
          </Ctrl>
          <Ctrl t={t} icon="upload" onClick={() => fileRef.current?.click()}>
            {layoutImg ? "Replace layout" : "Import layout"}
          </Ctrl>
          <Ctrl t={t} icon="file-code-2" onClick={() => svgRef.current?.click()}>
            Import SVG
          </Ctrl>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat t={t} label="Total plots" value={allPlots.length} dot="#e2e8f0" icon="layout-grid" />
        {STATUS_ORDER.map((k) => (
          <Stat key={k} t={t} label={STATUS[k].label} value={counts[k]} dot={STATUS[k].color} />
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Icon name="search" size={16} className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2", t.sub)} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search plot no, owner or phone…"
            className={cn("h-10 w-full rounded-xl border pl-9 pr-3 text-sm outline-none transition-colors", t.input)}
          />
          {matches.length > 0 && (
            <div className={cn("absolute z-30 mt-1 w-full overflow-hidden rounded-xl border shadow-xl", t.menu)}>
              {matches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goToPlot(p)}
                  className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors", t.menuItem)}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS[mapStatus(p)].color }} />
                  <span className="min-w-0 flex-1 truncate">
                    <b>{p.plotNo}</b> · {p.ownerName || "Unregistered"}
                  </span>
                  {!regionByPlotId.has(p.id) && <span className={cn("shrink-0 text-[10px]", t.sub)}>not mapped</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <FilterChips
          t={t}
          value={filter}
          onChange={setFilter}
          options={[{ k: "all", label: "All", color: "#e2e8f0" }, ...STATUS_ORDER.map((k) => ({ k, label: STATUS[k].label, color: STATUS[k].color }))]}
        />
        <select value={phase} onChange={(e) => setPhase(e.target.value)} className={cn("h-9 rounded-lg border px-3 text-sm outline-none", t.input)}>
          {phases.map((p) => (
            <option key={p} value={p}>{p === "all" ? "All phases" : p}</option>
          ))}
        </select>
      </div>

      {/* Canvas + controls */}
      {!layoutImg ? (
        <button
          onClick={() => fileRef.current?.click()}
          className={cn("flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-20", t.empty)}
        >
          <Icon name="image-up" size={44} />
          <p className="mt-3 text-sm font-medium">Import your approved site plan</p>
          <p className={cn("mt-1 max-w-md text-center text-xs", t.sub)}>
            Upload the master plan (PNG / JPG), then use <b>Edit map</b> to draw polygons over each plot — or
            import a vector SVG with <code>id=&quot;plot_101&quot;</code> shapes to place them automatically.
          </p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
            <Icon name="upload" size={15} /> Choose image
          </span>
        </button>
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {mode === "view" ? (
                <>
                  <Ctrl t={t} icon="pencil" onClick={enterEdit}>Edit map</Ctrl>
                  <Ctrl t={t} icon={showNumbers ? "eye-off" : "eye"} onClick={() => setShowNumbers((s) => !s)}>
                    {showNumbers ? "Hide numbers" : "Show numbers"}
                  </Ctrl>
                  <label className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs", t.chip)}>
                    <Icon name="square-stack" size={13} /> Overlay
                    <input type="range" min="0.25" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="accent-brand-500" />
                  </label>
                </>
              ) : (
                <ToolPicker t={t} tool={tool} setTool={setTool} />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Ctrl t={t} icon="zoom-in" onClick={() => canvasRef.current?.zoomBy(1.25)} square />
              <Ctrl t={t} icon="zoom-out" onClick={() => canvasRef.current?.zoomBy(1 / 1.25)} square />
              <Ctrl t={t} icon="maximize" onClick={() => canvasRef.current?.fitView()}>Fit</Ctrl>
              {mode === "view" ? (
                <Ctrl t={t} icon="trash-2" onClick={() => setConfirmRemove(true)} danger>Remove</Ctrl>
              ) : (
                <>
                  <Ctrl t={t} icon="x" onClick={cancelEdit}>Cancel</Ctrl>
                  <Button size="sm" icon="check" onClick={saveRegions}>Save map</Button>
                </>
              )}
            </div>
          </div>

          <MapCanvas
            ref={canvasRef}
            src={layoutImg}
            regions={viewRegions}
            plotById={plotById}
            mode={mode}
            tool={tool}
            showNumbers={showNumbers}
            overlayOpacity={opacity}
            selectedPlotId={mode === "view" ? selPlot?.id ?? null : null}
            selDraftIdx={selDraftIdx}
            onSelectDraft={setSelDraftIdx}
            onPlotClick={(plot, reg) => setSelected({ plot, reg })}
            onHover={setHover}
            onShapeComplete={onShapeComplete}
          />

          {/* Footer: legend (view) or edit status bar */}
          {mode === "view" ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {STATUS_ORDER.map((k) => (
                <span key={k} className={cn("inline-flex items-center gap-1.5 text-xs", t.sub)}>
                  <span className="h-3 w-3 rounded" style={{ background: STATUS[k].color }} /> {STATUS[k].label}
                </span>
              ))}
              <span className={cn("ml-auto text-xs", t.sub)}>
                {savedRegions.filter((r) => r.kind !== "label").length} mapped · {outstanding > 0 ? `${formatINR(outstanding)} outstanding` : "all cleared"}
              </span>
            </div>
          ) : (
            <EditBar
              t={t}
              count={draft.filter((r) => r.kind !== "label").length}
              labels={draft.filter((r) => r.kind === "label").length}
              total={allPlots.length}
              selected={selDraftIdx != null ? draft[selDraftIdx] : null}
              plotById={plotById}
              onChangePlot={() => selDraftIdx != null && setAssign({ reassignIdx: selDraftIdx })}
              onDelete={deleteDraft}
            />
          )}
        </>
      )}

      {/* Hover glassmorphism card */}
      {hover?.plot && mode === "view" && <HoverCard hover={hover} />}

      {/* Assign-plot modal (after drawing a plot polygon, or reassigning) */}
      {assign && (
        <AssignPlotModal
          plots={allPlots}
          mappedIds={mappedDraftIds}
          onClose={() => setAssign(null)}
          onPick={assignPlot}
        />
      )}

      {/* Label modal (after drawing a label box) */}
      {pendingLabel && (
        <LabelModal onClose={() => setPendingLabel(null)} onSave={(v) => { addLabel(v); }} />
      )}

      {/* Replace-layout confirm */}
      <ConfirmDialog
        open={!!pendingLayout}
        onClose={() => setPendingLayout(null)}
        onConfirm={() => { const n = pendingLayout; setPendingLayout(null); saveLayout(n, true); }}
        title="Replace the site plan?"
        message={`The ${savedRegions.length} region(s) mapped on the current plan were drawn over the old image and won't line up with a new one. They'll be cleared so you can re-map.`}
        confirmLabel="Replace & clear"
        confirmVariant="danger"
      />
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={removeLayout}
        title="Remove this layout?"
        message="The site plan image and every region you've mapped will be deleted. This can't be undone."
        confirmLabel="Remove layout"
        confirmVariant="danger"
      />

      {/* Details sidebar */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selPlot ? `Plot ${selPlot.plotNo}` : "Plot"}
        subtitle={selPlot?.phase}
        footer={
          selPlot && (
            <>
              <Button variant="secondary" icon="receipt" onClick={() => setReceiptsFor({ plotNo: selPlot.plotNo, name: selPlot.ownerName })}>
                View payments
              </Button>
              <Button icon="send" onClick={() => setReminderFor(selPlot)}>Send reminder</Button>
            </>
          )
        }
      >
        {selPlot && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={selPlot.ownerName ?? "NA"} size={46} />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{selPlot.ownerName ?? "Not registered"}</p>
                <p className="text-sm text-slate-500">{selPlot.sizeSqyd ? `${selPlot.sizeSqyd} sqyd` : "—"}</p>
              </div>
              <span
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: `${selStatus.color}22`, color: selStatus.color }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: selStatus.color }} /> {selStatus.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
              <Detail label="Phone" value={selPlot.phone ?? "—"} />
              <Detail label="Email" value={selPlot.email ?? "—"} className="truncate" />
              <Detail label="Membership" value={selPlot.membership ?? "—"} className="capitalize" />
              <Detail label="Days overdue" value={selPlot.daysOverdue > 0 ? `${selPlot.daysOverdue} days` : "—"} />
              <Detail label="Balance" value={selPlot.amountDue > 0 ? formatINR(selPlot.amountDue) : "Cleared"} />
              <Detail label="Mapped" value={selected?.reg ? "On layout" : "Not on layout"} />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Set plot status</p>
              <div className="flex flex-wrap gap-1.5">
                {PLOT_STATUSES.map((s) => (
                  <button
                    key={s}
                    disabled={savingStatus}
                    onClick={() => setPlotStatus(selPlot, s)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium capitalize transition-colors disabled:opacity-50",
                      selPlot.status === s ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                    style={selPlot.status === s ? { background: STATUS[s].color } : undefined}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link href="/admin/owners" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                <Icon name="user" size={15} /> View owner
              </Link>
              <Link href="/admin/documents" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
                <Icon name="folder" size={15} /> Documents
              </Link>
            </div>
          </div>
        )}
      </Drawer>

      {receiptsFor && <ReceiptsModal plotNo={receiptsFor.plotNo} ownerName={receiptsFor.name} onClose={() => setReceiptsFor(null)} />}
      <SendReminderModal
        open={!!reminderFor}
        onClose={() => setReminderFor(null)}
        recipientLabel={reminderFor ? `${reminderFor.ownerName ?? "Owner"} · ${reminderFor.plotNo}` : ""}
        amountLabel={reminderFor?.amountDue > 0 ? formatINR(reminderFor.amountDue) : undefined}
        onConfirm={(channels) => {
          toast(`Reminder sent to ${reminderFor?.ownerName ?? reminderFor?.plotNo} via ${channels.join(", ")}`);
          setReminderFor(null);
        }}
      />
    </div>
  );
}

/* =============================== sub-views =============================== */

function theme(dark) {
  return dark
    ? {
        shell: "bg-slate-950",
        text: "text-slate-100",
        sub: "text-slate-400",
        chip: "border-slate-700 bg-slate-800/60 text-slate-200",
        input: "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-brand-500",
        menu: "border-slate-700 bg-slate-900",
        menuItem: "text-slate-200 hover:bg-slate-800",
        empty: "border-slate-700 text-slate-300 hover:border-brand-500/60 hover:bg-slate-900/50",
        card: "border-slate-800 bg-slate-900/60",
        ctrl: "border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700/70",
      }
    : {
        shell: "bg-slate-50",
        text: "text-slate-900",
        sub: "text-slate-500",
        chip: "border-slate-200 bg-white text-slate-700",
        input: "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-brand-400",
        menu: "border-slate-200 bg-white",
        menuItem: "text-slate-700 hover:bg-slate-50",
        empty: "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50/40",
        card: "border-slate-200 bg-white",
        ctrl: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      };
}

function Ctrl({ t, icon, children, onClick, danger, square }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors",
        square ? "w-9" : "px-3",
        danger ? "border-rose-300/40 text-rose-400 hover:bg-rose-500/10" : t.ctrl,
      )}
    >
      <Icon name={icon} size={14} />
      {children}
    </button>
  );
}

function Stat({ t, label, value, dot, icon }) {
  return (
    <div className={cn("rounded-2xl border p-3.5 shadow-sm transition-colors", t.card)}>
      <div className="flex items-center gap-1.5">
        {icon ? <Icon name={icon} size={13} className={t.sub} /> : <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />}
        <span className={cn("truncate text-[11px] font-medium uppercase tracking-wide", t.sub)}>{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function FilterChips({ t, value, onChange, options }) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-xl border p-1", t.chip)}>
      {options.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.k ? "bg-brand-600 text-white" : "opacity-80 hover:opacity-100",
          )}
        >
          {o.k !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToolPicker({ t, tool, setTool }) {
  const tools = [
    { k: "select", icon: "mouse-pointer-2", label: "Select / pan" },
    { k: "polygon", icon: "pentagon", label: "Polygon" },
    { k: "rectangle", icon: "square", label: "Rectangle" },
    { k: "label", icon: "type", label: "Label" },
  ];
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-xl border p-1", t.chip)}>
      {tools.map((x) => (
        <button
          key={x.k}
          onClick={() => setTool(x.k)}
          title={x.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
            tool === x.k ? "bg-brand-600 text-white" : "opacity-80 hover:opacity-100",
          )}
        >
          <Icon name={x.icon} size={13} /> {x.label}
        </button>
      ))}
    </div>
  );
}

function EditBar({ t, count, labels, total, selected, plotById, onChangePlot, onDelete }) {
  const o = selected && selected.kind !== "label" ? plotById.get(selected.plotId) : null;
  return (
    <div className={cn("mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm", t.card)}>
      <span className={t.sub}>
        <b className={t.text}>{count}</b> / {total} plots mapped
        {labels > 0 && <> · {labels} label{labels === 1 ? "" : "s"}</>}
      </span>
      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs">
            Selected: <b>{selected.kind === "label" ? `“${selected.label}”` : o ? `${o.plotNo} · ${o.ownerName ?? "Unregistered"}` : "Unknown"}</b>
          </span>
          {selected.kind !== "label" && <Ctrl t={t} icon="repeat" onClick={onChangePlot}>Change plot</Ctrl>}
          <Ctrl t={t} icon="trash-2" danger onClick={onDelete}>Delete</Ctrl>
        </div>
      ) : (
        <span className={cn("text-xs", t.sub)}>
          Pick a tool, then draw on the plan. Polygon: click each vertex, then click the first point (or press Enter) to finish. Click a shape to select it.
        </span>
      )}
    </div>
  );
}

function HoverCard({ hover }) {
  const { plot, x, y } = hover;
  const st = STATUS[mapStatus(plot)] || STATUS.available;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(x + 16, vw - 280);
  const top = Math.min(y + 16, vh - 190);
  return (
    <div
      className="pointer-events-none fixed z-[60] w-64 animate-fade-in rounded-2xl border border-white/20 p-3.5 shadow-2xl"
      style={{ left, top, background: "rgba(15,23,42,0.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={plot.ownerName ?? "NA"} size={34} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{plot.ownerName ?? "Unregistered"}</p>
          <p className="text-xs text-slate-300">Plot {plot.plotNo} · {plot.phase ?? "—"}</p>
        </div>
        <span className="ml-auto h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2.5 text-xs">
        <HoverItem label="Area" value={plot.sizeSqyd ? `${plot.sizeSqyd} sqyd` : "—"} />
        <HoverItem label="Status" value={st.label} valueColor={st.color} />
        <HoverItem label="Balance" value={plot.amountDue > 0 ? formatINR(plot.amountDue) : "Cleared"} />
        <HoverItem label="Phone" value={plot.phone ?? "—"} />
      </div>
    </div>
  );
}
function HoverItem({ label, value, valueColor }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="font-medium" style={{ color: valueColor || "#e2e8f0" }}>{value}</p>
    </div>
  );
}

function Detail({ label, value, className }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn("font-medium text-slate-700", className)}>{value}</p>
    </div>
  );
}

function AssignPlotModal({ plots, mappedIds, onClose, onPick }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const list = plots.filter((o) => !term || o.plotNo?.toLowerCase().includes(term) || o.ownerName?.toLowerCase().includes(term));
  return (
    <Modal open onClose={onClose} title="Assign a plot to this shape">
      <input autoFocus className={inputClass} placeholder="Search plot no. or owner…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 max-h-72 space-y-1 overflow-auto">
        {list.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No plots match “{q}”.</p>}
        {list.map((o) => {
          const already = mappedIds.has(o.id);
          return (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS[mapStatus(o)].color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-700">{o.plotNo} · {o.ownerName ?? "Unregistered"}</span>
                <span className="block truncate text-xs text-slate-400">{o.phase ?? "—"} · {o.sizeSqyd ?? "?"} sqyd</span>
              </span>
              {already && <span className="ml-auto shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">already mapped</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function LabelModal({ onClose, onSave }) {
  const [label, setLabel] = useState("");
  const [labelType, setLabelType] = useState("road");
  return (
    <Modal
      open
      onClose={onClose}
      title="Add a map label"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="check" disabled={!label.trim()} onClick={() => label.trim() && onSave({ label: label.trim(), labelType })}>Add label</Button>
        </>
      }
    >
      <div className="space-y-3">
        <input autoFocus className={inputClass} placeholder="e.g. 40 FT ROAD, PARK AREA, OPEN SPACE" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(LABEL_TYPES).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setLabelType(k)}
              className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors", labelType === k ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">Labels are shown on the map but are never clickable.</p>
      </div>
    </Modal>
  );
}
