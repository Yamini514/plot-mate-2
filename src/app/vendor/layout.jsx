import { AppShell } from "@/components/AppShell";
import { vendorNav } from "@/lib/nav";

export default function VendorLayout({ children }) {
  return (
    <AppShell nav={vendorNav} role="vendor">
      {children}
    </AppShell>
  );
}
