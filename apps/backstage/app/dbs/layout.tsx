import { redirect } from "next/navigation";
import { auth } from "@/shared/auth";
import { AppProviders } from "@/shared/ui/app-providers";

export default async function DbsLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.isRootAdmin) {
    redirect("/login");
  }

  return (
    <div className="h-full min-h-0" data-dbs-shell="">
      <AppProviders>{children}</AppProviders>
    </div>
  );
}
