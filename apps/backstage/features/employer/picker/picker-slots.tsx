import { captureQueryScript } from "@hrms/db";
import { Alert, Card } from "antd";
import { EmployerPickerTable } from "@/features/employer/picker/picker-table";
import { getDatabaseHealth, listEmployers } from "@/features/employer/picker/queries";

export async function PickerHealthSlot({
  environment,
}: {
  environment: string;
}): Promise<React.JSX.Element> {
  const health = await getDatabaseHealth();
  if (health.ok) {
    return (
      <Alert
        className="mb-4"
        showIcon
        type="success"
        title={`Connected to ${health.database} (${environment})`}
      />
    );
  }
  return (
    <Alert
      className="mb-4"
      showIcon
      type="error"
      title="Database is not reachable"
      description={health.error}
    />
  );
}

export async function PickerEmployersSlot(): Promise<React.JSX.Element> {
  const employers = await captureQueryScript(() => listEmployers());
  return (
    <Card>
      <EmployerPickerTable employers={employers.result} queryScript={employers.script} />
    </Card>
  );
}
