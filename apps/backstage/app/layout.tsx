import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backstage",
  description: "Internal documentation and utilities for HRMS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="flex h-screen flex-col bg-white text-slate-900 antialiased">
        <header className="shrink-0 border-b border-slate-200">
          <nav className="flex items-center gap-6 px-6 py-4">
            <Link className="font-semibold" href="/">
              Backstage
            </Link>
            <Link className="text-sm text-slate-600 hover:text-slate-900" href="/docs">
              Docs
            </Link>
            <Link className="text-sm text-slate-600 hover:text-slate-900" href="/wiki">
              Wiki
            </Link>
            <Link className="text-sm text-slate-600 hover:text-slate-900" href="/features">
              Features
            </Link>
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
