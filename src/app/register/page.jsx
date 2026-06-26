"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";

const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

const MAX_MAP_BYTES = 8 * 1024 * 1024; // 8 MB

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export default function RegisterVenturePage() {
  const [form, setForm] = useState({
    ventureName: "",
    location: "",
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    plotCount: "",
    notes: "",
  });
  const [map, setMap] = useState(null); // { url, name }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // request code

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onMap = (file) => {
    if (!file) return;
    if (file.size > MAX_MAP_BYTES) return setError("Layout file must be under 8 MB.");
    const reader = new FileReader();
    reader.onload = () => setMap({ url: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.ventureName.trim()) return setError("Please enter the venture name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.requesterEmail.trim()))
      return setError("Please enter a valid email address.");
    setLoading(true);
    try {
      const { data } = await api.post("/onboarding-requests", {
        ventureName: form.ventureName.trim(),
        location: form.location.trim(),
        requesterName: form.requesterName.trim(),
        requesterEmail: form.requesterEmail.trim().toLowerCase(),
        requesterPhone: form.requesterPhone.trim() || null,
        plotCount: form.plotCount ? Number(form.plotCount) : null,
        notes: form.notes.trim() || null,
      });
      // Attach the layout/map mid-intake (keyed by the request's human code).
      if (map && data?.code) {
        try {
          await api.post(`/onboarding-requests/${data.code}/documents`, {
            docType: "layout_map",
            name: map.name,
            url: map.url,
          });
        } catch {
          /* non-fatal — the request itself is saved */
        }
      }
      setDone(data?.code || "your request");
    } catch (err) {
      setError(err.message || "Could not submit your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
            <Icon name="map-pinned" size={24} />
          </span>
          <div>
            <p className="text-lg font-bold text-slate-800">PlotMate</p>
            <p className="text-xs text-slate-400">Register your association</p>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="check-check" size={24} />
            </span>
            <h2 className="mt-3 text-xl font-semibold text-slate-800">Request submitted</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Your request <span className="font-mono font-medium">{done}</span> has been received.
              Our team will review it and email you once your workspace is ready.
            </p>
            <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
              Back to sign in <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Register your venture</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tell us about your plot-owners&rsquo; association. After review we&rsquo;ll provision your workspace.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Venture / association name">
                  <input className={inputClass} value={form.ventureName} onChange={set("ventureName")} placeholder="Green Aero View Plot Owners' Welfare Association" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Location">
                  <input className={inputClass} value={form.location} onChange={set("location")} placeholder="Shadnagar, Hyderabad" />
                </Field>
              </div>
              <Field label="Your name">
                <input className={inputClass} value={form.requesterName} onChange={set("requesterName")} placeholder="Ramesh Varma" />
              </Field>
              <Field label="Approx. plots">
                <input type="number" className={inputClass} value={form.plotCount} onChange={set("plotCount")} placeholder="280" />
              </Field>
              <Field label="Email">
                <input type="email" className={inputClass} value={form.requesterEmail} onChange={set("requesterEmail")} placeholder="you@example.in" />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={form.requesterPhone} onChange={set("requesterPhone")} placeholder="9848012345" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes (optional)">
                  <textarea rows={2} className={inputClass + " h-auto py-2"} value={form.notes} onChange={set("notes")} placeholder="Anything we should know" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">Layout / master plan (optional)</span>
                <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-5 text-slate-400 hover:border-brand-300 hover:text-brand-500">
                  <Icon name="map" size={22} />
                  <p className="mt-1.5 text-xs">{map ? map.name : "Upload your sanctioned layout (image/PDF) — max 8 MB"}</p>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onMap(e.target.files?.[0])} />
                </label>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                <Icon name="triangle-alert" size={15} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? <Icon name="loader" className="animate-spin" size={18} /> : <>Submit request <Icon name="arrow-right" size={16} /></>}
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">
              Already have a workspace?{" "}
              <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
