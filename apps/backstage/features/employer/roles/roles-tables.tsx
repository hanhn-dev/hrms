"use client";

import { DataTable } from "@/shared/ui/data-table";
import { useRouter } from "next/navigation";
import type { RolePageGrant, RoleRow } from "@/features/employer/roles/queries";
import { roleGrantsHref, rolesListHref } from "@/features/employer/roles/roles-href";
import { EntityLink } from "@/shared/entity-link";

export function RolesTable({
  employerId,
  grantPage,
  grantSearch,
  roles,
  queryScript,
  page,
  pageSize,
  search,
  selectedRoleId,
  total,
}: {
  employerId: number;
  grantPage: number;
  grantSearch: string;
  roles: RoleRow[];
  queryScript: string;
  page: number;
  pageSize: number;
  search: string;
  selectedRoleId: number | null;
  total: number;
}): React.JSX.Element {
  const router = useRouter();
  const href = (next: { page?: number; q?: string | null }) =>
    rolesListHref(employerId, {
      page: next.page,
      q: next.q === undefined ? search || null : next.q,
      roleId: selectedRoleId,
      grantPage,
      grantQ: grantSearch || null,
    });
  return (
    <DataTable
      queryScript={queryScript}
      rowKey="roleId"
      dataSource={roles}
      size="small"
      scroll={{ x: "max-content" }}
      searchQuery={search}
      onSearch={(next) => {
        router.push(href({ q: next }));
      }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        onChange: (next) => {
          router.push(href({ page: next, q: search }));
        },
      }}
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
  employerId,
  grants,
  page,
  pageSize,
  queryScript,
  rolePage,
  roleSearch,
  search,
  selectedRoleId,
  total,
}: {
  employerId: number;
  grants: RolePageGrant[];
  page: number;
  pageSize: number;
  queryScript: string;
  rolePage: number;
  roleSearch: string;
  search: string;
  selectedRoleId: number | null;
  total: number;
}): React.JSX.Element {
  const router = useRouter();
  const href = (next: { page?: number; q?: string | null }) =>
    roleGrantsHref(employerId, {
      page: rolePage,
      q: roleSearch || null,
      roleId: selectedRoleId,
      grantPage: next.page,
      grantQ: next.q === undefined ? search || null : next.q,
    });
  return (
    <DataTable
      queryScript={queryScript}
      rowKey="menuId"
      dataSource={grants}
      size="small"
      scroll={{ x: "max-content" }}
      searchQuery={search}
      onSearch={(next) => {
        router.push(href({ q: next }));
      }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        onChange: (next) => {
          router.push(href({ page: next, q: search }));
        },
      }}
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
