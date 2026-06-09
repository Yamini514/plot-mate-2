import { AppShell } from "@/components/AppShell";
import { memberNav } from "@/lib/nav";

export default function MemberLayout({ children }) {
  return (
    <AppShell nav={memberNav} role="member">
      {children}
    </AppShell>
  );
}
