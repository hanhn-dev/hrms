import { DbsScreenClient } from "@/features/dbs/dbs-screen";
import { areWritesEnabled, requireFeaturePage } from "@/shared/auth";
import { getSelectedEnvironment, listConfiguredEnvironments } from "@/shared/db";

export async function DbsScreen(): Promise<React.JSX.Element> {
  const user = await requireFeaturePage("dbs");
  // Employer options load on the client (see DbsScreenClient). Awaiting them
  // here blocks soft navigation on DB latency / DNS failures and leaves the
  // App Router stuck on the "Rendering..." indicator.
  const environment = await getSelectedEnvironment();
  return (
    <DbsScreenClient
      userName={user.name ?? "Signed in"}
      roles={user.roles}
      environment={environment}
      environments={listConfiguredEnvironments()}
      writesEnabled={areWritesEnabled(environment)}
      initialEmployers={[]}
    />
  );
}
