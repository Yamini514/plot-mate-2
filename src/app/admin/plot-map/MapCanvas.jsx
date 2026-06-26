"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  STATUS,
  LABEL_TYPES,
  mapStatus,
  regionPoints,
  centroid,
  boundingBox,
  toSvgPoints,
  clamp,
} from "./mapkit";

const MIN_SCALE = 0.05;
const MAX_SCALE = 16;

/**
 * The interactive map surface: a layout image with an SVG overlay of clickable
 * plot polygons and non-clickable text labels, on a dark canvas with native
 * pan / zoom / fit-to-screen (no external pan-zoom dependency).
 *
 * Imperative handle (via ref): focusRegion(region), fitView(), zoomBy(factor).
 *
 * Coordinates are stored as 0..100 percentages of the image; the SVG viewBox is
 * the image's natural pixel box (1:1) so polygons and text never distort.
 */
export const MapCanvas = forwardRef(function MapCanvas(
  {
    src,
    regions,
    plotById,
    mode = "view", // view | edit
    tool = "select", // select | polygon | rectangle | label (edit only)
    showNumbers = true,
    overlayOpacity = 1,
    selectedPlotId = null,
    selDraftIdx = null,
    onSelectDraft,
    onPlotClick,
    onHover,
    onShapeComplete, // (pointsPct[], tool)
    height = "72vh",
  },
  ref,
) {
  const viewportRef = useRef(null);
  const [imgN, setImgN] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [anim, setAnim] = useState(false);

  // Live mirrors so fast pointer/wheel handlers never read a stale closure.
  const viewRef = useRef(view);
  viewRef.current = view;
  const imgRef = useRef(imgN);
  imgRef.current = imgN;
  const userMoved = useRef(false);

  // In-progress drawing state.
  const [draftPts, setDraftPts] = useState([]); // polygon vertices (pct)
  // Mirror so polygon-completion can read the current vertices without doing the
  // work inside a setState updater (which would run — and fire the parent's
  // onShapeComplete — during render: "setState while rendering" violation).
  const draftPtsRef = useRef(draftPts);
  draftPtsRef.current = draftPts;
  const [rectDraw, setRectDraw] = useState(null); // { x0,y0,x1,y1 } pct
  const pan = useRef(null); // { x, y, tx, ty } while a drag is active, else null
  const movedRef = useRef(false); // did the active drag actually move?
  const wasDrag = useRef(false); // last pointer-up ended a drag (suppress click)
  const [grabbing, setGrabbing] = useState(false);
  const animTimer = useRef(null);

  /* ----------------------------- geometry ----------------------------- */
  const computeFit = useCallback(() => {
    const vp = viewportRef.current?.getBoundingClientRect();
    const img = imgRef.current;
    if (!vp || !img.w || !img.h) return { scale: 1, tx: 0, ty: 0 };
    const s = Math.min(vp.width / img.w, vp.height / img.h);
    return { scale: s, tx: (vp.width - img.w * s) / 2, ty: (vp.height - img.h * s) / 2 };
  }, []);

  const animateTo = useCallback((next) => {
    setAnim(true);
    setView(next);
    clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => setAnim(false), 400);
  }, []);

  const pointerPct = useCallback((e) => {
    const vp = viewportRef.current.getBoundingClientRect();
    const v = viewRef.current;
    const img = imgRef.current;
    const sx = (e.clientX - vp.left - v.tx) / v.scale;
    const sy = (e.clientY - vp.top - v.ty) / v.scale;
    return {
      x: clamp((sx / img.w) * 100, 0, 100),
      y: clamp((sy / img.h) * 100, 0, 100),
    };
  }, []);

  const zoomAt = useCallback((px, py, factor) => {
    const v = viewRef.current;
    const s = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
    if (s === v.scale) return;
    setView({ scale: s, tx: px - (px - v.tx) * (s / v.scale), ty: py - (py - v.ty) * (s / v.scale) });
  }, []);

  useImperativeHandle(ref, () => ({
    focusRegion(reg) {
      const vp = viewportRef.current?.getBoundingClientRect();
      const img = imgRef.current;
      if (!vp || !img.w) return;
      const c = centroid(regionPoints(reg));
      const cx = (c.x / 100) * img.w;
      const cy = (c.y / 100) * img.h;
      const fit = computeFit();
      const s = clamp(fit.scale * 2.8, fit.scale, MAX_SCALE);
      userMoved.current = true;
      animateTo({ scale: s, tx: vp.width / 2 - cx * s, ty: vp.height / 2 - cy * s });
    },
    fitView() {
      userMoved.current = false;
      animateTo(computeFit());
    },
    zoomBy(factor) {
      const vp = viewportRef.current?.getBoundingClientRect();
      if (!vp) return;
      userMoved.current = true;
      zoomAt(vp.width / 2, vp.height / 2, factor);
    },
  }));

  /* ------------------------- fit on load / resize ------------------------- */
  const onImgLoad = (e) => {
    const w = e.target.naturalWidth || e.target.width;
    const h = e.target.naturalHeight || e.target.height;
    setImgN({ w, h });
  };
  // First fit once we know the image size (unless the user already moved).
  useEffect(() => {
    if (imgN.w && !userMoved.current) setView(computeFit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgN.w, imgN.h]);
  // Re-fit on viewport resize while the user hasn't taken manual control.
  useEffect(() => {
    const onResize = () => {
      if (!userMoved.current) setView(computeFit());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [computeFit]);
  // New image → reset interaction so it re-fits.
  useEffect(() => {
    userMoved.current = false;
  }, [src]);

  /* ------------------------------ wheel zoom ------------------------------ */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const vp = el.getBoundingClientRect();
      userMoved.current = true;
      setAnim(false);
      zoomAt(e.clientX - vp.left, e.clientY - vp.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /* --------------------------- pointer handlers --------------------------- */
  const isDrawingTool = mode === "edit" && (tool === "rectangle" || tool === "label");

  const onPointerDown = (e) => {
    // Polygon tool builds via clicks, not drag.
    if (mode === "edit" && tool === "polygon") return;
    if (isDrawingTool) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const p = pointerPct(e);
      setRectDraw({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      return;
    }
    // Otherwise: pan (works in view mode and the edit "select" tool).
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const v = viewRef.current;
    pan.current = { x: e.clientX, y: e.clientY, tx: v.tx, ty: v.ty };
    movedRef.current = false;
  };

  const onPointerMove = (e) => {
    if (rectDraw) {
      const p = pointerPct(e);
      setRectDraw((d) => (d ? { ...d, x1: p.x, y1: p.y } : d));
      return;
    }
    if (pan.current) {
      const dx = e.clientX - pan.current.x;
      const dy = e.clientY - pan.current.y;
      if (!movedRef.current && Math.abs(dx) + Math.abs(dy) > 4) {
        movedRef.current = true;
        setGrabbing(true);
        if (onHover) onHover(null);
      }
      if (movedRef.current) {
        userMoved.current = true;
        setAnim(false);
        setView((v) => ({ ...v, tx: pan.current.tx + dx, ty: pan.current.ty + dy }));
      }
    }
  };

  const endPan = (e) => {
    e?.currentTarget?.releasePointerCapture?.(e.pointerId);
    if (rectDraw) {
      const r = {
        x: Math.min(rectDraw.x0, rectDraw.x1),
        y: Math.min(rectDraw.y0, rectDraw.y1),
        w: Math.abs(rectDraw.x1 - rectDraw.x0),
        h: Math.abs(rectDraw.y1 - rectDraw.y0),
      };
      setRectDraw(null);
      if (r.w >= 0.6 && r.h >= 0.6) {
        onShapeComplete?.(
          [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]],
          tool,
        );
      }
      return;
    }
    if (pan.current) {
      wasDrag.current = movedRef.current; // suppress the click that follows a drag
      pan.current = null;
      setGrabbing(false);
    }
  };

  // Clicks: add polygon vertex, or select/open a plot (delegated via data-idx).
  const onCanvasClick = (e) => {
    if (mode === "edit" && tool === "polygon") {
      const p = pointerPct(e);
      const pts = draftPtsRef.current;
      // Click near the first vertex closes the polygon.
      if (pts.length >= 3) {
        const first = pts[0];
        const vp = viewportRef.current.getBoundingClientRect();
        const v = viewRef.current;
        const fx = vp.left + v.tx + (first[0] / 100) * imgRef.current.w * v.scale;
        const fy = vp.top + v.ty + (first[1] / 100) * imgRef.current.h * v.scale;
        if (Math.hypot(e.clientX - fx, e.clientY - fy) < 12) {
          setDraftPts([]);
          onShapeComplete?.(pts, "polygon");
          return;
        }
      }
      setDraftPts((prev) => [...prev, [p.x, p.y]]);
      return;
    }
    if (wasDrag.current) { wasDrag.current = false; return; } // it was a pan, not a click
    // Pin tool: a single click drops a small square at the cursor, then the page
    // asks which plot it belongs to (same assign flow as a drawn shape).
    if (mode === "edit" && tool === "point") {
      const p = pointerPct(e);
      const img = imgRef.current;
      const t = Math.max(img.w, img.h) * 0.025; // ~2.5% pixel-square marker
      const hw = ((t / img.w) * 100) / 2;
      const hh = ((t / img.h) * 100) / 2;
      const x0 = clamp(p.x - hw, 0, 100), y0 = clamp(p.y - hh, 0, 100);
      const x1 = clamp(p.x + hw, 0, 100), y1 = clamp(p.y + hh, 0, 100);
      onShapeComplete?.([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], "point");
      return;
    }
    const idxAttr = e.target?.getAttribute?.("data-idx");
    if (idxAttr == null) return;
    const reg = regions[Number(idxAttr)];
    if (!reg) return;
    if (mode === "edit") {
      onSelectDraft?.(Number(idxAttr));
    } else if (reg.kind !== "label") {
      onPlotClick?.(plotById.get(reg.plotId) || null, reg);
    }
  };

  const finishPolygon = useCallback(() => {
    const pts = draftPtsRef.current;
    setDraftPts([]);
    if (pts.length >= 3) onShapeComplete?.(pts, "polygon");
  }, [onShapeComplete]);

  // Enter finishes a polygon, Escape cancels the in-progress drawing.
  useEffect(() => {
    if (mode !== "edit") return;
    const onKey = (e) => {
      if (e.key === "Enter") finishPolygon();
      else if (e.key === "Escape") {
        setDraftPts([]);
        setRectDraw(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, finishPolygon]);

  // Reset any half-drawn shape when leaving edit mode or switching tools.
  useEffect(() => {
    setDraftPts([]);
    setRectDraw(null);
  }, [mode, tool]);

  /* ------------------------------- hover -------------------------------- */
  const onPlotsMove = (e) => {
    if (mode !== "view" || pan.current || !onHover) return;
    const idxAttr = e.target?.getAttribute?.("data-idx");
    if (idxAttr == null) return onHover(null);
    const reg = regions[Number(idxAttr)];
    if (!reg || reg.kind === "label") return onHover(null);
    const plot = plotById.get(reg.plotId) || null;
    onHover({ plot, reg, x: e.clientX, y: e.clientY });
  };
  const onPlotsLeave = () => onHover && onHover(null);

  /* ------------------------------- render -------------------------------- */
  const cursor = isDrawingTool || (mode === "edit" && (tool === "polygon" || tool === "point"))
    ? "crosshair"
    : grabbing
      ? "grabbing"
      : "grab";

  const px = (v, dim) => (v / 100) * (dim === "x" ? imgN.w : imgN.h);
  const inProgressRect = rectDraw && {
    x: px(Math.min(rectDraw.x0, rectDraw.x1), "x"),
    y: px(Math.min(rectDraw.y0, rectDraw.y1), "y"),
    w: px(Math.abs(rectDraw.x1 - rectDraw.x0), "x"),
    h: px(Math.abs(rectDraw.y1 - rectDraw.y0), "y"),
  };

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onClick={onCanvasClick}
      className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_30%_20%,#1e293b,#020617_70%)]"
      style={{ height, touchAction: "none", cursor }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: imgN.w || 1,
          height: imgN.h || 1,
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          transition: anim ? "transform 0.38s cubic-bezier(0.22,1,0.36,1)" : "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL; next/image can't optimize arbitrary uploads */}
        <img
          src={src}
          alt="Site layout"
          onLoad={onImgLoad}
          draggable={false}
          className="block select-none"
          style={{ width: imgN.w || "auto", height: imgN.h || "auto", opacity: 0.96 }}
        />

        {imgN.w > 0 && (
          <svg
            viewBox={`0 0 ${imgN.w} ${imgN.h}`}
            width={imgN.w}
            height={imgN.h}
            className="absolute left-0 top-0"
            style={{ overflow: "visible" }}
          >
            {/* Plot polygons (clickable) — single delegated handler group. */}
            <g
              onPointerMove={onPlotsMove}
              onPointerLeave={onPlotsLeave}
              style={{ opacity: overlayOpacity }}
            >
              {regions.map((reg, i) => {
                if (reg.kind === "label") return null;
                const pts = regionPoints(reg);
                const plot = plotById.get(reg.plotId);
                const st = STATUS[mapStatus(plot)] || STATUS.available;
                const isSel =
                  (mode === "view" && plot && plot.id === selectedPlotId) ||
                  (mode === "edit" && selDraftIdx === i);
                return (
                  <polygon
                    key={reg._key ?? reg.id ?? i}
                    data-idx={i}
                    points={toSvgPoints(pts, imgN.w, imgN.h)}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      fill: isSel ? st.color : st.soft,
                      fillOpacity: isSel ? 0.55 : 1,
                      stroke: st.color,
                      strokeWidth: isSel ? 3 : 1.5,
                      cursor: mode === "view" ? "pointer" : "default",
                      transition: "fill-opacity 0.15s, stroke-width 0.15s",
                    }}
                  />
                );
              })}
            </g>

            {/* Plot numbers — SVG text scales with zoom (no per-frame React work). */}
            {showNumbers &&
              regions.map((reg, i) => {
                if (reg.kind === "label") return null;
                const plot = plotById.get(reg.plotId);
                const bb = boundingBox(regionPoints(reg));
                const hPx = (bb.h / 100) * imgN.h;
                const fs = clamp(hPx * 0.34, 7, 42);
                const c = centroid(regionPoints(reg));
                return (
                  <text
                    key={`t${reg._key ?? reg.id ?? i}`}
                    x={(c.x / 100) * imgN.w}
                    y={(c.y / 100) * imgN.h}
                    textAnchor="middle"
                    dominantBaseline="central"
                    pointerEvents="none"
                    style={{
                      fill: "#fff",
                      fontSize: fs,
                      fontWeight: 700,
                      stroke: "rgba(2,6,23,0.55)",
                      strokeWidth: 0.6,
                      paintOrder: "stroke",
                    }}
                    vectorEffect="non-scaling-stroke"
                  >
                    {(plot?.plotNo || "").replace(/^P-?/i, "")}
                  </text>
                );
              })}

            {/* In-progress polygon */}
            {draftPts.length > 0 && (
              <g pointerEvents="none">
                <polyline
                  points={toSvgPoints(draftPts, imgN.w, imgN.h)}
                  vectorEffect="non-scaling-stroke"
                  style={{ fill: "rgba(16,185,129,0.18)", stroke: "#34d399", strokeWidth: 2, strokeDasharray: "6 4" }}
                />
                {draftPts.map(([x, y], k) => (
                  <circle
                    key={k}
                    cx={(x / 100) * imgN.w}
                    cy={(y / 100) * imgN.h}
                    r={5}
                    vectorEffect="non-scaling-stroke"
                    style={{ fill: k === 0 ? "#34d399" : "#fff", stroke: "#059669", strokeWidth: 2 }}
                  />
                ))}
              </g>
            )}

            {/* In-progress rectangle / label box */}
            {inProgressRect && (
              <rect
                x={inProgressRect.x}
                y={inProgressRect.y}
                width={inProgressRect.w}
                height={inProgressRect.h}
                vectorEffect="non-scaling-stroke"
                style={{
                  fill: tool === "label" ? "rgba(148,163,184,0.18)" : "rgba(16,185,129,0.16)",
                  stroke: tool === "label" ? "#94a3b8" : "#34d399",
                  strokeWidth: 2,
                  strokeDasharray: "6 4",
                }}
              />
            )}
          </svg>
        )}

        {/* Map labels (roads / parks / open spaces) — HTML, counter-scaled so
            they stay crisp & readable at any zoom; never clickable. */}
        {imgN.w > 0 &&
          regions.map((reg, i) => {
            if (reg.kind !== "label") return null;
            const c = centroid(regionPoints(reg));
            const lt = LABEL_TYPES[reg.labelType] || LABEL_TYPES.road;
            return (
              <div
                key={`l${reg._key ?? reg.id ?? i}`}
                className="pointer-events-none absolute select-none whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  transform: `translate(-50%, -50%) scale(${1 / view.scale})`,
                  transformOrigin: "center",
                  color: lt.color,
                  background: lt.bg,
                  border: `1px solid ${lt.color}33`,
                }}
              >
                {reg.label}
              </div>
            );
          })}
      </div>
    </div>
  );
});
