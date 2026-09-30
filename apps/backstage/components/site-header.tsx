"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatus } from "@/components/auth/auth-status";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";

function hideDocsChrome(pathname: string): boolean {
  return (
    pathname === "/employers" ||
    pathname.startsWith("/employers/") ||
    pathname === "/dbs" ||
    pathname.startsWith("/dbs/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/")
  );
}

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
        <Link
          className="shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          href="/employers"
        >
          Console
        </Link>
        <Link
          className="shrink-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          href="/dbs"
        >
          Db Studio
        </Link>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
          <SiteSearch />
          <AuthStatus />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
