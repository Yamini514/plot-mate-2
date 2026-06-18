"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

const COLORS = { dark: "#0f172a", light: "#ffffff" };

/** Renders a real, scannable QR code onto a canvas. */
export function QrCanvas({ value, size = 160, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el && value) {
      QRCode.toCanvas(el, value, { width: size, margin: 1, color: COLORS }).catch(() => {});
    }
  }, [value, size]);
  return <canvas ref={ref} className={className} aria-label="QR code" />;
}

/** Generates the QR as a PNG File (for the Web Share API / downloads). */
export async function qrPngFile(value, filename = "qr.png", size = 640) {
  const dataUrl = await QRCode.toDataURL(value, { width: size, margin: 2, color: COLORS });
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], filename, { type: "image/png" });
}
