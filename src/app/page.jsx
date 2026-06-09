"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else router.replace(user.role === "admin" ? "/admin" : "/member");
  }, [ready, user, router]);

  return (
    <div className="grid min-h-screen place-items-center text-slate-400">
      <Icon name="loader" className="animate-spin" size={28} />
    </div>
  );
}
