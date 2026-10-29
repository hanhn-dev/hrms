"use client";

import { Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BusinessUnitEmployee } from "@/features/employee/business-unit/queries";
import { listHref } from "@/shared/list-query";

function isActiveFlag(value: unknown): boolean {
  return value === true || value === "Y" || value === "1" || value === 1;
}

export function BusinessUnitTable({
  currentEmployeeId,
  employerId,
  employmentNumber,
  page,
  pageSize,
  results,
  search,
  total,
  queryScript,
}: {
  currentEmployeeId: number;
  employerId: number;
  employmentNumber: string;
  page: number;
  pageSize: number;
  results: BusinessUnitEmployee[];
  search: string;
  total: number;
  queryScript: string;
}): React.JSX.Element {
  const router = useRouter();
  const path = `/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}/business-unit`;
  return (
    <DataTable
      queryScript={queryScript}
      rowKey="employeeId"
      dataSource={results}
      scroll={{ x: "max-content" }}
      searchQuery={search}
      onSearch={(next) => {
        router.push(listHref(path, { page: 1, q: next || null }));
      }}
      rowClassName={(row) =>
        row.employeeId === currentEmployeeId ? "bg-slate-50" : ""
      }
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        showTotal: (count) => `${count} employees`,
        onChange: (next) => {
          router.push(listHref(path, { page: next, q: search || null }));
        },
      }}
      locale={{
        emptyText: search
          ? "No employees matched."
          : "No employees found in this business unit.",
      }}
      columns={[
        {
          title: "Employee ID",
          dataIndex: "employeeId",
          width: 140,
        },
        {
          title: "Employment no.",
          dataIndex: "employmentNumber",
          width: 160,
          render: (value: string) => (
            <Link
              href={`/employers/${employerId}/employees/${encodeURIComponent(value)}`}
            >
              {value}
            </Link>
          ),
        },
        {
          title: "Name",
          dataIndex: "fullName",
          width: 280,
          ellipsis: true,
          render: (value: string, row: BusinessUnitEmployee) => (
            <span className="inline-flex max-w-full items-center gap-2">
              <span className="min-w-0 truncate">{value}</span>
              {row.employeeId === currentEmployeeId ? (
                <Tag className="m-0" color="blue">
                  This employee
                </Tag>
              ) : null}
            </span>
          ),
        },
        {
          title: "Email",
          dataIndex: "workEmail",
          width: 280,
          ellipsis: true,
        },
        {
          title: "Role",
          dataIndex: "roleName",
          width: 180,
          ellipsis: true,
        },
        {
          title: "Active",
          dataIndex: "isActive",
          width: 110,
          render: (value: unknown) =>
            isActiveFlag(value) ? (
              <Tag color="green">Active</Tag>
            ) : (
              <Tag color="red">Inactive</Tag>
            ),
        },
      ]}
    />
  );
}
