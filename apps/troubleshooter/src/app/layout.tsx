import type { Metadata } from "next";
import { AppProviders } from "@/shared/ui/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "HRMS Troubleshooter",
  description: "Internal operator console for HRMS data and access diagnostics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
