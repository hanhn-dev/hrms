import { captureQueryScript } from "@hrms/db";
import { Alert, Card, Descriptions } from "antd";
import {
  getCustomerSettings,
  getEmployerSettings,
  listLicensedModules,
} from "@/features/employer/settings/queries";
import { CustomerSettingsPanel } from "@/features/employer/settings/settings-panel";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { DataTable, HintIcon } from "@/shared/ui";
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function EmployerSettingsScreen({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const [settings, modules, customerSettings] = await Promise.all([
    getEmployerSettings(employerId),
    captureQueryScript(() => listLicensedModules(employerId)),
    getCustomerSettings(employerId),
  ]);
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  if (!settings) {
    return <Alert showIcon type="error" title="Employer was not found." />;
  }

  return (
    <>
      <PageHelp
        source="settings"
        notes={[
          {
            id: "hmac-confirm",
            type: "info",
            title: "Customer settings use preview then confirm",
            description:
              "Each category save and each JSON edit opens a before/after preview. Commit updates TCustomerSettings, and T&E or payroll satellite rows when those fields change.",
          },
          {
            id: "json-compact",
            type: "info",
            title: "JSON is stored compact",
            description:
              "JSON settings are validated then saved as compact text. Malformed JSON must be fixed in the editor before preview.",
          },
          {
            id: "no-side-effects",
            type: "warning",
            title: "No HRMS.Web post-save side effects",
            description:
              "Troubleshooter does not run LMS global rating scale, MMT key copy, or travel-config copy-from-master after save.",
          },
        ]}
      />
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
      <div className="mb-4">
        <CustomerSettingsPanel
          employerId={employerId}
          settings={customerSettings}
          writesEnabled={writesEnabled}
        />
      </div>
      <Card title="Licensed modules">
        <DataTable
          queryScript={modules.script}
          rowKey="moduleId"
          dataSource={modules.result}
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
          columns={[
            { title: "ModuleId", dataIndex: "moduleId", width: 120 },
            { title: "Name", dataIndex: "moduleName" },
          ]}
        />
      </Card>
    </>
  );
}
