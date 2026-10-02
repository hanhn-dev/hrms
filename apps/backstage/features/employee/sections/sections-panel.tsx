"use client";

import { Typography } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import { isCrudSectionId } from "@hrms/db/sections-registry";
import type { EmployeeSectionCount } from "@/features/employee/sections/queries";
import { EntityLink } from "@/shared/entity-link";

export function SectionsPanel({
  employerId,
  employmentNumber,
  rows,
  queryScript,
}: {
  employerId: number;
  employmentNumber: string;
  rows: EmployeeSectionCount[];
  queryScript: string;
}): React.JSX.Element {
  return (
    <DataTable
      queryScript={queryScript}
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
              <EntityLink
                employerId={employerId}
                entity={{
                  kind: "employeeSection",
                  employmentNumber,
                  sectionId: row.sectionId,
                }}
              >
                {label}
              </EntityLink>
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
