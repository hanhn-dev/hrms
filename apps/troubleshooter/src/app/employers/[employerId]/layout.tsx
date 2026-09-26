import { notFound, redirect } from "next/navigation";
import { listEmployers } from "@/features/employer/picker";
import { getEmployerSettings } from "@/features/employer/settings";
import { areWritesEnabled, auth } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { listConfiguredEnvironments } from "@/shared/db/environments";
import { parsePositiveInt } from "@/shared/routing";
import { AppShell } from "@/shared/ui/app-shell";

export default async function EmployerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ employerId: string }>;
}): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.isRootAdmin) {
    redirect("/login");
  }
  const { employerId: rawId } = await params;
  const employerId = parsePositiveInt(rawId);
  const [settings, employers, environment] = await Promise.all([
    getEmployerSettings(employerId),
    listEmployers(),
    getSelectedEnvironment(),
  ]);
  if (!settings) {
    notFound();
  }
  return (
    <AppShell
      employerId={employerId}
      employers={employers}
      environment={environment}
      environments={listConfiguredEnvironments()}
      userName={session.user.name ?? "Root Admin"}
      writesEnabled={areWritesEnabled(environment)}
    >
      {children}
    </AppShell>
  );
}
