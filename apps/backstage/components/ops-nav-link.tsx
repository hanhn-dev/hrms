"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { pathMatchesOpsHref } from "@/components/ops-nav-path";

/** Soft-nav can stall with Next's "Rendering…" indicator; hard-nav recovers. */
const SOFT_NAV_FALLBACK_MS = 2_000;

const LINK_CLASS =
  "shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white";

/**
 * SiteHeader link for auth-gated ops routes. Uses normal soft navigation, then
 * falls back to a full document load if the App Router never commits.
 */
export function OpsNavLink({
  href,
  children,
}: {
  href: "/employers" | "/dbs" | "/azure";
  children: React.ReactNode;
}): React.JSX.Element {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Link
      className={LINK_CLASS}
      href={href}
      onClick={() => {
        if (timerRef.current != null) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (!pathMatchesOpsHref(window.location.pathname, href)) {
            window.location.assign(href);
          }
        }, SOFT_NAV_FALLBACK_MS);
      }}
    >
      {children}
    </Link>
  );
}
