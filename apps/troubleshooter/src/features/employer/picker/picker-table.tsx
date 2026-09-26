"use client";

import { Input, Table, Tag } from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { EmployerListItem } from "@/features/employer/picker/queries";

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

export function EmployerPickerTable({
  employers,
}: {
  employers: EmployerListItem[];
}): React.JSX.Element {
  const [nameQuery, setNameQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredEmployers = useMemo(() => {
    const needle = nameQuery.trim().toLowerCase();
    if (!needle) {
      return employers;
    }
    return employers.filter((employer) =>
      employer.employerName.toLowerCase().includes(needle),
    );
  }, [employers, nameQuery]);

  return (
    <Table
      rowKey="employerId"
      dataSource={filteredEmployers}
      scroll={{ x: "max-content" }}
      pagination={{
        current: page,
        pageSize: 20,
        showSizeChanger: true,
        onChange: setPage,
      }}
      locale={{
        emptyText: nameQuery.trim()
          ? "No employers matched."
          : "No employers found.",
      }}
      title={() => (
        <Input.Search
          allowClear
          placeholder="Search employer name"
          value={nameQuery}
          onChange={(event) => {
            setNameQuery(event.target.value);
            setPage(1);
          }}
          onSearch={(value) => {
            setNameQuery(value);
            setPage(1);
          }}
        />
      )}
      columns={[
        {
          title: "Employer",
          dataIndex: "employerName",
          width: 280,
          ellipsis: true,
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            compareText(a.employerName, b.employerName),
          render: (name: string, row: EmployerListItem) => (
            <Link href={`/employers/${row.employerId}`}>{name}</Link>
          ),
        },
        {
          title: "Id",
          dataIndex: "employerId",
          width: 90,
          defaultSortOrder: "ascend",
          sorter: (a: EmployerListItem, b: EmployerListItem) =>
            a.employerId - b.employerId,
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
            compareText(String(a.isActive ?? ""), String(b.isActive ?? "")),
          render: (value: unknown) => (
            <Tag
              color={
                String(value) === "1" || value === true || value === "Y"
                  ? "green"
                  : "default"
              }
            >
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
