"use client";

import { Table, Tag } from "antd";
import Link from "next/link";
import type { BusinessUnitEmployee } from "@/features/employee/business-unit/queries";

function isActiveFlag(value: unknown): boolean {
  return value === true || value === "Y" || value === "1" || value === 1;
}

export function BusinessUnitTable({
  currentEmployeeId,
  employerId,
  results,
  search,
}: {
  currentEmployeeId: number;
  employerId: number;
  results: BusinessUnitEmployee[];
  search: string;
}): React.JSX.Element {
  return (
    <Table
      rowKey="employeeId"
      dataSource={results}
      scroll={{ x: "max-content" }}
      rowClassName={(row) =>
        row.employeeId === currentEmployeeId ? "bg-slate-50" : ""
      }
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `${total} employees`,
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
              href={`/features/employers/${employerId}/employees/${encodeURIComponent(value)}`}
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
