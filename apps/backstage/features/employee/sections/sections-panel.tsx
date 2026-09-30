"use client";

import { Table, Typography } from "antd";
import Link from "next/link";
import { isCrudSectionId } from "@hrms/db/sections-registry";
import type { EmployeeSectionCount } from "@/features/employee/sections/queries";

export function SectionsPanel({
  employerId,
  employmentNumber,
  rows,
}: {
  employerId: number;
  employmentNumber: string;
  rows: EmployeeSectionCount[];
}): React.JSX.Element {
  return (
    <Table
      rowKey="sectionId"
      size="small"
      pagination={false}
      dataSource={rows}
      columns={[
        {
          title: "Section",
          dataIndex: "label",
          sorter: (a, b) => a.label.localeCompare(b.label),
          defaultSortOrder: "ascend",
          render: (label: string, row) => {
            if (row.missingObjects.length > 0) {
              return (
                <Typography.Text type="secondary">
                  {label} (unavailable)
                </Typography.Text>
              );
            }
            if (!isCrudSectionId(row.sectionId)) {
              return (
                <Typography.Text>
                  {label}{" "}
                  <Typography.Text type="secondary">(counts only)</Typography.Text>
                </Typography.Text>
              );
            }
            return (
              <Link
                href={`/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}/sections/${row.sectionId}`}
              >
                {label}
              </Link>
            );
          },
        },
        {
          title: "Records",
          dataIndex: "recordCount",
          width: 120,
          align: "right",
          sorter: (a, b) => (a.recordCount ?? -1) - (b.recordCount ?? -1),
          render: (count: number | null) => (count == null ? "—" : count),
        },
      ]}
    />
  );
}
