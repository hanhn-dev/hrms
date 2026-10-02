"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button, Table, Tooltip } from "antd";
import type { TableProps } from "antd";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { runTableRefresh } from "@/shared/ui/data-table-refresh";
import { TableSqlButton } from "@/shared/ui/data-table-sql-button";

export type DataTableProps<RecordType extends object> = TableProps<RecordType> & {
  onRefresh?: () => void | Promise<void>;
  queryScript: string;
  skipRefresh?: boolean;
};

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
      loading={refreshing ? true : loading}
      title={(currentPageData) => (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {typeof title === "function" ? title(currentPageData) : null}
          </div>
          <TableSqlButton script={queryScript} />
          <Tooltip title={reloadLabel}>
            {skipRefresh ? <span>{reloadButton}</span> : reloadButton}
          </Tooltip>
        </div>
      )}
    />
  );
}
