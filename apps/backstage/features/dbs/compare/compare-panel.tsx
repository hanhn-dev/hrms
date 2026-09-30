"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { createTwoFilesPatch } from "diff";
import {
  compareEnvironments,
  type ObjectCompareRow,
  type ObjectCompareStatus,
} from "@/features/dbs/queries";
import { getCompareEnvironments } from "@/features/dbs/compare/env-list";

const STATUS_COLOR: Record<ObjectCompareStatus, string> = {
  unchanged: "default",
  modified: "gold",
  added: "green",
  removed: "red",
  unknown: "blue",
};

export function ComparePanel({
  onClose,
}: {
  onClose: () => void;
}): React.JSX.Element {
  const [environments, setEnvironments] = useState<string[]>([]);
  const [rightEnv, setRightEnv] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ObjectCompareRow[] | null>(null);
  const [leftEnv, setLeftEnv] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<
    ObjectCompareStatus,
    number
  > | null>(null);
  const [selected, setSelected] = useState<ObjectCompareRow | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void getCompareEnvironments()
      .then((envs) => {
        if (!cancelled) {
          setEnvironments(envs);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useMemo(() => {
    if (!selected || !leftEnv || !rightEnv) {
      return null;
    }
    const left = selected.leftDefinition ?? "";
    const right = selected.rightDefinition ?? "";
    return createTwoFilesPatch(
      `${leftEnv}/${selected.schema}.${selected.name}`,
      `${rightEnv}/${selected.schema}.${selected.name}`,
      left,
      right,
      undefined,
      undefined,
      { context: 4 },
    );
  }, [selected, leftEnv, rightEnv]);

  function runCompare(): void {
    if (!rightEnv) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await compareEnvironments({
          rightEnv,
          q: q.trim() || undefined,
        });
        setLeftEnv(result.leftEnv);
        setRows(result.rows);
        setSummary(result.summary);
        setSelected(null);
        setError(null);
      } catch (err) {
        setRows(null);
        setSummary(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="absolute inset-4 z-20 overflow-auto rounded-lg bg-white p-4 shadow-lg ring-1 ring-slate-200">
      <Space orientation="vertical" className="w-full" size="middle">
        <div className="flex items-center justify-between gap-2">
          <Typography.Title level={4} className="!mb-0">
            Compare environments
          </Typography.Title>
          <Button onClick={onClose}>Close</Button>
        </div>
        <Alert
          type="info"
          showIcon
          title="Left side is the currently selected environment. Definitions are fetched for up to 80 filtered objects."
        />
        <Space wrap>
          <Select
            className="w-40"
            placeholder="Compare to…"
            value={rightEnv}
            options={environments.map((env) => ({ label: env, value: env }))}
            onChange={setRightEnv}
          />
          <Input
            className="w-56"
            allowClear
            placeholder="Filter name (optional)"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
            }}
          />
          <Button
            type="primary"
            loading={pending}
            disabled={!rightEnv || pending}
            onClick={runCompare}
          >
            Compare
          </Button>
        </Space>
        {error ? <Alert type="error" showIcon title={error} /> : null}
        {summary && leftEnv && rightEnv ? (
          <Space wrap>
            <Tag>
              {leftEnv} ↔ {rightEnv}
            </Tag>
            {(Object.keys(summary) as ObjectCompareStatus[]).map((status) => (
              <Tag key={status} color={STATUS_COLOR[status]}>
                {status}: {summary[status]}
              </Tag>
            ))}
          </Space>
        ) : null}
        {rows ? (
          <Table
            size="small"
            rowKey="id"
            pagination={{ pageSize: 25 }}
            dataSource={rows.filter((row) => row.status !== "unchanged")}
            onRow={(record) => ({
              onClick: () => {
                setSelected(record);
              },
            })}
            columns={[
              {
                title: "Object",
                key: "object",
                render: (_: unknown, row: ObjectCompareRow) =>
                  `${row.schema}.${row.name}`,
              },
              { title: "Kind", dataIndex: "kind", key: "kind" },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (status: ObjectCompareStatus) => (
                  <Tag color={STATUS_COLOR[status]}>{status}</Tag>
                ),
              },
            ]}
          />
        ) : null}
        {selected && patch ? (
          <Card
            size="small"
            title={`${selected.schema}.${selected.name} (${selected.status})`}
          >
            <pre className="max-h-[40vh] overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {patch}
            </pre>
          </Card>
        ) : null}
      </Space>
    </div>
  );
}
