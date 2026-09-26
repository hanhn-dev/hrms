import { Alert, Card } from "antd";
import { AccessActions } from "@/features/employee/access/access-actions";
import { MenuAccessTree } from "@/features/employee/access/menu-access-tree";
import { getEmployeeAccess } from "@/features/employee/access/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { Employee360Nav } from "@/shared/ui";

export async function EmployeeAccessScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const access = await getEmployeeAccess(employerId, employmentNumber);
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <>
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      {access.tabMaster ? (
        <Alert
          className="mb-4"
          showIcon
          type={access.tabMaster.tabMasterRows === 0 ? "warning" : "success"}
          title={access.tabMaster.likelyCause}
        />
      ) : null}
      <Card className="mb-4" title={`Role: ${access.roleName ?? "none"}`}>
        <AccessActions
          currentRoleId={access.roleId}
          employerId={employerId}
          employmentNumber={employmentNumber}
          roles={access.roles}
          writesEnabled={writesEnabled}
        />
      </Card>
      <Card className="mb-4" title="Left menu and page tabs">
        <MenuAccessTree
          employerId={employerId}
          employmentNumber={employmentNumber}
          tree={access.tree}
          writesEnabled={writesEnabled}
        />
      </Card>
      <Card title="Page tabs (TTabDetails — tenant or Employerid 0)">
        <MenuAccessTree
          defaultExpandAll={false}
          employerId={employerId}
          employmentNumber={employmentNumber}
          tree={access.tabTree}
          writesEnabled={writesEnabled}
        />
      </Card>
    </>
  );
}
