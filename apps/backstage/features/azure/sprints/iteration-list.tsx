"use client";

import { useEffect, useRef } from "react";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import type { TeamIteration } from "@hrms/azure-devops";
import { boardHref, sprintHref } from "@/features/azure/sprints/sprint-links";
import { formatDate } from "@/shared/format-date";

const TIME_FRAME_COLORS: Record<string, string> = {
  current: "processing",
  future: "success",
  past: "warning",
};

function dateRangeLabel(start: string | null, finish: string | null): string {
  const startLabel = formatDate(start);
  const finishLabel = formatDate(finish);
  if (startLabel === "—" && finishLabel === "—") {
    return "—";
  }
  return `${startLabel} – ${finishLabel}`;
}

export function IterationList({
  iterations,
  selectedIterationPath,
  filterQuery,
  teamName,
}: {
  iterations: TeamIteration[];
  selectedIterationPath?: string;
  filterQuery?: Record<string, string | undefined>;
  teamName: string;
}): React.JSX.Element {
  const selectedRowRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedIterationPath) {
      return;
    }
    selectedRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIterationPath]);

  const columns: ColumnsType<TeamIteration> = [
    {
      title: "Sprint",
      dataIndex: "name",
      render: (name: string, row) => (
        <span
          className="inline-flex flex-col gap-0.5"
          ref={
            row.path === selectedIterationPath
              ? (node) => {
                  selectedRowRef.current = node;
                }
              : undefined
          }
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            <Link href={sprintHref(row.path, filterQuery)}>{name}</Link>
            {row.path === selectedIterationPath ? (
              <Link
                className="text-sm font-normal text-slate-500 hover:text-slate-900 dark:hover:text-white"
                href={boardHref(row.path, teamName)}
              >
                Open board
              </Link>
            ) : null}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dateRangeLabel(row.startDate, row.finishDate)}
          </span>
        </span>
      ),
    },
    {
      title: "Time frame",
      dataIndex: "timeFrame",
      width: 110,
      render: (timeFrame: TeamIteration["timeFrame"]) =>
        timeFrame ? (
          <Tag color={TIME_FRAME_COLORS[timeFrame] ?? "default"}>{timeFrame}</Tag>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <Table<TeamIteration>
      rowKey="id"
      dataSource={iterations}
      columns={columns}
      pagination={false}
      size="middle"
      scroll={{ x: true }}
      rowClassName={(row) =>
        row.path === selectedIterationPath ? "bg-blue-50 dark:bg-blue-950" : ""
      }
      locale={{ emptyText: "No sprints found for this team and filter set." }}
    />
  );
}
