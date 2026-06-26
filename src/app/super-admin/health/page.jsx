"use client";

import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useApi } from "@/lib/useApi";
import { formatDate } from "@/lib/utils";

// Map every status string the backend can emit onto a tone + label.
const STATUS = {
  healthy: ["green", "Healthy"], operational: ["green", "Operational"],
  configured: ["green", "Configured"], ok: ["green", "OK"],
  attention: ["amber", "Needs attention"], degraded: ["amber", "Degraded"],
  down: ["rose", "Down"], not_configured: ["slate", "Not configured"],
  unknown: ["slate", "Unknown"],
};

function tone(status) { return (STATUS[status] || ["slate", status])[0]; }
function label(status) { return (STATUS[status] || ["slate", status])[1]; }

function HealthCard({ icon, title, status, rows }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <Icon name={icon} size={17} />
          </span>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
        <Badge tone={tone(status)}>{label(status)}</Badge>
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        {rows.filter((r) => r[1] != null && r[1] !== "").map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-slate-400">{k}</dt>
            <dd className="text-right font-medium text-slate-700">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default function SystemHealthPage() {
  const { data, loading, reload } = useApi("/super/health");
  const db = data?.database ?? {};
  const apiSvc = data?.api ?? {};
  const email = data?.email ?? {};
  const storage = data?.storage ?? {};
  const jobs = data?.jobs ?? {};

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="System health"
        subtitle={data?.checkedAt ? `Last checked ${formatDate(data.checkedAt)} · ${new Date(data.checkedAt).toLocaleTimeString()}` : "Platform service status"}
        actions={<Button variant="secondary" icon="refresh-cw" loading={loading} onClick={reload}>Refresh</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HealthCard
          icon="database" title="Database" status={db.status}
          rows={[
            ["Latency", db.latencyMs != null ? `${db.latencyMs} ms` : null],
            ["Connections", db.connections != null ? `${db.connections}${db.maxConnections ? ` / ${db.maxConnections}` : ""}` : null],
            ["Error", db.error],
          ]}
        />
        <HealthCard
          icon="zap" title="API services" status={apiSvc.status}
          rows={[
            ["Response time", apiSvc.responseTimeMs != null ? `${apiSvc.responseTimeMs} ms` : null],
            ["Error", apiSvc.error],
          ]}
        />
        <HealthCard
          icon="mail" title="Email service" status={email.status}
          rows={[
            ["From address", email.fromEmail || "—"],
            ["SMTP host", email.smtpHost || "—"],
          ]}
        />
        <HealthCard
          icon="hard-drive" title="Storage" status={storage.status}
          rows={[
            ["Provider", storage.provider],
            ["Bucket", storage.bucket],
            ["Region", storage.region],
          ]}
        />
        <HealthCard
          icon="cpu" title="Background jobs" status={jobs.status}
          rows={[
            ["Scheduled", jobs.scheduled],
            ["Sent", jobs.sent],
            ["Overdue", jobs.overdue],
            ["Error", jobs.error],
          ]}
        />
      </div>

      {!data && loading && (
        <p className="mt-6 text-center text-sm text-slate-400">
          <Icon name="loader-circle" size={16} className="mr-1.5 inline animate-spin" />Checking services…
        </p>
      )}
    </div>
  );
}
