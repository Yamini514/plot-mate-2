// Pure helpers for the interactive plot map — no React, no DOM. Kept separate so
// the geometry/colour logic is easy to reason about and reuse from the canvas
// and the page orchestrator.

/* ----------------------------- Status model ----------------------------- */
// Six map colours blended from the plot's lifecycle `status` and its
// payment state. Precedence (highest first): blocked → overdue → pending →
// sold → booked → available. So a sold-but-overdue plot reads as overdue.
export const STATUS = {
  available: { label: "Available", color: "#10b981", soft: "rgba(16,185,129,0.22)" },
  booked: { label: "Booked", color: "#3b82f6", soft: "rgba(59,130,246,0.22)" },
  sold: { label: "Sold", color: "#8b5cf6", soft: "rgba(139,92,246,0.24)" },
  pending: { label: "Pending payment", color: "#f59e0b", soft: "rgba(245,158,11,0.24)" },
  overdue: { label: "Overdue", color: "#ef4444", soft: "rgba(239,68,68,0.26)" },
  blocked: { label: "Blocked", color: "#64748b", soft: "rgba(100,116,139,0.28)" },
};
export const STATUS_ORDER = ["available", "booked", "sold", "pending", "overdue", "blocked"];

export function mapStatus(o) {
  if (!o) return "available";
  if (o.status === "blocked") return "blocked";
  if (o.paymentStatus === "pending" && (o.daysOverdue || 0) > 0) return "overdue";
  if (o.paymentStatus === "pending") return "pending";
  if (o.status === "sold") return "sold";
  if (o.status === "booked") return "booked";
  return "available";
}

// Label regions (roads / parks / open spaces / amenities) — non-clickable text.
export const LABEL_TYPES = {
  road: { label: "Road", color: "#cbd5e1", bg: "rgba(15,23,42,0.62)" },
  park: { label: "Park", color: "#86efac", bg: "rgba(6,78,59,0.55)" },
  open_space: { label: "Open space", color: "#bae6fd", bg: "rgba(12,74,110,0.5)" },
  amenity: { label: "Amenity", color: "#ddd6fe", bg: "rgba(76,29,149,0.5)" },
};

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ------------------------------- Geometry ------------------------------- */
// All region geometry lives in normalized percentages (0..100) of the image
// box, so it stays correct at any render size or zoom.

export function rectToPoints(r) {
  return [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x + r.w, r.y + r.h],
    [r.x, r.y + r.h],
  ];
}

// A region's polygon vertices (pct). Falls back to its bounding-box rectangle
// when it has no explicit polygon — keeps legacy rectangle regions working.
export function regionPoints(reg) {
  return Array.isArray(reg.points) && reg.points.length >= 3
    ? reg.points
    : rectToPoints(reg);
}

export function centroid(pts) {
  const n = pts.length || 1;
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return { x: sx / n, y: sy / n };
}

export function boundingBox(pts) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// SVG point string in image-pixel space (svg viewBox is "0 0 imgW imgH", 1:1,
// so polygons never distort the way a stretched 0..100 viewBox would).
export function toSvgPoints(pts, imgW, imgH) {
  return pts.map(([x, y]) => `${(x / 100) * imgW},${(y / 100) * imgH}`).join(" ");
}

/* -------------------------- SVG vector import --------------------------- */
// Parse an uploaded SVG and pull out clickable shapes whose id/data-plot names a
// plot (e.g. id="plot_101", "plot-101", "P-101", "101"). Returns polygons in
// 0..100 percentage space keyed by the extracted plot code, ready to match
// against plot numbers. Best-effort + dependency-free (uses DOMParser).
export function parseSvgPlots(svgText) {
  if (typeof window === "undefined") return { plots: [], error: "no-dom" };
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) return { plots: [], error: "Invalid SVG file" };
  const svg = doc.querySelector("svg");
  if (!svg) return { plots: [], error: "No <svg> root found" };

  // Resolve the coordinate box from viewBox (preferred) or width/height.
  const vb = (svg.getAttribute("viewBox") || "").trim().split(/[\s,]+/).map(Number);
  let bx = 0;
  let by = 0;
  let bw = Number(svg.getAttribute("width")) || 0;
  let bh = Number(svg.getAttribute("height")) || 0;
  if (vb.length === 4 && vb.every((n) => !Number.isNaN(n))) {
    [bx, by, bw, bh] = vb;
  }
  if (!bw || !bh) return { plots: [], error: "SVG has no viewBox or size" };

  const pct = (x, y) => [
    clamp(((x - bx) / bw) * 100, 0, 100),
    clamp(((y - by) / bh) * 100, 0, 100),
  ];

  const codeOf = (el) => {
    const raw = el.getAttribute("data-plot") || el.getAttribute("id") || "";
    const m = raw.match(/(\d+)\s*$/);
    return m ? m[1] : null;
  };

  const out = [];
  // <polygon points="x,y x,y ...">
  doc.querySelectorAll("polygon[points]").forEach((el) => {
    const code = codeOf(el);
    if (!code) return;
    const nums = el.getAttribute("points").trim().split(/[\s,]+/).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push(pct(nums[i], nums[i + 1]));
    if (pts.length >= 3) out.push({ code, points: pts });
  });
  // <rect> with a plot id → 4-point polygon.
  doc.querySelectorAll("rect").forEach((el) => {
    const code = codeOf(el);
    if (!code) return;
    const x = Number(el.getAttribute("x")) || 0;
    const y = Number(el.getAttribute("y")) || 0;
    const w = Number(el.getAttribute("width")) || 0;
    const h = Number(el.getAttribute("height")) || 0;
    if (!w || !h) return;
    out.push({
      code,
      points: [pct(x, y), pct(x + w, y), pct(x + w, y + h), pct(x, y + h)],
    });
  });
  // <path> with only move/line segments (straight-edged plot outlines).
  doc.querySelectorAll("path[d]").forEach((el) => {
    const code = codeOf(el);
    if (!code) return;
    const pts = parseStraightPath(el.getAttribute("d"));
    if (pts && pts.length >= 3) out.push({ code, points: pts.map(([x, y]) => pct(x, y)) });
  });

  return { plots: out, error: out.length ? null : "No plot shapes found (need id=\"plot_NN\")" };
}

// Minimal absolute M/L/H/V/Z path reader — enough for straight-edged plot
// outlines exported from CAD/SVG tools. Returns null for curves it can't follow.
function parseStraightPath(d) {
  const tokens = d.match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  if (!tokens) return null;
  const pts = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let cmd = null;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MLHVZmlhvz]/.test(t)) {
      cmd = t;
      i++;
      if (cmd === "Z" || cmd === "z") break;
      continue;
    }
    const abs = cmd === cmd?.toUpperCase();
    if (cmd === "M" || cmd === "L" || cmd === "m" || cmd === "l") {
      const x = num();
      const y = num();
      cx = abs ? x : cx + x;
      cy = abs ? y : cy + y;
    } else if (cmd === "H" || cmd === "h") {
      const x = num();
      cx = abs ? x : cx + x;
    } else if (cmd === "V" || cmd === "v") {
      const y = num();
      cy = abs ? y : cy + y;
    } else {
      return null; // curve/arc command — give up rather than guess
    }
    pts.push([cx, cy]);
  }
  return pts;
}
