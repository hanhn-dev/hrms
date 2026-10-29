"use client";

import Link from "next/link";

const LINK_CLASS =
  "shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white";

/**
 * Site header link for Console, Db Studio, and Azure DevOps.
 * A stuck soft navigation is recovered by SoftNavRecovery in the root layout.
 */
export function OpsNavLink({
  href,
  children,
}: {
  href: "/employers" | "/dbs" | "/azure";
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link className={LINK_CLASS} href={href}>
      {children}
    </Link>
  );
}
