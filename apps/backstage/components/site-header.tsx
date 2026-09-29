"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatus } from "@/components/auth/auth-status";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader(): React.JSX.Element | null {
  const pathname = usePathname();
  if (
    pathname === "/employers" ||
    pathname.startsWith("/employers/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/")
  ) {
    return null;
  }

  return (
    <header className="shrink-0 border-b border-slate-200 dark:border-slate-800">
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
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
          <SiteSearch />
          <AuthStatus />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
