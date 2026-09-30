"use client";

import { useMemo, useState, useTransition } from "react";
import { Alert, Button, Card, Input, Space, Table, Typography } from "antd";
import { runSelect } from "@/features/dbs/queries";
import {
  QUERY_RESULT_ROW_KEY,
  withRowKeys,
} from "@/features/dbs/with-row-keys";
import { formatDate } from "@/shared/format-date";

function cellDisplay(value: unknown): string {
  if (value == null) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return formatDate(value);
    }
    return value;
  }
  return String(value);
}

export function SqlRunnerPanel({
  onClose,
}: {
  onClose: () => void;
}): React.JSX.Element {
  const [sql, setSql] = useState("SELECT TOP 20 * FROM dbo.TEmployerDetails");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [meta, setMeta] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const columns = useMemo(() => {
    if (!rows || rows.length === 0) {
      return [];
    }
    return Object.keys(rows[0]!).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (value: unknown) => cellDisplay(value),
    }));
  }, [rows]);

  function run(): void {
    startTransition(async () => {
      try {
        const result = await runSelect({ sql, maxRows: 200 });
        setRows(result.rows);
        setMeta(
          `${result.rowCount} row${result.rowCount === 1 ? "" : "s"} (max ${result.maxRows})${
            result.truncated ? " · truncated" : ""
          }`,
        );
        setError(null);
      } catch (err) {
        setRows(null);
        setMeta(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="absolute inset-4 z-20 overflow-auto rounded-lg bg-white p-4 shadow-lg ring-1 ring-slate-200">
      <Space orientation="vertical" className="w-full" size="middle">
        <div className="flex items-center justify-between gap-2">
          <Typography.Title level={4} className="!mb-0">
            Run SQL (SELECT only)
          </Typography.Title>
          <Button onClick={onClose}>Close</Button>
        </div>
        <Alert
          type="info"
          showIcon
          title="Only a single SELECT or WITH…SELECT is allowed. No DML, DDL, or EXEC."
        />
        <Input.TextArea
          rows={8}
          value={sql}
          onChange={(event) => {
            setSql(event.target.value);
          }}
          className="font-mono text-sm"
        />
        <Button type="primary" loading={pending} onClick={run}>
          Run
        </Button>
        {error ? <Alert type="error" showIcon title={error} /> : null}
        {meta ? <Typography.Text type="secondary">{meta}</Typography.Text> : null}
        {rows ? (
          <Card size="small">
            <Table
              size="small"
              pagination={false}
              scroll={{ x: true, y: 360 }}
              rowKey={QUERY_RESULT_ROW_KEY}
              columns={columns}
              dataSource={withRowKeys(rows)}
            />
          </Card>
        ) : null}
      </Space>
    </div>
  );
}
