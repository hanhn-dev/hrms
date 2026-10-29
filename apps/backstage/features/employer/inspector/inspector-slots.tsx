import { InspectorTabs } from "@/features/employer/inspector/inspector-tabs";
import { listInspectorEmployers } from "@/features/employer/inspector/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function InspectorSlot({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const [employers, environment] = await Promise.all([
    listInspectorEmployers(employerId),
    getSelectedEnvironment(),
  ]);

  return (
    <InspectorTabs
      employers={employers}
      environment={environment}
      routeEmployerId={employerId}
      writesEnabled={areWritesEnabled(environment)}
    />
  );
}
