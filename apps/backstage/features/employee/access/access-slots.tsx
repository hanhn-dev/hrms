import { Card } from "antd";
import { AccessActions } from "@/features/employee/access/access-actions";
import { AccessTreesTabs } from "@/features/employee/access/access-trees-tabs";
import { getEmployeeAccess } from "@/features/employee/access/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function EmployeeAccessSlot({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const [access, writesEnabled] = await Promise.all([
    getEmployeeAccess(employerId, employmentNumber),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  return (
    <>
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
          tabMasterTone={access.tabMaster?.tabMasterRows === 0 ? "warning" : "success"}
          tree={access.tree}
          tabTree={access.tabTree}
          writesEnabled={writesEnabled}
        />
      </Card>
    </>
  );
}
