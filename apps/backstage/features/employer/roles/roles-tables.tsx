"use client";

import { DataTable } from "@/shared/ui/data-table";
import type { RolePageGrant, RoleRow } from "@/features/employer/roles/queries";
import { EntityLink } from "@/shared/entity-link";

export function RolesTable({
  employerId,
  roles,
  queryScript,
}: {
  employerId: number;
  roles: RoleRow[];
  queryScript: string;
}): React.JSX.Element {
  return (
    <DataTable
      queryScript={queryScript}
      rowKey="roleId"
      dataSource={roles}
      size="small"
      scroll={{ x: "max-content" }}
      columns={[
        {
          title: "Role",
          dataIndex: "roleName",
          render: (name: string, row: RoleRow) => (
            <EntityLink employerId={employerId} entity={{ kind: "role", roleId: row.roleId }}>
              {name}
            </EntityLink>
          ),
        },
        { title: "Id", dataIndex: "roleId", width: 90 },
        { title: "Type", dataIndex: "roleType" },
        { title: "Reporting", dataIndex: "reportingTypeName" },
        { title: "Pages", dataIndex: "pageGrantCount", width: 90 },
        { title: "Role tabs", dataIndex: "roleTabGrantCount", width: 110 },
        { title: "Users", dataIndex: "userCount", width: 90 },
        {
          title: "Default",
          dataIndex: "isDefault",
          render: (value: unknown) => String(value ?? ""),
        },
      ]}
    />
  );
}

export function RoleGrantsTable({
  grants,
  queryScript,
}: {
  grants: RolePageGrant[];
  queryScript: string;
}): React.JSX.Element {
  return (
    <DataTable
      queryScript={queryScript}
      rowKey="menuId"
      dataSource={grants}
      size="small"
      scroll={{ x: "max-content" }}
      columns={[
        { title: "MenuId", dataIndex: "menuId", width: 90 },
        { title: "Name", dataIndex: "menuName" },
        {
          title: "Active",
          dataIndex: "masterIsActive",
          render: (value: unknown) => String(value ?? ""),
        },
      ]}
    />
  );
}
