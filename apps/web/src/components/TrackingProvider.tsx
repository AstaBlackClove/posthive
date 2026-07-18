"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initTracking, trackPageView } from "../lib/track";

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initTracking();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return <>{children}</>;
}
