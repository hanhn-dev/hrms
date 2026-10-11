"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { EMPTY_TRAIL } from "./trail";
import { clearTrail, getTrailSnapshot, subscribeTrail, truncateTrailTo } from "./trail-store";

/**
 * Shows the path taken to the current page (Flows -> a write-up -> a
 * related write-up -> ...) so any earlier stop is one click away. Hidden
 * when there is nothing to show, and self-clears when the current page was
 * reached some other way (a header link, a bookmark, a typed URL).
 */
export function TrailBar(): React.JSX.Element | null {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const router = useRouter();
  const state = useSyncExternalStore(subscribeTrail, getTrailSnapshot, () => EMPTY_TRAIL);

  const currentHref = `${pathname}${query ? `?${query}` : ""}`;
  const isCurrent = state.owner === currentHref;

  useEffect(() => {
    if (!isCurrent && state.owner !== null) clearTrail();
  }, [isCurrent, state.owner]);

  if (!isCurrent || state.entries.length === 0) return null;

  return (
    <nav
      aria-label="Visit trail"
      className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-6 py-1.5 text-sm text-slate-500 dark:border-slate-900 dark:text-slate-400"
    >
      {state.entries.map((entry, index) => (
        <span className="flex shrink-0 items-center gap-1.5" key={`${entry.href}-${index}`}>
          <button
            className="truncate hover:text-sky-700 hover:underline dark:hover:text-sky-300"
            type="button"
            onClick={() => {
              truncateTrailTo(index);
              router.push(entry.href);
            }}
          >
            {entry.label}
          </button>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            /
          </span>
        </span>
      ))}
      <span className="shrink-0 truncate font-medium text-slate-700 dark:text-slate-300">
        {state.ownerLabel}
      </span>
    </nav>
  );
}
