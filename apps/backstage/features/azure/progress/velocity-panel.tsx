"use client";

import { Table } from "antd";
import type { VelocitySeries } from "@/features/azure/progress/aggregate-progress";

function maxCompleted(series: VelocitySeries): number {
  let max = 0;
  for (const cell of series.cells) {
    if (cell.completed > max) {
      max = cell.completed;
    }
  }
  return max;
}

function VelocityBars({ series }: { series: VelocitySeries }): React.JSX.Element {
  if (series.members.length === 0 || series.iterations.length === 0) {
    return <p className="text-slate-500">No completed work items in the recent sprints.</p>;
  }
  const ceiling = Math.max(maxCompleted(series), 1);
  return (
    <div className="flex flex-col gap-4">
      {series.members.map((member) => {
        const counts = series.counts.get(member);
        return (
          <div key={member}>
            <div className="mb-1 text-sm font-medium text-slate-800 dark:text-slate-100">
              {member}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {series.iterations.map((iteration) => {
                const completed = counts?.get(iteration.path) ?? 0;
                const height = Math.max(4, Math.round((completed / ceiling) * 64));
                return (
                  <div className="flex w-16 flex-col items-center gap-1" key={iteration.path}>
                    <span className="text-xs text-slate-500">{completed}</span>
                    <div
                      aria-label={`${member} completed ${completed} in ${iteration.name}`}
                      className="w-full rounded-t bg-blue-500 dark:bg-blue-400"
                      style={{ height }}
                    />
                    <span className="line-clamp-2 text-center text-[10px] leading-tight text-slate-500">
                      {iteration.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VelocityPanel({ series }: { series: VelocitySeries }): React.JSX.Element {
  const columns = [
    {
      title: "Member",
      dataIndex: "member",
      key: "member",
      fixed: "left" as const,
    },
    ...series.iterations.map((iteration) => ({
      title: iteration.name,
      dataIndex: iteration.path,
      key: iteration.path,
      width: 120,
      align: "right" as const,
    })),
  ];

  const dataSource = series.members.map((member) => {
    const row: Record<string, string | number> = { key: member, member };
    const counts = series.counts.get(member);
    for (const iteration of series.iterations) {
      row[iteration.path] = counts?.get(iteration.path) ?? 0;
    }
    return row;
  });

  return (
    <div className="flex flex-col gap-4">
      <VelocityBars series={series} />
      {series.members.length > 0 ? (
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: true }}
          size="small"
        />
      ) : null}
    </div>
  );
}
