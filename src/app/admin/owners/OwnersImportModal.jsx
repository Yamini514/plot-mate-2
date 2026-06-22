"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Modal, Button, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

// Importable plot fields and the header synonyms we auto-detect them from.
const FIELDS = [
  { key: "plotNo", label: "Plot number", required: true, synonyms: ["plotno", "plot", "plotnumber", "plotno.", "plot#", "plotid", "unitno"] },
  { key: "name", label: "Owner name", synonyms: ["owner", "ownername", "name", "fullname", "owners"] },
  { key: "phone", label: "Phone", synonyms: ["phone", "mobile", "contact", "phoneno", "phonenumber", "cell", "mobileno"] },
  { key: "email", label: "Email", synonyms: ["email", "mail", "emailid", "emailaddress"] },
  { key: "sizeSqyd", label: "Size (sqyd)", synonyms: ["size", "sizesqyd", "sqyd", "sqyds", "area", "plotsize", "sqyards"] },
  { key: "phase", label: "Phase", synonyms: ["phase", "block", "sector"] },
];

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


function autoMap(headers) {
  const map = {};
  const used = new Set();
  for (const f of FIELDS) {
    const idx = headers.findIndex((h, i) => {
      if (used.has(i)) return false;
      const n = norm(h);
      return n === norm(f.label) || f.synonyms.includes(n);
    });
    if (idx >= 0) {
      map[f.key] = idx;
      used.add(idx);
    }
  }
  return map;
}

export function OwnersImportModal({ existingPlotNos, onClose, onDone }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [step, setStep] = useState("upload"); // upload | map | result
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]); // array of arrays (data rows only)
  const [mapping, setMapping] = useState({}); // fieldKey -> column index
  const [applyDues, setApplyDues] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const readFile = async (file) => {
    if (!file) return;
    setParsing(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("The file has no sheets.");
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
      if (matrix.length < 2) throw new Error("Need a header row plus at least one data row.");
      const hdr = (matrix[0] || []).map((h) => String(h).trim());
      const body = matrix.slice(1).filter((r) => r.some((c) => String(c).trim() !== ""));
      setHeaders(hdr);
      setRawRows(body);
      setMapping(autoMap(hdr));
      setFileName(file.name);
      setStep("map");
    } catch (e) {
      toast(e.message || "Couldn't read that file", "error");
    } finally {
      setParsing(false);
    }
  };

  // Build the parsed/validated rows from the current column mapping.
  const parsed = useMemo(() => {
    const plotCol = mapping.plotNo;
    const seen = new Set();
    return rawRows.map((row, i) => {
      const val = (key) => {
        const idx = mapping[key];
        return idx == null ? "" : String(row[idx] ?? "").trim();
      };
      const plotNo = plotCol == null ? "" : String(row[plotCol] ?? "").trim();
      const rec = {
        plotNo,
        name: val("name"),
        phone: val("phone"),
        email: val("email"),
        sizeSqyd: val("sizeSqyd"),
        phase: val("phase"),
      };
      let state = "new";
      let issue = null;
      if (!plotNo) {
        state = "error";
        issue = "Missing plot number";
      } else if (seen.has(plotNo.toLowerCase())) {
        state = "error";
        issue = "Duplicate plot number in file";
      } else {
        seen.add(plotNo.toLowerCase());
        if (existingPlotNos.has(plotNo)) state = "update";
        if (rec.email && !EMAIL_RE.test(rec.email)) issue = "Email looks invalid (still imported)";
      }
      return { ...rec, _row: i + 2, state, issue }; // +2: 1-based + header row
    });
  }, [rawRows, mapping, existingPlotNos]);

  const counts = useMemo(() => {
    const c = { new: 0, update: 0, error: 0, warn: 0 };
    for (const p of parsed) {
      if (p.state === "error") c.error++;
      else {
        c[p.state]++;
        if (p.issue) c.warn++;
      }
    }
    return c;
  }, [parsed]);

  const importable = parsed.filter((p) => p.state !== "error");

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Plot No", "Owner Name", "Phone", "Email", "Size (sqyd)", "Phase"],
      ["P-101", "Asha Rao", "+91 98800 11223", "asha@example.com", "200", "Phase 1"],
    ]);
    ws["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plots");
    XLSX.writeFile(wb, "plotmate-owners-template.xlsx");
  };

  const runImport = async () => {
    if (mapping.plotNo == null) {
      toast("Map the Plot number column first", "error");
      return;
    }
    if (importable.length === 0) {
      toast("No valid rows to import", "error");
      return;
    }
    setImporting(true);
    try {
      const rows = importable.map((p) => ({
        plotNo: p.plotNo,
        ownerName: p.name || null,
        phone: p.phone || null,
        email: p.email || null,
        sizeSqyd: p.sizeSqyd || null,
        phase: p.phase || null,
      }));
      const { data } = await api.post("/admin/plots/import", { rows, applyDues });
      setResult(data);
      setStep("result");
      const done = (data?.created ?? 0) + (data?.updated ?? 0);
      toast(`Imported ${done} plot${done === 1 ? "" : "s"}`, "success");
      onDone?.();
    } catch (e) {
      toast(e.message || "Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  const stateBadge = (p) =>
    p.state === "error" ? (
      <Badge tone="rose">Error</Badge>
    ) : p.state === "update" ? (
      <Badge tone="sky">Update</Badge>
    ) : (
      <Badge tone="green">New</Badge>
    );

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={step === "result" ? "Import complete" : "Import plot owners"}
      footer={
        step === "upload" ? (
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        ) : step === "map" ? (
          <>
            <Button variant="ghost" onClick={() => setStep("upload")} icon="arrow-left">Back</Button>
            <Button icon="upload" loading={importing} disabled={importable.length === 0} onClick={runImport}>
              Import {importable.length} row{importable.length === 1 ? "" : "s"}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Done</Button>
        )
      }
    >
      {/* STEP 1 — choose a file */}
      {step === "upload" && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              readFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-slate-400 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
          >
            {parsing ? (
              <Icon name="loader-circle" size={36} className="animate-spin" />
            ) : (
              <Icon name="file-spreadsheet" size={36} />
            )}
            <p className="mt-3 text-sm font-medium text-slate-600">
              {parsing ? "Reading your file…" : "Choose an Excel or CSV file"}
            </p>
            <p className="mt-1 text-xs text-slate-400">.xlsx, .xls or .csv · first row must be column headers</p>
          </button>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div className="text-xs text-slate-500">
              <p className="font-medium text-slate-700">Not sure about the format?</p>
              <p>Download a ready-made template with the expected columns.</p>
            </div>
            <Button size="sm" variant="secondary" icon="download" onClick={downloadTemplate}>Template</Button>
          </div>
        </div>
      )}

      {/* STEP 2 — map columns + preview */}
      {step === "map" && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Icon name="file-spreadsheet" size={14} className="text-slate-400" />
            <span className="font-medium text-slate-700">{fileName}</span>
            <span>· {rawRows.length} data row{rawRows.length === 1 ? "" : "s"}</span>
          </div>

          {/* Column mapping */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Match columns</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">
                    {f.label}
                    {f.required && <span className="ml-1 text-rose-500">*</span>}
                  </span>
                  <select
                    className="h-8 max-w-[55%] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => {
                        const next = { ...m };
                        if (e.target.value === "") delete next[f.key];
                        else next[f.key] = Number(e.target.value);
                        return next;
                      })
                    }
                  >
                    <option value="">— Not imported —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {mapping.plotNo == null && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                <Icon name="triangle-alert" size={13} /> Map the <b>Plot number</b> column to continue.
              </p>
            )}
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700"><Icon name="plus" size={12} /> {counts.new} new</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700"><Icon name="refresh-cw" size={12} /> {counts.update} update</span>
            {counts.error > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700"><Icon name="x" size={12} /> {counts.error} skipped</span>}
            {counts.warn > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700"><Icon name="triangle-alert" size={12} /> {counts.warn} warning</span>}
          </div>

          {/* Preview */}
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Row</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Plot</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Owner</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 100).map((p) => (
                  <tr key={p._row} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-400">{p._row}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{p.plotNo || <span className="italic text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-600">{p.name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2 text-slate-500">{p.phone || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {stateBadge(p)}
                        {p.issue && <span className="text-xs text-slate-400">{p.issue}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 100 && (
              <p className="border-t border-slate-100 px-3 py-2 text-center text-xs text-slate-400">
                Showing first 100 of {parsed.length} rows · all valid rows will be imported
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={applyDues} onChange={(e) => setApplyDues(e.target.checked)} />
            Apply maintenance dues to imported plots (size × ₹30/sqyd), except those marked paid
          </label>
        </div>
      )}

      {/* STEP 3 — result */}
      {step === "result" && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
              <p className="text-xs text-emerald-600">Created</p>
            </div>
            <div className="rounded-xl bg-sky-50 p-4">
              <p className="text-2xl font-bold text-sky-700">{result.updated}</p>
              <p className="text-xs text-sky-600">Updated</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="text-2xl font-bold text-slate-600">{result.skipped}</p>
              <p className="text-xs text-slate-500">Skipped</p>
            </div>
          </div>

          {result.errors?.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Skipped rows</p>
              <div className="max-h-48 space-y-1 overflow-auto rounded-xl border border-slate-200 p-2">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm">
                    <Icon name="circle-alert" size={15} className="mt-0.5 shrink-0 text-rose-500" />
                    <span className="text-slate-600">
                      Row {e.row}{e.plotNo ? ` (${e.plotNo})` : ""}: <span className="text-slate-500">{e.message}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon="circle-check-big" title="All rows imported cleanly" subtitle="The registry is up to date." />
          )}
        </div>
      )}
    </Modal>
  );
}
