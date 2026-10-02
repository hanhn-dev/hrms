import { captureQueryScript } from "@hrms/db";
import { Alert, Card } from "antd";
import { DbsEntryButton } from "@/features/employer/picker/dbs-entry-button";
import { EmployerPickerTable } from "@/features/employer/picker/picker-table";
import { getDatabaseHealth, listEmployers } from "@/features/employer/picker/queries";
import { getSelectedEnvironment } from "@/shared/db";
import { listConfiguredEnvironments } from "@/shared/db/environments";
import { EnvironmentSelect } from "@/shared/ui/environment-select";
import { PageHeader } from "@/shared/ui/page-header";
import { SignOutButton } from "@/shared/ui/sign-out-button";
import { Text } from "@/shared/ui/antd-rsc";

export async function EmployerPickerScreen({
  userName,
}: {
  userName: string;
}): Promise<React.JSX.Element> {
  const [employers, health, environment] = await Promise.all([
    captureQueryScript(() => listEmployers()),
    getDatabaseHealth(),
    getSelectedEnvironment(),
  ]);
  const environments = listConfiguredEnvironments();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <PageHeader
        title="Select employer"
        extra={
          <div className="flex items-center gap-3">
            <DbsEntryButton />
            <Text type="secondary">{userName}</Text>
            <EnvironmentSelect
              environment={environment}
              environments={environments}
            />
            <SignOutButton />
          </div>
        }
      />
      {health.ok ? (
        <Alert
          className="mb-4"
          showIcon
          type="success"
          title={`Connected to ${health.database} (${environment})`}
        />
      ) : (
        <Alert
          className="mb-4"
          showIcon
          type="error"
          title="Database is not reachable"
          description={health.error}
        />
      )}
      <Card>
        <EmployerPickerTable employers={employers.result} queryScript={employers.script} />
      </Card>
    </div>
  );
}
