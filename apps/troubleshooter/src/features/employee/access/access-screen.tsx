import { Card } from "antd";
import { AccessActions } from "@/features/employee/access/access-actions";
import { AccessTreesTabs } from "@/features/employee/access/access-trees-tabs";
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
      <Card className="mb-4" title={`Role: ${access.roleName ?? "none"}`}>
        <AccessActions
          currentRoleId={access.roleId}
          employerId={employerId}
          employmentNumber={employmentNumber}
          roles={access.roles}
          writesEnabled={writesEnabled}
        />
      </Card>
      <Card>
        <AccessTreesTabs
          employerId={employerId}
          employmentNumber={employmentNumber}
          tabMasterNote={access.tabMaster?.likelyCause}
          tabMasterTone={
            access.tabMaster?.tabMasterRows === 0 ? "warning" : "success"
          }
          tree={access.tree}
          tabTree={access.tabTree}
          writesEnabled={writesEnabled}
        />
      </Card>
    </>
  );
}
