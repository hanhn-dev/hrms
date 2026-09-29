"use client";

import { Table } from "antd";
import type { EmployeeSectionCount } from "@/features/employee/sections/queries";

export function SectionsPanel({
  rows,
}: {
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
        },
        {
          title: "Records",
          dataIndex: "recordCount",
          width: 120,
          align: "right",
          sorter: (a, b) => a.recordCount - b.recordCount,
        },
      ]}
    />
  );
}
