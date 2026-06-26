"use client";

import { useState } from "react";
import {
  PageHeader,
  Breadcrumbs,
  Card,
  Button,
  Badge,
  Field,
  EmptyState,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";

const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

export default function MemberClaimPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [proof, setProof] = useState(null); // { url, name }
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // approval code

  const search = async (e) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.get("/member/plots/search", { q: q.trim() });
      setResults(data || []);
    } catch (err) {
      toast(err.message || "Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const onProof = (file) => {
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      toast("File is larger than 5 MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProof({ url: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/member/plots/claim", {
        plotId: selected.id,
        proofUrl: proof?.url || null,
        proofName: proof?.name || null,
      });
      setDone(data.code);
      setSelected(null);
      setProof(null);
      setResults(null);
      setQ("");
    } catch (err) {
      toast(err.message || "Could not submit claim", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Claim a Plot" />
        <Card className="max-w-lg p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="check-check" size={24} />
          </span>
          <p className="mt-3 text-lg font-semibold text-slate-800">Claim submitted</p>
          <p className="mt-1 text-sm text-slate-500">
            Your claim <span className="font-mono font-medium">{done}</span> has been sent to the
            association for review. You&apos;ll be linked to the plot once it&apos;s approved.
          </p>
          <Button className="mt-5" variant="secondary" onClick={() => setDone(null)}>Claim another plot</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: "PlotMate", href: "/member" }, { label: "Me" }, { label: "Claim a Plot" }]} />
      <PageHeader title="Claim a Plot" subtitle="Find your plot and submit proof of ownership for the association to verify" />

      <Card className="max-w-2xl p-5">
        <form onSubmit={search} className="flex items-end gap-2">
          <Field label="Search by plot number">
            <input className={inputClass} placeholder="e.g. A-12" value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Button icon="search" loading={searching} type="submit">Search</Button>
        </form>

        {results !== null && (
          <div className="mt-4 space-y-2">
            {results.length === 0 && (
              <EmptyState icon="search-x" title="No matching plots" subtitle="Check the plot number and try again." />
            )}
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={
                  "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors " +
                  (selected?.id === p.id ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:bg-slate-50")
                }
              >
                <div>
                  <p className="font-medium text-slate-800">Plot {p.plotNo}</p>
                  <p className="text-xs text-slate-400">{p.ownerName ? `Registered to ${p.ownerName}` : "No owner on record"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.membership === "verified" && <Badge tone="sky">verified</Badge>}
                  {selected?.id === p.id && <Icon name="check" size={16} className="text-brand-600" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Submit proof for Plot {selected.plotNo}</p>
            {selected.membership === "verified" && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <Icon name="triangle-alert" size={13} /> This plot is already verified to an owner. Your claim will still be reviewed.
              </p>
            )}
            <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-5 text-slate-400 hover:border-brand-300 hover:text-brand-500">
              <Icon name="file-up" size={22} />
              <p className="mt-1.5 text-xs">{proof ? proof.name : "Upload proof of ownership (sale deed, agreement…) — max 5 MB"}</p>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onProof(e.target.files?.[0])} />
            </label>
            <div className="flex justify-end">
              <Button icon="send" loading={submitting} onClick={submit}>Submit claim</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
