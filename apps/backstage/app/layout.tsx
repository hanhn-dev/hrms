import type { Metadata } from "next";
import Link from "next/link";
import { AuthStatus } from "@/components/auth/auth-status";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backstage",
  description: "Internal documentation and utilities for HRMS",
};

// Runs before hydration so the page never flashes the wrong theme: applies
// the stored preference, or falls back to the OS scheme when unset/"system".
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

// Hides Features chrome before paint when a previous visit left read mode on.
const READ_MODE_INIT_SCRIPT = `(function(){try{var p=location.pathname;if(localStorage.getItem("backstage:read-mode")==="1"&&p.indexOf("/features/")===0&&p.length>"/features/".length){document.documentElement.setAttribute("data-read-mode","");} }catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: READ_MODE_INIT_SCRIPT }} />
      </head>
      <body className="flex h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
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
              href="/features"
            >
              Features
            </Link>
            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-3">
              <SiteSearch />
              <AuthStatus />
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
