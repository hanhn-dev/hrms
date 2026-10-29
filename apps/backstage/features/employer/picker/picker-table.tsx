"use client";

import { Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmployerListItem } from "@/features/employer/picker/queries";
import { listHref } from "@/shared/list-query";
import { HighlightMatch } from "@/shared/ui";

function isActiveFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}

export function EmployerPickerTable({
  employers,
  page,
  pageSize,
  queryScript,
  search,
  total,
}: {
  employers: EmployerListItem[];
  page: number;
  pageSize: number;
  queryScript: string;
  search: string;
  total: number;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <DataTable
      queryScript={queryScript}
      rowKey="employerId"
      dataSource={employers}
      scroll={{ x: "max-content" }}
      searchQuery={search}
      onSearch={(next) => {
        router.push(listHref("/employers", { q: next }));
      }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        showTotal: (count) => `${count} employers`,
        onChange: (next) => {
          router.push(listHref("/employers", { page: next, q: search }));
        },
      }}
      locale={{ emptyText: "No employers found." }}
      columns={[
        {
          title: "Employer",
          dataIndex: "employerName",
          width: 280,
          ellipsis: true,
          render: (name: string, row: EmployerListItem) => (
            <Link href={`/employers/${row.employerId}`}>
              <HighlightMatch text={name} />
            </Link>
          ),
        },
        {
          title: "Id",
          dataIndex: "employerId",
          width: 90,
          render: (employerId: number) => (
            <HighlightMatch text={String(employerId)} />
          ),
        },
        {
          title: "Employees",
          dataIndex: "employeeCount",
          width: 120,
        },
        {
          title: "Active",
          dataIndex: "isActive",
          width: 100,
          render: (value: unknown) => (
            <Tag color={isActiveFlag(value) ? "green" : "default"}>
              {String(value ?? "")}
            </Tag>
          ),
        },
        {
          title: "Licenses",
          dataIndex: "licenseCount",
          width: 110,
        },
        {
          title: "FailedAttempts",
          dataIndex: "failedAttempts",
          width: 140,
        },
        {
          title: "Time zone",
          dataIndex: "timeZone",
          width: 180,
          ellipsis: true,
        },
      ]}
    />
  );
}
