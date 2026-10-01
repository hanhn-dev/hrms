import { Alert } from "antd";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { PageHelp } from "@/shared/ui";
import { MasterDataPanel } from "@/features/employer/master-data/master-data-panel";
import { loadMasterData } from "@/features/employer/master-data/queries";

export async function MasterDataScreen({
  employerId,
  listKey,
}: {
  employerId: number;
  listKey: string | null;
}): Promise<React.JSX.Element> {
  const [page, writesEnabled] = await Promise.all([
    loadMasterData(employerId, listKey),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  return (
    <>
      <PageHelp
        source="master-data"
        notes={[
          {
            id: "search",
            type: "info",
            title: "Search the catalog and the open list",
            description:
              "The left search finds a master list by name. The right search filters the loaded rows.",
          },
          {
            id: "hmac-confirm",
            type: "info",
            title: "Add, edit, and delete use preview then confirm",
            description:
              "Each save opens a before/after preview. Commit updates only the allowlisted columns. Delete removes that row and fails when the value is still in use.",
          },
        ]}
      />
      {page.catalog.length === 0 ? (
        <Alert
          showIcon
          type="warning"
          title="No master lists were found in this database."
        />
      ) : (
        <MasterDataPanel
          catalog={page.catalog}
          employerId={employerId}
          lookups={page.lookups}
          rows={page.rows}
          selected={page.selected}
          writesEnabled={writesEnabled}
        />
      )}
    </>
  );
}
