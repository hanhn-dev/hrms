import { captureQueryScript } from "@hrms/db";
import { CustomerSettingsPanel } from "@/features/employer/settings/settings-panel";
import {
  getCustomerSettings,
  listLicensedModules,
} from "@/features/employer/settings/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { DataTable } from "@/shared/ui/data-table";

export async function CustomerSettingsSlot({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const [settings, writesEnabled] = await Promise.all([
    getCustomerSettings(employerId),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);
  return (
    <div className="mb-4">
      <CustomerSettingsPanel
        employerId={employerId}
        settings={settings}
        writesEnabled={writesEnabled}
      />
    </div>
  );
}

export async function LicensedModulesSlot({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const modules = await captureQueryScript(() => listLicensedModules(employerId));
  return (
    <DataTable
      columns={[
        { title: "ModuleId", dataIndex: "moduleId", width: 120 },
        { title: "Name", dataIndex: "moduleName" },
      ]}
      dataSource={modules.result}
      pagination={false}
      queryScript={modules.script}
      rowKey="moduleId"
      scroll={{ x: "max-content" }}
      size="small"
    />
  );
}
