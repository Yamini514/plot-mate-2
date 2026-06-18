"use client";

import { QrCanvas } from "@/components/Qr";

/**
 * Renders the association's payment QR. If the admin has uploaded a custom QR
 * image (e.g. a bank/merchant QR) it is shown verbatim; otherwise we generate a
 * live, scannable UPI QR from `value`. Use everywhere a payment QR appears so the
 * custom image (when set) overrides the generated one consistently.
 */
export function PaymentQr({ imageUrl, value, size = 132, className }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL / QR, not optimizable by next/image
      <img
        src={imageUrl}
        alt="Payment QR"
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  if (value) return <QrCanvas value={value} size={size} className={className} />;
  return null;
}
