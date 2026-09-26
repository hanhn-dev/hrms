import { Alert, Card, Descriptions, Table } from "antd";
import { WritesBanner } from "@/shared/ui/writes-banner";
import {
  getEmployerSettings,
  listLicensedModules,
} from "@/features/employer/settings/queries";

export async function EmployerSettingsScreen({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const [settings, modules] = await Promise.all([
    getEmployerSettings(employerId),
    listLicensedModules(employerId),
  ]);

  if (!settings) {
    return <Alert showIcon type="error" title="Employer was not found." />;
  }

  return (
    <>
      <WritesBanner />
      <Alert
        className="mb-4"
        showIcon
        type={settings.tabDetailsRowCount === 0 ? "warning" : "success"}
        title={settings.tabMasterNote}
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
              label: "TTabDetails rows",
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
      <Card title="Licensed modules">
        <Table
          rowKey="moduleId"
          dataSource={modules}
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
