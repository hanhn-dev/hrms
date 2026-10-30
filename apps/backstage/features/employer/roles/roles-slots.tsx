import { captureQueryScript } from "@hrms/db";
import { Card } from "antd";
import { RoleLocationBuPanel } from "@/features/employer/roles/location-bu-panel";
import {
  getRoleLocationBuScope,
  listRolePageGrants,
  listRoleScopeOptions,
  listRoles,
} from "@/features/employer/roles/queries";
import { RoleGrantsTable, RolesTable } from "@/features/employer/roles/roles-tables";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function RolesListSlot({
  employerId,
  grantPage,
  grantSearch,
  page,
  pageSize,
  search,
  selectedRoleId,
}: {
  employerId: number;
  grantPage: number;
  grantSearch: string;
  page: number;
  pageSize: number;
  search: string;
  selectedRoleId: number | null;
}): Promise<React.JSX.Element> {
  const roles = await captureQueryScript(() =>
    listRoles(employerId, { page, pageSize, q: search }),
  );
  return (
    <Card className="mb-4" title="Tenant roles">
      <RolesTable
        employerId={employerId}
        grantPage={grantPage}
        grantSearch={grantSearch}
        page={roles.result.page}
        pageSize={roles.result.pageSize}
        queryScript={roles.script}
        roles={roles.result.rows}
        search={search}
        selectedRoleId={selectedRoleId}
        total={roles.result.totalCount}
      />
    </Card>
  );
}

export async function RoleLocationBuSlot({
  employerId,
  selectedRoleId,
}: {
  employerId: number;
  selectedRoleId: number | null;
}): Promise<React.JSX.Element> {
  if (selectedRoleId == null) {
    return (
      <Card className="mb-4" title="Location / BU scope">
        Select a role to view or edit LocationIds and BusinessUnitIds.
      </Card>
    );
  }
  const [scope, writesEnabled] = await Promise.all([
    getRoleLocationBuScope(employerId, selectedRoleId),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);
  const options = await listRoleScopeOptions(
    employerId,
    scope?.locationIds,
    scope?.businessUnitIds,
  );
  return (
    <Card
      className="mb-4"
      title={`Location / BU scope for role ${selectedRoleId}`}
    >
      <RoleLocationBuPanel
        key={`${selectedRoleId}-${scope?.locationIds ?? ""}-${scope?.businessUnitIds ?? ""}`}
        employerId={employerId}
        roleId={selectedRoleId}
        scope={scope}
        locations={options.locations}
        businessUnits={options.businessUnits}
        writesEnabled={writesEnabled}
      />
    </Card>
  );
}

export async function RoleGrantsSlot({
  employerId,
  page,
  pageSize,
  rolePage,
  roleSearch,
  search,
  selectedRoleId,
}: {
  employerId: number;
  page: number;
  pageSize: number;
  rolePage: number;
  roleSearch: string;
  search: string;
  selectedRoleId: number | null;
}): Promise<React.JSX.Element> {
  const grants = await captureQueryScript(() =>
    listRolePageGrants(employerId, selectedRoleId, { page, pageSize, q: search }),
  );
  return (
    <Card
      title={
        selectedRoleId
          ? `Page grants for role ${selectedRoleId}`
          : "Select a role to see page grants"
      }
    >
      <RoleGrantsTable
        employerId={employerId}
        grants={grants.result.rows}
        page={grants.result.page}
        pageSize={grants.result.pageSize}
        queryScript={grants.script}
        rolePage={rolePage}
        roleSearch={roleSearch}
        search={search}
        selectedRoleId={selectedRoleId}
        total={grants.result.totalCount}
      />
    </Card>
  );
}
