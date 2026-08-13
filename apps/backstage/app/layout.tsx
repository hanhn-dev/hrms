import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "../components/theme-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backstage",
  description: "Internal documentation and utilities for HRMS",
};

// Runs before hydration so the page never flashes the wrong theme: applies
// the stored preference, or falls back to the OS scheme when unset/"system".
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <header className="shrink-0 border-b border-slate-200 dark:border-slate-800">
          <nav className="flex items-center gap-6 px-6 py-4">
            <Link className="font-semibold" href="/">
              Backstage
            </Link>
            <Link
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              href="/docs"
            >
              Docs
            </Link>
            <Link
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              href="/wiki"
            >
              Wiki
            </Link>
            <Link
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              href="/features"
            >
              Features
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
