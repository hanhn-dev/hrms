import { captureQueryScript } from "@hrms/db";
import { Alert } from "antd";
import { MasterDataPanel } from "@/features/employer/master-data/master-data-panel";
import { loadMasterData } from "@/features/employer/master-data/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function MasterDataSlot({
  employerId,
  listKey,
  page,
  search,
}: {
  employerId: number;
  listKey: string | null;
  page: number;
  search: string;
}): Promise<React.JSX.Element> {
  const [loaded, writesEnabled] = await Promise.all([
    captureQueryScript(() => loadMasterData(employerId, listKey, { page, q: search })),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  if (loaded.result.catalog.length === 0) {
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
      catalog={loaded.result.catalog}
      employerId={employerId}
      listPage={loaded.result.page}
      listPageSize={loaded.result.pageSize}
      lookups={loaded.result.lookups}
      queryScript={loaded.script}
      rows={loaded.result.rows}
      search={search}
      selected={loaded.result.selected}
      total={loaded.result.totalCount}
      writesEnabled={writesEnabled}
    />
  );
}
