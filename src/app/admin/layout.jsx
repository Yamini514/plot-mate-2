import { AppShell } from "@/components/AppShell";
import { adminNav } from "@/lib/nav";

export default function AdminLayout({ children }) {
  return (
    <AppShell nav={adminNav} role="admin">
      {children}
    </AppShell>
  );
}
