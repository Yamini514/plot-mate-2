"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The plot grid was merged into the unified Plot Map workspace (Map / Grid
// toggle). This route now just forwards old links/bookmarks there.
export default function PlotsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/plot-map");
  }, [router]);
  return null;
}
