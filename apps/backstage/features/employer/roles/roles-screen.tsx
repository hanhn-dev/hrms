import { captureQueryScript } from "@hrms/db";
import { Card } from "antd";
import { RoleGrantsTable, RolesTable } from "@/features/employer/roles/roles-tables";
import { listRolePageGrants, listRoles } from "@/features/employer/roles/queries";

export async function RolesScreen({
  employerId,
  selectedRoleId,
}: {
  employerId: number;
  selectedRoleId: number | null;
}): Promise<React.JSX.Element> {
  const [roles, grants] = await Promise.all([
    captureQueryScript(() => listRoles(employerId)),
    captureQueryScript(() => listRolePageGrants(employerId, selectedRoleId)),
  ]);

  return (
    <>
      <Card className="mb-4" title="Tenant roles">
        <RolesTable employerId={employerId} queryScript={roles.script} roles={roles.result} />
      </Card>
      <Card
        title={
          selectedRoleId
            ? `Page grants for role ${selectedRoleId}`
            : "Select a role to see page grants"
        }
      >
        <RoleGrantsTable grants={grants.result} queryScript={grants.script} />
      </Card>
    </>
  );
}
