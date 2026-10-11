"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getTrailSnapshot, pushTrail } from "./trail-store";

/**
 * A page link that continues the visit trail: the page being left becomes a
 * crumb (using the label it registered via `useTrailLabel`, or the document
 * title when it never registered one), and `href` becomes the new current
 * page. Use this instead of `next/link` for links meant to be undoable
 * (e.g. "Read the write-up"); object mentions that open a side panel are not
 * page navigation and should keep using a plain button.
 */
export function TrailLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Link
      className={className}
      href={href}
      onClick={() => {
        if (typeof window === "undefined") return;
        const currentHref = `${window.location.pathname}${window.location.search}`;
        const snapshot = getTrailSnapshot();
        const label = (snapshot.owner === currentHref ? snapshot.ownerLabel : null) ?? document.title;
        pushTrail({ href: currentHref, label }, href);
      }}
    >
      {children}
    </Link>
  );
}
