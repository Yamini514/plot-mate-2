"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  CardHeader,
  Button,
  Badge,
  Segmented,
  Modal,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";

// Available report definitions. Row counts are filled from live data in-component.
const reports = [
  { id: "RPT-1", name: "Daily Visitor Report", desc: "Every visitor entry, approval and check-out for the selected day.", icon: "users-round", range: "Today", tone: "brand" },
  { id: "RPT-2", name: "Delivery Report", desc: "Courier packages received, held and handed over to residents.", icon: "package", range: "Today", tone: "sky" },
  { id: "RPT-3", name: "Incident Report", desc: "Security incidents logged with severity, location and resolution status.", icon: "shield-alert", range: "Last 7 days", tone: "amber" },
  { id: "RPT-4", name: "Guard Activity Report", desc: "Shift attendance, patrol logs and gate actions per guard.", icon: "clipboard-check", range: "This month", tone: "violet" },
  { id: "RPT-5", name: "Vehicle Log", desc: "Vehicles logged in and out at the gate with parking.", icon: "car", range: "Today", tone: "sky" },
  { id: "RPT-6", name: "Rejected Entries", desc: "Visitors and entries that were rejected at the gate.", icon: "ban", range: "Last 7 days", tone: "amber" },
];

const toneMap = {
  brand: "bg-brand-50 text-brand-600",
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

// Column definitions per report (rows are filled from live data in-component).
const COLUMNS = {
  "RPT-1": [
    { key: "id", label: "ID" }, { key: "name", label: "Visitor" }, { key: "phone", label: "Phone" },
    { key: "resident", label: "Resident" }, { key: "flat", label: "Flat" },
    { key: "purpose", label: "Purpose" }, { key: "checkIn", label: "Check-in" }, { key: "status", label: "Status" },
  ],
  "RPT-2": [
    { key: "id", label: "Package ID" }, { key: "courier", label: "Courier" }, { key: "agent", label: "Agent" },
    { key: "resident", label: "Resident" }, { key: "flat", label: "Flat" },
    { key: "received", label: "Received" }, { key: "delivered", label: "Delivered" }, { key: "status", label: "Status" },
  ],
  "RPT-3": [
    { key: "id", label: "ID" }, { key: "type", label: "Type" }, { key: "location", label: "Location" },
    { key: "severity", label: "Severity" }, { key: "reportedBy", label: "Reported by" },
    { key: "time", label: "Time" }, { key: "status", label: "Status" },
  ],
  "RPT-4": [
    { key: "shift", label: "Shift" }, { key: "time", label: "Timing" },
    { key: "guard", label: "Guard" }, { key: "gate", label: "Gate" },
  ],
  "RPT-5": [
    { key: "id", label: "ID" }, { key: "vehicleNo", label: "Vehicle" }, { key: "type", label: "Type" },
    { key: "forWhom", label: "For" }, { key: "parking", label: "Parking" },
    { key: "entry", label: "Entry" }, { key: "exit", label: "Exit" }, { key: "status", label: "Status" },
  ],
  "RPT-6": [
    { key: "id", label: "ID" }, { key: "name", label: "Visitor" }, { key: "resident", label: "Resident" },
    { key: "flat", label: "Flat" }, { key: "time", label: "When" },
  ],
};

const cell = (v) => String(v ?? "").replace(/_/g, " ");

function downloadCSV(report, ds) {
  const header = ds.columns.map((c) => `"${c.label}"`).join(",");
  const body = ds.rows
    .map((r) => ds.columns.map((c) => `"${cell(r[c.key]).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.name.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printPDF(report, ds) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  const ths = ds.columns.map((c) => `<th>${c.label}</th>`).join("");
  const trs = ds.rows
    .map((r) => `<tr>${ds.columns.map((c) => `<td>${cell(r[c.key])}</td>`).join("")}</tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${report.name}</title>
    <style>
      *{font-family:system-ui,Segoe UI,sans-serif;}
      body{margin:32px;color:#0f172a;}
      .brand{color:#059669;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;}
      h1{font-size:22px;margin:6px 0 2px;}
      .meta{color:#64748b;font-size:13px;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{text-align:left;background:#f1f5f9;color:#475569;padding:8px 10px;border-bottom:1px solid #e2e8f0;text-transform:uppercase;font-size:10px;letter-spacing:.04em;}
      td{padding:8px 10px;border-bottom:1px solid #f1f5f9;text-transform:capitalize;}
      tr:nth-child(even) td{background:#f8fafc;}
      .foot{margin-top:24px;color:#94a3b8;font-size:11px;}
    </style></head><body>
    <p class="brand">Green Aero View · Security</p>
    <h1>${report.name}</h1>
    <p class="meta">${report.range} &middot; ${ds.rows.length} records &middot; Generated by PlotMate</p>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <p class="foot">This is a system-generated report. PlotMate — Green Aero View Welfare Association.</p>
    <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
    </body></html>`);
  w.document.close();
  return true;
}

export default function Reports() {
  const toast = useToast();
  const { data: rv } = useApi("/guard/visitors", { page_size: 300 });
  const { data: rd } = useApi("/guard/deliveries", { page_size: 300 });
  const { data: ri } = useApi("/guard/incidents", { page_size: 300 });
  const { data: rveh } = useApi("/guard/vehicles", { page_size: 300, status: "all" });

  const visitors = normalizeList(rv);
  // Live rows mapped to each report's column keys.
  const DATASETS = {
    "RPT-1": { columns: COLUMNS["RPT-1"], rows: visitors.map((v) => ({ id: v.code, name: v.name, phone: v.phone, resident: v.residentName, flat: v.plotNo, purpose: v.purpose, checkIn: v.checkIn, status: v.status })) },
    "RPT-2": { columns: COLUMNS["RPT-2"], rows: normalizeList(rd).map((d) => ({ id: d.code, courier: d.courier, agent: d.agent, resident: d.residentName, flat: d.plotNo, received: d.receivedAt, delivered: d.deliveredAt, status: d.status })) },
    "RPT-3": { columns: COLUMNS["RPT-3"], rows: normalizeList(ri).map((i) => ({ id: i.code, type: i.type, location: i.location, severity: i.severity, reportedBy: i.reportedBy, time: i.occurredAt, status: i.status })) },
    "RPT-4": { columns: COLUMNS["RPT-4"], rows: [] },
    "RPT-5": { columns: COLUMNS["RPT-5"], rows: normalizeList(rveh).map((v) => ({ id: v.code, vehicleNo: v.vehicleNo, type: v.vehicleType, forWhom: v.ownerKind === "owner" ? `Owner ${v.plotNo || ""}` : "Visitor", parking: v.parkingSlot, entry: v.entryAt, exit: v.exitAt, status: v.status })) },
    "RPT-6": { columns: COLUMNS["RPT-6"], rows: visitors.filter((v) => v.status === "rejected").map((v) => ({ id: v.code, name: v.name, resident: v.residentName, flat: v.plotNo, time: v.checkIn || v.createdAt })) },
  };

  const [range, setRange] = useState("today");
  const [preview, setPreview] = useState(null); // { report, ds }

  const openPreview = (r) => setPreview({ report: r, ds: DATASETS[r.id] });

  const handlePDF = (r) => {
    const ok = printPDF(r, DATASETS[r.id]);
    toast(ok ? `${r.name} ready — use the print dialog to save as PDF` : "Allow pop-ups to export the PDF", ok ? "success" : "error");
  };

  const handleCSV = (r) => {
    downloadCSV(r, DATASETS[r.id]);
    toast(`${r.name} downloaded (CSV)`);
  };

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/guard" }, { label: "System" }, { label: "Reports" }]} />
      <PageHeader
        title="Reports"
        subtitle="Generate and download security reports"
        actions={<Segmented options={RANGES} value={range} onChange={setRange} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.id} className="flex flex-col p-5">
            <div className="flex items-start gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${toneMap[r.tone]}`}>
                <Icon name={r.icon} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-800">{r.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{r.desc}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="slate"><Icon name="calendar" size={12} /> {r.range}</Badge>
                  <Badge tone="brand"><Icon name="database" size={12} /> {DATASETS[r.id].rows.length} records</Badge>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
              <Button variant="secondary" size="sm" icon="eye" onClick={() => openPreview(r)}>
                Preview
              </Button>
              <Button size="sm" icon="download" onClick={() => handlePDF(r)}>
                PDF
              </Button>
              <Button size="sm" variant="secondary" icon="sheet" onClick={() => handleCSV(r)}>
                CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Scheduled reports */}
      <Card className="mt-6">
        <CardHeader title="Scheduled reports" subtitle="Automatically emailed to the supervisor" icon="clock" />
        <div className="divide-y divide-slate-100">
          {[
            { name: "Daily Visitor Report", when: "Every day · 11:00 PM", to: "supervisor@safeguard.in" },
            { name: "Weekly Incident Summary", when: "Every Monday · 08:00 AM", to: "admin@greenaeroview.in" },
          ].map((s) => (
            <div key={s.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <Icon name="mail" size={16} />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.when} → {s.to}</p>
                </div>
              </div>
              <Badge tone="green">Active</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Preview modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `Preview · ${preview.report.name}` : ""}
        wide
        footer={
          preview && (
            <>
              <Button variant="secondary" icon="sheet" onClick={() => handleCSV(preview.report)}>CSV</Button>
              <Button icon="download" onClick={() => handlePDF(preview.report)}>Download PDF</Button>
            </>
          )
        }
      >
        {preview && (
          <>
            <p className="mb-3 text-xs text-slate-400">
              {preview.report.range} · showing {Math.min(8, preview.ds.rows.length)} of {preview.ds.rows.length} records
            </p>
            <div className="rounded-xl border border-slate-200">
              <Table>
                <thead>
                  <tr>
                    {preview.ds.columns.map((c) => (
                      <Th key={c.key}>{c.label}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.ds.rows.slice(0, 8).map((row, i) => (
                    <Tr key={i}>
                      {preview.ds.columns.map((c) => (
                        <Td key={c.key} className="capitalize">{cell(row[c.key])}</Td>
                      ))}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
