"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { announceTrailLabel } from "./trail-store";

/**
 * Registers this page's display name in the visit trail, so a crumb pointing
 * back to it (and the "current page" label in `TrailBar`) shows something
 * meaningful. Call once, unconditionally, from a page that participates in
 * the trail.
 *
 * Reads the query string from `window.location` rather than `useSearchParams`
 * so this hook never forces a `Suspense` boundary on its caller. A page whose
 * own href includes search params that matter to the trail (Flows' `?node=`)
 * keeps that in sync itself via `retargetTrail` when the params change.
 */
export function useTrailLabel(label: string): void {
  const pathname = usePathname();

  useEffect(() => {
    const search = typeof window === "undefined" ? "" : window.location.search;
    announceTrailLabel(`${pathname}${search}`, label);
  }, [pathname, label]);
}
