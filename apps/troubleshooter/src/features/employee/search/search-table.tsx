"use client";

import { Table, Tag } from "antd";
import Link from "next/link";
import type { EmployeeSearchHit } from "@/features/employee/search/queries";

function isActiveFlag(value: unknown): boolean {
  return value === true || value === "Y" || value === "1" || value === 1;
}

export function EmployeeSearchTable({
  employerId,
  search,
  results,
}: {
  employerId: number;
  search: string;
  results: EmployeeSearchHit[];
}): React.JSX.Element {
  return (
    <Table
      rowKey="employeeId"
      dataSource={results}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `${total} employees`,
      }}
      locale={{
        emptyText: search
          ? "No employees matched."
          : "No employees found for this employer.",
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
          width: 240,
          ellipsis: true,
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
