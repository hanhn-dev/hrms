import { Alert, Card } from "antd";
import { EmployerPickerTable } from "@/features/employer/picker/picker-table";
import { getDatabaseHealth, listEmployers } from "@/features/employer/picker/queries";
import { getSelectedEnvironment } from "@/shared/db";
import { listConfiguredEnvironments } from "@/shared/db/environments";
import { EnvironmentSelect } from "@/shared/ui/environment-select";
import { PageHeader, SignOutButton, Text } from "@/shared/ui";

export async function EmployerPickerScreen({
  userName,
}: {
  userName: string;
}): Promise<React.JSX.Element> {
  const [employers, health, environment] = await Promise.all([
    listEmployers(),
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
        <EmployerPickerTable employers={employers} />
      </Card>
    </div>
  );
}
