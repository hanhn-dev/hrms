import { notFound } from "next/navigation";
import { getEmployerSettings } from "@/features/employer/settings";
import { areWritesEnabled, requireFeaturePage } from "@/shared/auth";
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
  const user = await requireFeaturePage("employers");
  const { employerId: rawId } = await params;
  if (rawId === "0") {
    const environment = await getSelectedEnvironment();
    return (
      <AppShell
        employerId={0}
        employers={[{ employerId: 0, employerName: "Template" }]}
        environment={environment}
        environments={listConfiguredEnvironments()}
        roles={user.roles}
        userName={user.name ?? "Signed in"}
        writesEnabled={areWritesEnabled(environment)}
      >
        {children}
      </AppShell>
    );
  }
  const employerId = parsePositiveInt(rawId);
  const [settings, environment] = await Promise.all([
    getEmployerSettings(employerId),
    getSelectedEnvironment(),
  ]);
  if (!settings) {
    notFound();
  }
  return (
    <AppShell
      employerId={employerId}
      employers={[
        { employerId: settings.employerId, employerName: settings.employerName },
      ]}
      environment={environment}
      environments={listConfiguredEnvironments()}
      roles={user.roles}
      userName={user.name ?? "Signed in"}
      writesEnabled={areWritesEnabled(environment)}
    >
      {children}
    </AppShell>
  );
}
