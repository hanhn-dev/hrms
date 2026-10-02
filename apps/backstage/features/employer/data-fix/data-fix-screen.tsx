import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { PageHelp } from "@/shared/ui";
import { DataFixPanel } from "@/features/employer/data-fix/data-fix-panel";

export async function DataFixScreen({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <>
      <PageHelp
        source="data-fix"
        notes={[
          {
            id: "column-search",
            type: "info",
            title: "Search by column or table",
            description:
              "Type at least two characters, then Open a table. Find runs when you press Enter and shows up to 100 rows for this employer.",
          },
          {
            id: "hmac-confirm",
            type: "info",
            title: "Edit cells, then commit",
            description:
              "Click a cell to change it. Commit writes every pending cell in one transaction, up to 200 cells, and only if those rows still hold the values you saw.",
          },
        ]}
      />
      <DataFixPanel employerId={employerId} writesEnabled={writesEnabled} />
    </>
  );
}
