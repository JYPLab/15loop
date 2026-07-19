"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AnalyticsPageView({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!measurementId || typeof window.gtag !== "function") return;
    window.gtag("config", measurementId, {
      page_path: `${pathname}${window.location.search}`,
      page_title: document.title,
    });
  }, [measurementId, pathname]);

  return null;
}
