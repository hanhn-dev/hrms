import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backstage",
  description: "Internal documentation and utilities for HRMS",
};

// Runs before hydration so the page never flashes the wrong theme: applies
// the stored preference, or falls back to the OS scheme when unset/"system".
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

// Hides Guides chrome before paint when a previous visit left read mode on.
const READ_MODE_INIT_SCRIPT = `(function(){try{var p=location.pathname;if(localStorage.getItem("backstage:read-mode")==="1"&&p.indexOf("/docs/guides/")===0&&p.length>"/docs/guides/".length){document.documentElement.setAttribute("data-read-mode","");} }catch(e){}})();`;

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
        <SiteHeader />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
