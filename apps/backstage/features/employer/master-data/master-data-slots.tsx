import { captureQueryScript } from "@hrms/db";
import { Alert } from "antd";
import { MasterDataPanel } from "@/features/employer/master-data/master-data-panel";
import { loadMasterData } from "@/features/employer/master-data/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function MasterDataSlot({
  employerId,
  listKey,
}: {
  employerId: number;
  listKey: string | null;
}): Promise<React.JSX.Element> {
  const [page, writesEnabled] = await Promise.all([
    captureQueryScript(() => loadMasterData(employerId, listKey)),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  if (page.result.catalog.length === 0) {
    return (
      <Alert
        showIcon
        type="warning"
        title="No master lists were found in this database."
      />
    );
  }

  return (
    <MasterDataPanel
      catalog={page.result.catalog}
      employerId={employerId}
      lookups={page.result.lookups}
      queryScript={page.script}
      rows={page.result.rows}
      selected={page.result.selected}
      writesEnabled={writesEnabled}
    />
  );
}
