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
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <header className="border-b border-slate-200">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-4">
            <Link className="font-semibold" href="/">
              Backstage
            </Link>
            <Link className="text-sm text-slate-600 hover:text-slate-900" href="/docs">
              Docs
            </Link>
            <Link className="text-sm text-slate-600 hover:text-slate-900" href="/wiki">
              Wiki
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
