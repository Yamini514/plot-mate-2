import { AppShell } from "@/components/AppShell";
import { superAdminNav } from "@/lib/nav";

export default function SuperAdminLayout({ children }) {
  return (
    <AppShell nav={superAdminNav} role="super_admin">
      {children}
    </AppShell>
  );
}
