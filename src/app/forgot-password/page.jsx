"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { key: "email", label: "Email", icon: "mail" },
  { key: "verify", label: "Verify", icon: "shield-check" },
  { key: "reset", label: "New password", icon: "lock" },
];

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState("email"); // email | verify | reset | done
  const [channel, setChannel] = useState("email"); // delivery channel for the code
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const stepIndex = Math.min(
    STEPS.findIndex((s) => s.key === step),
    STEPS.length - 1,
  );

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // --- step handlers -------------------------------------------------------
  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setNotice("");
    const em = email.trim().toLowerCase();
    if (!em) return setError("Please enter your email address.");
    if (!EMAIL_RE.test(em))
      return setError("That doesn’t look like a valid email address.");

    setLoading(true);
    try {
      await api.forgotPassword(em, channel);
      setEmail(em);
      setStep("verify");
      setOtp("");
      setCooldown(RESEND_SECONDS);
      setNotice(
        channel === "whatsapp"
          ? "We’ve sent a 6-digit code to the WhatsApp number on your account."
          : `We’ve sent a 6-digit code to ${em}.`,
      );
    } catch (err) {
      setError(err.message || "We couldn’t send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || loading) return;
    await sendCode();
  };

  const verify = async (e) => {
    e?.preventDefault();
    setError("");
    if (otp.length !== OTP_LENGTH)
      return setError(`Please enter the ${OTP_LENGTH}-digit code.`);

    setLoading(true);
    try {
      const tk = await api.verifyOtp(email, otp);
      setToken(tk || "");
      setStep("reset");
      setNotice("");
    } catch (err) {
      setError(err.message || "That code is invalid or has expired.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e?.preventDefault();
    setError("");
    if (password.length < 8)
      return setError("Use at least 8 characters for your new password.");
    if (password !== confirm) return setError("The two passwords don’t match.");

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setStep("done");
    } catch (err) {
      setError(err.message || "We couldn’t reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #34d399 0, transparent 40%), radial-gradient(circle at 80% 70%, #0ea5e9 0, transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Icon name="map-pinned" size={24} />
          </span>
          <div>
            <p className="text-lg font-bold">Plotmate</p>
            <p className="text-xs text-brand-100">Community Management</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon name="key-round" size={24} />
          </span>
          <h1 className="mt-6 text-3xl font-semibold leading-tight">
            Reset your password securely.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            We’ll email a one-time verification code to the address on your
            account. Enter it here to choose a new password — no waiting on
            anyone else.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-brand-50">
            {[
              "Works for plot owners and security staff",
              "6-digit code, valid for 10 minutes",
              "Your code never leaves this device",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <Icon name="check" size={16} className="text-brand-200" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">
          PlotMate · Plot-owners&rsquo; association management
        </p>
      </div>

      {/* Right form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="map-pinned" size={24} />
            </span>
            <div>
              <p className="text-lg font-bold text-slate-800">PlotMate</p>
              <p className="text-xs text-slate-400">Association management</p>
            </div>
          </div>

          {/* Stepper */}
          {step !== "done" && (
            <ol className="mb-8 flex items-center">
              {STEPS.map((s, i) => {
                const state =
                  i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
                return (
                  <li key={s.key} className="flex flex-1 items-center last:flex-none">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold transition-colors",
                          state === "done" &&
                            "border-brand-600 bg-brand-600 text-white",
                          state === "active" &&
                            "border-brand-600 bg-brand-50 text-brand-700",
                          state === "todo" &&
                            "border-slate-200 bg-white text-slate-400",
                        )}
                      >
                        {state === "done" ? (
                          <Icon name="check" size={15} />
                        ) : (
                          <Icon name={s.icon} size={15} />
                        )}
                      </span>
                      <span
                        className={cn(
                          "hidden text-xs font-medium sm:block",
                          state === "todo" ? "text-slate-400" : "text-slate-700",
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span
                        className={cn(
                          "mx-2 h-px flex-1",
                          i < stepIndex ? "bg-brand-500" : "bg-slate-200",
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {/* --- Step: email --- */}
          {step === "email" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Forgot your password?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the email registered to your account and we’ll send you a
                verification code.
              </p>
              <form onSubmit={sendCode} className="mt-8 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">
                    Email address
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                    <Icon name="mail" size={16} className="text-slate-400" />
                    <input
                      type="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@greenaeroview.in"
                      className="h-11 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </label>

                {/* Delivery channel — email the code, or send it to the WhatsApp
                    number registered on the account. */}
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">
                    Send the code via
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "email", label: "Email", icon: "mail" },
                      { id: "whatsapp", label: "WhatsApp", icon: "message-circle" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setChannel(c.id);
                          setError("");
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                          channel === c.id
                            ? "border-brand-400 bg-brand-50 text-brand-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <Icon name={c.icon} size={16} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {channel === "whatsapp" && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      We’ll message the phone number registered on your account.
                    </p>
                  )}
                </div>

                <Banner error={error} notice={notice} />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Icon name="loader" className="animate-spin" size={18} />
                  ) : (
                    <>
                      Send code <Icon name="arrow-right" size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* --- Step: verify --- */}
          {step === "verify" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Enter verification code
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                We sent a {OTP_LENGTH}-digit code to{" "}
                <span className="font-medium text-slate-700">
                  {channel === "whatsapp" ? "your registered WhatsApp number" : email}
                </span>
                .{" "}
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setNotice("");
                  }}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Change
                </button>
              </p>
              <form onSubmit={verify} className="mt-8 space-y-5">
                <OtpInput
                  value={otp}
                  onChange={(v) => {
                    setOtp(v);
                    setError("");
                  }}
                  onComplete={() => {}}
                  disabled={loading}
                />

                <Banner error={error} notice={notice} />

                <button
                  type="submit"
                  disabled={loading || otp.length !== OTP_LENGTH}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Icon name="loader" className="animate-spin" size={18} />
                  ) : (
                    <>
                      Verify code <Icon name="arrow-right" size={16} />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-slate-500">
                  Didn’t get it?{" "}
                  <button
                    type="button"
                    onClick={resend}
                    disabled={cooldown > 0 || loading}
                    className="font-medium text-brand-700 enabled:hover:underline disabled:text-slate-400"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </p>
              </form>
            </>
          )}

          {/* --- Step: reset --- */}
          {step === "reset" && (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Choose a new password
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pick a strong password you don’t use anywhere else.
              </p>
              <form onSubmit={reset} className="mt-8 space-y-4">
                <PasswordField
                  label="New password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    setError("");
                  }}
                  show={show}
                  onToggle={() => setShow((s) => !s)}
                  autoFocus
                />
                {password.length > 0 && <Strength value={password} />}
                <PasswordField
                  label="Confirm new password"
                  value={confirm}
                  onChange={(v) => {
                    setConfirm(v);
                    setError("");
                  }}
                  show={show}
                  onToggle={() => setShow((s) => !s)}
                />

                <Banner error={error} notice={notice} />

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Icon name="loader" className="animate-spin" size={18} />
                  ) : (
                    <>
                      Reset password <Icon name="check" size={16} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* --- Step: done --- */}
          {step === "done" && (
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon name="circle-check-big" size={30} />
              </span>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
                Password reset
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your password has been updated. You can now sign in with your
                new password.
              </p>
              <button
                type="button"
                onClick={() => router.replace("/login")}
                className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Back to sign in <Icon name="arrow-right" size={16} />
              </button>
            </div>
          )}

          {step !== "done" && (
            <p className="mt-8 text-center text-sm text-slate-500">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-brand-700"
              >
                <Icon name="arrow-left" size={15} />
                Back to sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */

function Banner({ error, notice }) {
  if (error)
    return (
      <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
        <Icon name="triangle-alert" size={15} />
        {error}
      </div>
    );
  if (notice)
    return (
      <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
        <Icon name="info" size={15} />
        {notice}
      </div>
    );
  return null;
}

function PasswordField({ label, value, onChange, show, onToggle, autoFocus }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
        <Icon name="lock" size={16} className="text-slate-400" />
        <input
          type={show ? "text" : "password"}
          required
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="h-11 w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-600"
        >
          <Icon name={show ? "eye-off" : "eye"} size={16} />
        </button>
      </div>
    </label>
  );
}

function Strength({ value }) {
  const score = useMemo(() => {
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  }, [value]);

  const meta = [
    { label: "Weak", color: "bg-rose-400", text: "text-rose-500" },
    { label: "Weak", color: "bg-rose-400", text: "text-rose-500" },
    { label: "Fair", color: "bg-amber-400", text: "text-amber-500" },
    { label: "Good", color: "bg-sky-400", text: "text-sky-500" },
    { label: "Strong", color: "bg-brand-500", text: "text-brand-600" },
  ][score];

  return (
    <div className="-mt-1 flex items-center gap-2">
      <div className="flex h-1.5 flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-full flex-1 rounded-full",
              i < score ? meta.color : "bg-slate-200",
            )}
          />
        ))}
      </div>
      <span className={cn("w-12 text-right text-[11px] font-medium", meta.text)}>
        {meta.label}
      </span>
    </div>
  );
}

function OtpInput({ value, onChange, onComplete, disabled }) {
  const refs = useRef([]);
  const digits = Array.from(
    { length: OTP_LENGTH },
    (_, i) => value[i] ?? "",
  );

  const setAt = (i, digit) => {
    const next = digits.slice();
    next[i] = digit;
    const joined = next.join("").slice(0, OTP_LENGTH);
    onChange(joined);
    if (joined.length === OTP_LENGTH) onComplete?.(joined);
  };

  const handleChange = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return setAt(i, "");
    // Typing into a box: take the last char; advance focus.
    setAt(i, raw[raw.length - 1]);
    if (i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1)
      refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    const focusIdx = Math.min(text.length, OTP_LENGTH - 1);
    refs.current[focusIdx]?.focus();
    if (text.length === OTP_LENGTH) onComplete?.(text);
  };

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          autoFocus={i === 0}
          disabled={disabled}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-14 w-full rounded-lg border border-slate-200 bg-white text-center text-xl font-semibold text-slate-800 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
        />
      ))}
    </div>
  );
}
