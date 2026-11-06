import { AppProviders } from "@/shared/ui/app-providers";

export default function ChartsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="h-full min-h-0 [&_.ant-app]:flex [&_.ant-app]:h-full [&_.ant-app]:min-h-0 [&_.ant-app]:flex-col">
      <AppProviders>{children}</AppProviders>
    </div>
  );
}
