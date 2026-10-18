import { captureQueryScript } from "@hrms/db";
import { Card } from "antd";
import { SectionsPanel } from "@/features/employee/sections/sections-panel";
import { getEmployeeSectionCounts } from "@/features/employee/sections/queries";
import { MissingObjectAlert } from "@/shared/ui";

export async function EmployeeSectionsSlot({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const loaded = await captureQueryScript(() =>
    getEmployeeSectionCounts(employerId, employmentNumber),
  );
  const rows = loaded.result;
  const unavailable = rows.flatMap((row) =>
    row.missingObjects.map((objectName) => ({
      feature: row.label,
      objectName,
    })),
  );

  return (
    <>
      <MissingObjectAlert items={unavailable} />
      <Card title="Section summary">
        <SectionsPanel
          employerId={employerId}
          employmentNumber={employmentNumber}
          queryScript={loaded.script}
          rows={rows}
        />
      </Card>
    </>
  );
}
