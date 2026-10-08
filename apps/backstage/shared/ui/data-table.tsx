"use client";

import { CopyOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Button, Table, Tooltip } from "antd";
import type { TableProps } from "antd";
import type { ColumnGroupType, ColumnsType, ColumnType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  columnCopyText,
  type ColumnDataIndex,
} from "@/shared/ui/column-values";
import { runTableRefresh } from "@/shared/ui/data-table-refresh";
import { TableCompareButton } from "@/shared/ui/data-table-compare-button";
import { TableSqlButton } from "@/shared/ui/data-table-sql-button";

export type DataTableProps<RecordType extends object> = TableProps<RecordType> & {
  onRefresh?: () => void | Promise<void>;
  queryScript: string;
  skipRefresh?: boolean;
};

function isColumnGroup<RecordType extends object>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
): column is ColumnGroupType<RecordType> {
  return Array.isArray((column as ColumnGroupType<RecordType>).children);
}

function isColumnDataIndex(value: unknown): value is ColumnDataIndex {
  if (typeof value === "string") {
    return value.length > 0;
  }
  if (typeof value === "number") {
    return true;
  }
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((part) => typeof part === "string" || typeof part === "number")
  );
}

function withColumnCopy<RecordType extends object>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
  rows: readonly RecordType[],
): ColumnType<RecordType> | ColumnGroupType<RecordType> {
  if (isColumnGroup(column)) {
    return {
      ...column,
      children: column.children.map((child) => withColumnCopy(child, rows)),
    };
  }
  if (!isColumnDataIndex(column.dataIndex)) {
    return column;
  }
  const dataIndex = column.dataIndex;
  const label =
    typeof column.title === "string" && column.title.trim() !== ""
      ? column.title
      : "column";
  const originalTitle = column.title;
  return {
    ...column,
    title: (props) => (
      <span className="inline-flex items-center gap-1">
        {typeof originalTitle === "function" ? originalTitle(props) : originalTitle}
        <CopyColumnButton dataIndex={dataIndex} label={label} rows={rows} />
      </span>
    ),
  };
}

function copyColumns<RecordType extends object>(
  columns: ColumnsType<RecordType> | undefined,
  rows: readonly RecordType[],
): ColumnsType<RecordType> | undefined {
  return columns?.map((column) => withColumnCopy(column, rows));
}

function CopyColumnButton<RecordType extends object>({
  dataIndex,
  label,
  rows,
}: {
  dataIndex: ColumnDataIndex;
  label: string;
  rows: readonly RecordType[];
}): React.JSX.Element {
  const { message } = App.useApp();
  const accessibleName = `Copy ${label} values`;

  async function copy(event: React.MouseEvent<HTMLElement>): Promise<void> {
    event.stopPropagation();
    const text = columnCopyText(rows, dataIndex);
    if (text === "") {
      message.info("No values to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success("Copied column values");
    } catch {
      message.error("Could not copy column values.");
    }
  }

  return (
    <Tooltip title={accessibleName}>
      <Button
        aria-label={accessibleName}
        htmlType="button"
        icon={<CopyOutlined />}
        size="small"
        type="text"
        onClick={(event) => {
          void copy(event);
        }}
      />
    </Tooltip>
  );
}

function isPromise(value: unknown): value is Promise<void> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

export function DataTable<RecordType extends object>({
  onRefresh,
  queryScript,
  skipRefresh = false,
  title,
  loading,
  columns,
  dataSource,
  ...tableProps
}: DataTableProps<RecordType>): React.JSX.Element {
  const router = useRouter();
  const [pagePending, startTransition] = useTransition();
  const [customPending, setCustomPending] = useState(false);
  const refreshing = pagePending || customPending;
  const reloadLabel = skipRefresh
    ? "Commit or discard edits before reloading."
    : "Reload from database";

  function refresh(): void {
    runTableRefresh({
      skip: skipRefresh,
      onRefresh: onRefresh
        ? () => {
            setCustomPending(true);
            try {
              const result = onRefresh();
              if (isPromise(result)) {
                void result.finally(() => {
                  setCustomPending(false);
                });
                return;
              }
            } catch (error) {
              setCustomPending(false);
              throw error;
            }
            setCustomPending(false);
          }
        : undefined,
      refreshPage: () => {
        startTransition(() => {
          router.refresh();
        });
      },
    });
  }

  const reloadButton = (
    <Button
      aria-label="Reload from database"
      disabled={skipRefresh}
      htmlType="button"
      icon={<ReloadOutlined />}
      loading={refreshing}
      size="small"
      type="text"
      onClick={refresh}
    />
  );

  return (
    <Table<RecordType>
      {...tableProps}
      columns={copyColumns(columns, Array.isArray(dataSource) ? dataSource : [])}
      dataSource={dataSource}
      loading={refreshing ? true : loading}
      title={(currentPageData) => (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {typeof title === "function" ? title(currentPageData) : null}
          </div>
          <TableSqlButton script={queryScript} />
          <TableCompareButton script={queryScript} />
          <Tooltip title={reloadLabel}>
            {skipRefresh ? <span>{reloadButton}</span> : reloadButton}
          </Tooltip>
        </div>
      )}
    />
  );
}
