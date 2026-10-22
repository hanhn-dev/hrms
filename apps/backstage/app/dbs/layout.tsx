import { AppProviders } from "@/shared/ui/app-providers";

export default function DbsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="h-full min-h-0" data-dbs-shell="">
      <AppProviders>{children}</AppProviders>
    </div>
  );
}
