"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Icon } from "@/components/Icon";
import { cn, digitsOnly, formatDate } from "@/lib/utils";

const ID_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ID_DOC_MAX = 8 * 1024 * 1024; // 8 MB

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "pan", label: "PAN card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving licence" },
  { value: "other", label: "Other" },
];

const STEPS = [
  { key: "account", label: "Your account", icon: "user-round", blurb: "Name, contact & a password" },
  { key: "identity", label: "Identity", icon: "id-card", blurb: "ID details & document" },
  { key: "review", label: "Review", icon: "badge-check", blurb: "Confirm & submit" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatBytes(n) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Lightweight password strength heuristic (0–4) for the meter.
function passwordScore(pw) {
  if (!pw) return { score: 0, label: "", bar: 0 };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score: s, label: labels[s], bar: Math.max(1, s) };
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const { token } = useParams();
  const { data: invite, loading, error } = useApi(token ? `/invites/${token}` : null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: "", email: "", phoneNumber: "", password: "", showPw: false,
    idType: "aadhaar", idNumber: "", address: "", idDoc: null,
  });
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // Prefill name/email from the invite once it loads (render-time, no effect).
  const f = {
    ...form,
    fullName: form.fullName || invite?.fullName || "",
    email: form.email || invite?.email || "",
  };
  const set = (k) => (e) => setForm({ ...f, [k]: e.target.value });
  const pw = useMemo(() => passwordScore(f.password), [f.password]);

  const roleLabel = invite?.roleName
    ? { admin: "Committee member", member: "Owner / Member", guard: "Security guard" }[invite.roleName] ||
      invite.roleName.replace(/_/g, " ")
    : "Member";

  const invalid = !loading && (error || !invite || invite.status !== "pending");

  // --- file handling --------------------------------------------------------
  const ingest = (file) => {
    setErr("");
    if (!file) return;
    if (!ID_DOC_TYPES.includes(file.type)) return setErr("Attach a PDF or image (JPG/PNG) of your ID.");
    if (file.size > ID_DOC_MAX) return setErr("That file is too large (max 8 MB).");
    const reader = new FileReader();
    reader.onload = () =>
      setForm((s) => ({ ...s, idDoc: { name: file.name, type: file.type, size: file.size, url: reader.result } }));
    reader.onerror = () => setErr("Could not read that file. Please try again.");
    reader.readAsDataURL(file);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    ingest(e.dataTransfer.files?.[0]);
  };

  // --- step navigation ------------------------------------------------------
  const next = () => {
    setErr("");
    if (step === 0) {
      if (!f.fullName.trim()) return setErr("Please enter your full name.");
      if (!EMAIL_RE.test(f.email.trim())) return setErr("That doesn’t look like a valid email address.");
      if (f.password.length < 8) return setErr("Choose a password of at least 8 characters.");
    }
    if (step === 1) {
      if (!f.idNumber.trim()) return setErr("Please enter your ID number.");
      if (!f.idDoc) return setErr("Please attach a PDF or image of your ID.");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setErr("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    setErr("");
    if (!f.idDoc) return setErr("Please attach a PDF or image of your ID for verification.");
    setSubmitting(true);
    try {
      await api.post(`/invites/${token}/accept`, {
        fullName: f.fullName.trim(),
        email: f.email.trim().toLowerCase(),
        phoneNumber: f.phoneNumber.trim() || null,
        password: f.password,
        kycData: { idType: f.idType, idNumber: f.idNumber.trim(), address: f.address.trim(), idDocument: f.idDoc },
      });
      setDone(true);
    } catch (e2) {
      setErr(e2.message || "Could not complete your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ---------------- Left brand / context panel ---------------- */}
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-brand-700 p-10 text-white lg:flex xl:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 12%, #34d399 0, transparent 42%), radial-gradient(circle at 85% 78%, #0ea5e9 0, transparent 46%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Icon name="map-pinned" size={24} />
          </span>
          <div>
            <p className="text-lg font-bold">PlotMate</p>
            <p className="text-xs text-brand-100">Community onboarding</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-200">You&rsquo;re invited</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight xl:text-4xl">
            {invite?.community ? `Join ${invite.community}` : "Join your community portal"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            Set up your account to pay maintenance dues, raise complaints, book amenities and stay in the loop —
            all in one place.
          </p>

          {/* Invite summary chips */}
          {!invalid && invite && (
            <div className="mt-7 space-y-3">
              <InfoLine icon="user-round" label="Joining as" value={roleLabel} />
              {invite.plotNo && <InfoLine icon="map-pin" label="Plot" value={invite.plotNo} />}
              {invite.invitedByName && <InfoLine icon="user-check" label="Invited by" value={invite.invitedByName} />}
              {invite.expiresAt && <InfoLine icon="clock" label="Link expires" value={formatDate(invite.expiresAt)} />}
            </div>
          )}
        </div>

        {/* Vertical step rail */}
        <div className="relative space-y-4">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "active" : "todo";
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold transition",
                    state === "done" && "border-white/0 bg-white text-brand-700",
                    state === "active" && "border-white bg-white/10 text-white",
                    state === "todo" && "border-white/30 text-brand-200",
                  )}
                >
                  {state === "done" ? <Icon name="check" size={16} /> : i + 1}
                </span>
                <div className={cn("transition", state === "todo" && "opacity-60")}>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-brand-200">{s.blurb}</p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ---------------- Right content panel ---------------- */}
      <main className="flex w-full flex-col items-center justify-center px-4 py-10 sm:px-8 lg:flex-1">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Mobile header */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="map-pinned" size={24} />
            </span>
            <div>
              <p className="text-lg font-bold text-slate-800">PlotMate</p>
              <p className="text-xs text-slate-400">Community onboarding</p>
            </div>
          </div>

          {loading ? (
            <LoadingCard />
          ) : invalid ? (
            <InvalidCard />
          ) : done ? (
            <SuccessCard onGo={() => router.replace("/login")} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {/* Mobile step progress */}
              <div className="mb-6 lg:hidden">
                <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                  <span>Step {step + 1} of {STEPS.length}</span>
                  <span className="text-slate-600">{STEPS[step].label}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                {step === 0 && "Create your account"}
                {step === 1 && "Verify your identity"}
                {step === 2 && "Review & submit"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {step === 0 && "Tell us who you are and set a password."}
                {step === 1 && "Add an ID and upload a document — your admin will verify it."}
                {step === 2 && "Check your details before submitting for verification."}
              </p>

              <div className="mt-6 space-y-4">
                {/* STEP 0 — account */}
                {step === 0 && (
                  <>
                    <TextField label="Full name" icon="user-round" value={f.fullName} onChange={set("fullName")} placeholder="Your name" />
                    <TextField label="Email" icon="mail" type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" />
                    <TextField
                      label="Phone"
                      icon="phone"
                      value={f.phoneNumber}
                      onChange={(e) => setForm({ ...f, phoneNumber: digitsOnly(e.target.value) })}
                      inputMode="numeric"
                      placeholder="Optional"
                    />
                    <div>
                      <FieldLabel>Create password</FieldLabel>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                        <Icon name="lock" size={16} className="text-slate-400" />
                        <input
                          type={f.showPw ? "text" : "password"}
                          value={f.password}
                          onChange={set("password")}
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          className="h-11 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button type="button" tabIndex={-1} onClick={() => setForm({ ...f, showPw: !f.showPw })} className="text-slate-400 hover:text-slate-600">
                          <Icon name={f.showPw ? "eye-off" : "eye"} size={16} />
                        </button>
                      </div>
                      {f.password && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex flex-1 gap-1">
                            {[1, 2, 3, 4].map((n) => (
                              <span
                                key={n}
                                className={cn(
                                  "h-1.5 flex-1 rounded-full transition-colors",
                                  n <= pw.bar
                                    ? pw.score <= 1 ? "bg-rose-400" : pw.score === 2 ? "bg-amber-400" : pw.score === 3 ? "bg-brand-400" : "bg-brand-600"
                                    : "bg-slate-100",
                                )}
                              />
                            ))}
                          </div>
                          <span className={cn("text-xs font-medium", pw.score <= 1 ? "text-rose-500" : pw.score === 2 ? "text-amber-600" : "text-brand-600")}>
                            {pw.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* STEP 1 — identity */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>ID type</FieldLabel>
                        <select
                          className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          value={f.idType}
                          onChange={set("idType")}
                        >
                          {ID_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <TextField label="ID number" value={f.idNumber} onChange={set("idNumber")} placeholder="e.g. XXXX-XXXX" />
                    </div>
                    <TextField label="Address" icon="home" value={f.address} onChange={set("address")} placeholder="Your address" />

                    <div>
                      <FieldLabel>
                        ID document <span className="font-normal text-slate-400">— PDF or image, max 8 MB</span>
                      </FieldLabel>
                      {!f.idDoc ? (
                        <label
                          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={onDrop}
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition",
                            dragging ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40",
                          )}
                        >
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-brand-600">
                            <Icon name="cloud-upload" size={20} />
                          </span>
                          <span className="text-sm font-medium text-slate-700">
                            Drag &amp; drop, or <span className="text-brand-700 underline">browse</span>
                          </span>
                          <span className="text-xs text-slate-400">Aadhaar / PAN / passport — front page</span>
                          <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => ingest(e.target.files?.[0])} />
                        </label>
                      ) : (
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          {f.idDoc.type?.startsWith("image/") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.idDoc.url} alt="ID preview" className="h-12 w-12 rounded-lg object-cover" />
                          ) : (
                            <span className="grid h-12 w-12 place-items-center rounded-lg bg-rose-50 text-rose-500">
                              <Icon name="file-text" size={22} />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{f.idDoc.name}</p>
                            <p className="text-xs text-slate-400">{formatBytes(f.idDoc.size)}</p>
                          </div>
                          <a href={f.idDoc.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Preview">
                            <Icon name="eye" size={16} />
                          </a>
                          <button type="button" onClick={() => setForm({ ...f, idDoc: null })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Remove">
                            <Icon name="trash-2" size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* STEP 2 — review */}
                {step === 2 && (
                  <div className="space-y-3">
                    <ReviewBlock title="Account" onEdit={() => setStep(0)}>
                      <ReviewRow label="Name" value={f.fullName} />
                      <ReviewRow label="Email" value={f.email} />
                      <ReviewRow label="Phone" value={f.phoneNumber || "—"} />
                    </ReviewBlock>
                    <ReviewBlock title="Identity" onEdit={() => setStep(1)}>
                      <ReviewRow label="ID type" value={ID_TYPES.find((t) => t.value === f.idType)?.label} />
                      <ReviewRow label="ID number" value={f.idNumber} />
                      <ReviewRow label="Address" value={f.address || "—"} />
                      <ReviewRow label="Document" value={f.idDoc?.name || "—"} />
                    </ReviewBlock>
                    <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
                      <Icon name="shield-check" size={15} className="mt-0.5 shrink-0" />
                      Your account is created immediately, then activated once your association admin verifies your ID.
                    </div>
                  </div>
                )}

                {err && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                    <Icon name="triangle-alert" size={15} /> {err}
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex items-center gap-3 pt-1">
                  {step > 0 && (
                    <button type="button" onClick={back} className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
                      <Icon name="arrow-left" size={16} /> Back
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button type="button" onClick={next} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
                      Continue <Icon name="arrow-right" size={16} />
                    </button>
                  ) : (
                    <button type="button" onClick={submit} disabled={submitting} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60">
                      {submitting ? <Icon name="loader-circle" className="animate-spin" size={18} /> : <>Submit for verification <Icon name="check" size={16} /></>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-700 hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ---------------- small presentational helpers ---------------- */

function InfoLine({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur">
      <Icon name={icon} size={16} className="text-brand-100" />
      <span className="text-xs text-brand-200">{label}</span>
      <span className="ml-auto text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function FieldLabel({ children }) {
  return <span className="mb-1.5 block text-xs font-medium text-slate-600">{children}</span>;
}

function TextField({ label, icon, value, onChange, type = "text", placeholder, inputMode }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
        {icon && <Icon name={icon} size={16} className="text-slate-400" />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputMode={inputMode}
          className="h-11 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
      </div>
    </label>
  );
}

function ReviewBlock({ title, onEdit, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs font-medium text-brand-700 hover:underline">Edit</button>
      </div>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{value || "—"}</dd>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3 text-slate-400">
        <Icon name="loader-circle" size={20} className="animate-spin" /> Loading your invite…
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function InvalidCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
        <Icon name="link-2-off" size={26} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Invite unavailable</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        This invite link is invalid, already used, or has expired. Please ask your association admin for a fresh link.
      </p>
      <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
        <Icon name="arrow-left" size={15} /> Back to sign in
      </Link>
    </div>
  );
}

function SuccessCard({ onGo }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name="circle-check-big" size={28} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Profile submitted</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Your account has been created and is pending verification by your association admin. You&rsquo;ll be able to sign
        in once it&rsquo;s approved.
      </p>
      <button onClick={onGo} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
        Go to sign in <Icon name="arrow-right" size={16} />
      </button>
    </div>
  );
}
