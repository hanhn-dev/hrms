"use client";

import { Progress, Table } from "antd";
import type { PersonProgress } from "@/features/azure/progress/aggregate-progress";

/** Compact comparison strip — not the place to read WIP titles. */
export function ProgressSummary({
  rows,
}: {
  rows: readonly PersonProgress[];
}): React.JSX.Element {
  if (rows.length === 0) {
    return <p className="m-0 text-sm text-slate-500">No members to compare.</p>;
  }

  return (
    <Table
      columns={[
        {
          title: "Member",
          dataIndex: "displayName",
          key: "displayName",
        },
        {
          title: "Active",
          dataIndex: "active",
          key: "active",
          width: 80,
          align: "right",
        },
        {
          title: "Done",
          dataIndex: "completed",
          key: "completed",
          width: 80,
          align: "right",
        },
        {
          title: "Total",
          dataIndex: "total",
          key: "total",
          width: 80,
          align: "right",
        },
        {
          title: "Progress",
          key: "progress",
          width: 160,
          render: (_value, row: PersonProgress) => (
            <Progress percent={row.progressPercent} size="small" />
          ),
        },
      ]}
      dataSource={rows.map((row) => ({ ...row, key: row.displayName }))}
      pagination={false}
      size="small"
    />
  );
}
