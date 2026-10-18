import { captureQueryScript } from "@hrms/db";
import { Alert, Card, Descriptions } from "antd";
import { CustomerSettingsPanel } from "@/features/employer/settings/settings-panel";
import {
  getCustomerSettings,
  getEmployerSettings,
  listLicensedModules,
} from "@/features/employer/settings/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { DataTable } from "@/shared/ui/data-table";
import { HintIcon } from "@/shared/ui/hint-icon";

export async function EmployerIdentitySlot({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const settings = await getEmployerSettings(employerId);
  if (!settings) {
    return <Alert showIcon type="error" title="Employer was not found." />;
  }

  return (
    <Card className="mb-4" title="Employer settings">
      <Descriptions
        bordered
        column={2}
        size="small"
        items={[
          { key: "employerId", label: "EmployerId", children: settings.employerId },
          {
            key: "active",
            label: "Active",
            children: String(settings.isActive ?? ""),
          },
          {
            key: "parent",
            label: "Parent",
            children: settings.parentEmployerId ?? "—",
          },
          {
            key: "root",
            label: "Root",
            children: settings.rootEmployerId ?? "—",
          },
          {
            key: "licenseCount",
            label: "License count",
            children: settings.licenseCount ?? "—",
          },
          {
            key: "failedAttempts",
            label: "Failed attempts",
            children: settings.failedAttempts ?? "—",
          },
          {
            key: "passwordExpires",
            label: "Password expires",
            children: settings.passwordExpires ?? "—",
          },
          {
            key: "passwordChangeLimit",
            label: "Password change limit",
            children: settings.passwordChangeLimit ?? "—",
          },
          { key: "timeZone", label: "Time zone", children: settings.timeZone ?? "—" },
          {
            key: "uiCulture",
            label: "UI culture",
            children: settings.uiCulture ?? "—",
          },
          {
            key: "tabDetailsRowCount",
            label: (
              <span className="inline-flex items-center gap-1">
                TTabDetails rows
                <HintIcon
                  title={settings.tabMasterNote}
                  tone={settings.tabDetailsRowCount === 0 ? "warning" : "success"}
                />
              </span>
            ),
            children: settings.tabDetailsRowCount,
          },
          {
            key: "userTabGrantCount",
            label: "TUserTabDetails rows",
            children: settings.userTabGrantCount,
          },
        ]}
      />
    </Card>
  );
}

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
