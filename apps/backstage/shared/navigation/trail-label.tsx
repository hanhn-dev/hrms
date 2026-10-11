"use client";

import { useTrailLabel } from "./use-trail-label";

/**
 * A render-nothing announcer for server-rendered pages: drop this where a
 * client component is not otherwise available, to register the page's name
 * with the visit trail. Client components can call `useTrailLabel` directly.
 */
export function TrailLabel({ label }: { label: string }): null {
  useTrailLabel(label);
  return null;
}
