"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/utils";

// Online card payment via Stripe — fully gated on NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
// so it never renders a broken button when Stripe isn't configured. The charge is
// authoritative server-side: the backend creates a PaymentIntent and the Stripe
// webhook (StripeBilling#webhook) is the source of truth that records the payment
// + receipt. Here we only collect the card and confirm the intent.
//
// Stripe.js is loaded lazily from the official CDN the first time the panel opens,
// so it adds nothing to the bundle and costs nothing until used.

let stripeJsPromise = null;
function loadStripeJs() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (!stripeJsPromise) {
    stripeJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://js.stripe.com/v3/";
      s.async = true;
      s.onload = () => resolve(window.Stripe);
      s.onerror = () => reject(new Error("Could not load the payment library"));
      document.head.appendChild(s);
    });
  }
  return stripeJsPromise;
}

export function StripeCardButton({ invoice, onPaid }) {
  const toast = useToast();
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | loading | ready | paying
  const elementsRef = useRef(null);
  const stripeRef = useRef(null);
  const mountRef = useRef(null);

  // Spin up Stripe Elements once the inline card panel is opened.
  useEffect(() => {
    if (!open || phase !== "idle") return;
    let cancelled = false;
    (async () => {
      setPhase("loading");
      try {
        const StripeCtor = await loadStripeJs();
        const { data } = await api.post("/member/billing/stripe-intent", {
          invoiceId: invoice.dbId,
        });
        if (cancelled) return;
        const stripe = StripeCtor(pk);
        const elements = stripe.elements({ clientSecret: data.clientSecret });
        const paymentElement = elements.create("payment");
        paymentElement.mount(mountRef.current);
        stripeRef.current = stripe;
        elementsRef.current = elements;
        setPhase("ready");
      } catch (e) {
        if (!cancelled) {
          toast(e.message || "Could not start card payment", "error");
          setOpen(false);
          setPhase("idle");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, phase, invoice.dbId, pk, toast]);

  const confirm = async () => {
    if (!stripeRef.current || !elementsRef.current) return;
    setPhase("paying");
    try {
      const { error, paymentIntent } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        redirect: "if_required",
      });
      if (error) throw new Error(error.message);
      if (paymentIntent?.status === "succeeded") {
        // Treasury + receipt are posted by the webhook; just reflect it here.
        toast(`Paid ${formatINR(invoice.balance)} by card`);
        setOpen(false);
        setPhase("idle");
        onPaid?.();
      } else {
        toast("Payment is processing — we'll confirm shortly", "info");
        setOpen(false);
        setPhase("idle");
      }
    } catch (e) {
      toast(e.message || "Card payment failed", "error");
      setPhase("ready");
    }
  };

  if (!pk) return null; // Stripe not configured — render nothing.

  if (!open) {
    return (
      <Button variant="secondary" icon="credit-card" className="w-full" onClick={() => setOpen(true)}>
        Pay online by card
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
        <Icon name="credit-card" size={16} /> Card payment
      </div>
      {phase === "loading" && (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
          <Icon name="loader-circle" size={16} className="animate-spin" /> Loading secure form…
        </div>
      )}
      <div ref={mountRef} className={phase === "ready" || phase === "paying" ? "" : "hidden"} />
      {(phase === "ready" || phase === "paying") && (
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => { setOpen(false); setPhase("idle"); }}>
            Cancel
          </Button>
          <Button icon="shield-check" className="flex-1" loading={phase === "paying"} onClick={confirm}>
            Pay {formatINR(invoice.balance)}
          </Button>
        </div>
      )}
    </div>
  );
}
