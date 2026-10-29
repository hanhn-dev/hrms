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
  let employers: Awaited<ReturnType<typeof listEmployers>> | null = null;
  let queryScript = "";
  let description: string | null = null;
  try {
    const loaded = await captureQueryScript(() => listEmployers());
    employers = loaded.result;
    queryScript = loaded.script;
  } catch (error) {
    description = error instanceof Error ? error.message : "Could not load employers.";
  }
  if (employers == null) {
    return (
      <Alert
        showIcon
        type="error"
        title="Could not load employers"
        description={description ?? "Could not load employers."}
      />
    );
  }
  return (
    <Card>
      <EmployerPickerTable employers={employers} queryScript={queryScript} />
    </Card>
  );
}
