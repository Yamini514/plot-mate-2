import { AppShell } from "@/components/AppShell";
import { guardNav } from "@/lib/nav";

export default function GuardLayout({ children }) {
  return (
    <AppShell nav={guardNav} role="guard">
      {children}
    </AppShell>
  );
}
