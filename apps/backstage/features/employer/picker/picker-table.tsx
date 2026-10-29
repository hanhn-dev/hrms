"use client";

import { Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import Link from "next/link";
import type { EmployerListItem } from "@/features/employer/picker/queries";
import { HighlightMatch } from "@/shared/ui";

function compareText(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  return (left ?? "").localeCompare(right ?? "", undefined, {
    sensitivity: "base",
  });
}

function compareNumber(left: number | null, right: number | null): number {
  return (left ?? Number.NEGATIVE_INFINITY) - (right ?? Number.NEGATIVE_INFINITY);
}

function isActiveFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}

export function EmployerPickerTable({
  employers,
  queryScript,
}: {
  employers: EmployerListItem[];
  queryScript: string;
}): React.JSX.Element {
  const sortedEmployers = [...employers].sort((a, b) => {
      const aActive = isActiveFlag(a.isActive);
      const bActive = isActiveFlag(b.isActive);
      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }
      return a.employerId - b.employerId;
    });

  return (
    <DataTable
      queryScript={queryScript}
      rowKey="employerId"
      dataSource={sortedEmployers}
      scroll={{ x: "max-content" }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
      }}
      locale={{ emptyText: "No employers found." }}
      columns={[
        {
          title: "Employer",
          dataIndex: "employerName",
          width: 280,
          ellipsis: true,
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            compareText(a.employerName, b.employerName),
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
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            a.employerId - b.employerId,
          render: (employerId: number) => (
            <HighlightMatch text={String(employerId)} />
          ),
        },
        {
          title: "Employees",
          dataIndex: "employeeCount",
          width: 120,
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            a.employeeCount - b.employeeCount,
        },
        {
          title: "Active",
          dataIndex: "isActive",
          width: 100,
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            Number(isActiveFlag(a.isActive)) - Number(isActiveFlag(b.isActive)),
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
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            compareNumber(a.licenseCount, b.licenseCount),
        },
        {
          title: "FailedAttempts",
          dataIndex: "failedAttempts",
          width: 140,
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            compareNumber(a.failedAttempts, b.failedAttempts),
        },
        {
          title: "Time zone",
          dataIndex: "timeZone",
          width: 180,
          ellipsis: true,
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            compareText(a.timeZone, b.timeZone),
        },
      ]}
    />
  );
}
