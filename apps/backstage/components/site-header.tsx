"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AuthStatus } from "@/components/auth/auth-status";
import { hideDocsChrome } from "@/components/hide-docs-chrome";
import { OpsNavLink } from "@/components/ops-nav-link";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrailBar } from "@/shared/navigation";

export function SiteHeader(): React.JSX.Element {
  const pathname = usePathname();
  // Keep a stable DOM tree (never return null) so soft-nav to /dbs does not
  // trip a hydration mismatch while the App Router is still rendering.
  const hidden = hideDocsChrome(pathname);

  return (
    <header
      aria-hidden={hidden}
      className={
        hidden
          ? "hidden"
          : "shrink-0 border-b border-slate-200 dark:border-slate-800"
      }
    >
      <nav className="flex items-center gap-6 px-6 py-3">
        <Link className="shrink-0 font-semibold" href="/">
          Backstage
        </Link>
        <Link
          className="shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          href="/docs"
        >
          Docs
        </Link>
        <Link
          className="shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          href="/wiki"
        >
          Wiki
        </Link>
        <OpsNavLink href="/employers">Console</OpsNavLink>
        <OpsNavLink href="/dbs">Db Studio</OpsNavLink>
        <OpsNavLink href="/azure">Azure DevOps</OpsNavLink>
        <Link
          className="shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          href="/flows"
        >
          Flows
        </Link>
        <Link
          className="shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          href="/settings"
        >
          Settings
        </Link>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
          <SiteSearch />
          <AuthStatus />
          <ThemeToggle />
        </div>
      </nav>
      {hidden ? null : (
        <Suspense fallback={null}>
          <TrailBar />
        </Suspense>
      )}
    </header>
  );
}
