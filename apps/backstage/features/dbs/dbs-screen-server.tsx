import { redirect } from "next/navigation";
import { DbsScreenClient } from "@/features/dbs/dbs-screen";
import { areWritesEnabled, auth } from "@/shared/auth";
import { getSelectedEnvironment, listConfiguredEnvironments } from "@/shared/db";

export async function DbsScreen(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.isRootAdmin) {
    redirect("/login");
  }
  // Employer options load on the client (see DbsScreenClient). Awaiting them
  // here blocks soft navigation on DB latency / DNS failures and leaves the
  // App Router stuck on the "Rendering..." indicator.
  const environment = await getSelectedEnvironment();
  return (
    <DbsScreenClient
      userName={session.user.name ?? "Root Admin"}
      environment={environment}
      environments={listConfiguredEnvironments()}
      writesEnabled={areWritesEnabled(environment)}
      initialEmployers={[]}
    />
  );
}
