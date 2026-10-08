"use client";

import { useEffect, useMemo, useState } from "react";
import { DiffOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Modal, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  compareTableQuery,
  listTableCompareEnvironments,
} from "@/shared/db/compare-table-query";
import {
  diffQueryRows,
  formatCompareValue,
  isDefaultIgnoredColumn,
  type ComparedStatement,
  type CompareTableQueryResult,
  type QueryDiffRow,
  type QueryDiffStatus,
} from "@/shared/ui/data-table-compare";
import { SearchSelect } from "@/shared/ui/search-select";

const STATUS_COLOR: Record<QueryDiffStatus, string> = {
  "only-left": "red",
  "only-right": "green",
  changed: "gold",
};

function otherEnvironment(
  environments: readonly string[],
  selected: string,
): string | undefined {
  return environments.find((environment) => environment !== selected);
}

function statusLabel(
  status: QueryDiffStatus,
  leftEnv: string,
  rightEnv: string,
): string {
  if (status === "only-left") {
    return `Only in ${leftEnv}`;
  }
  if (status === "only-right") {
    return `Only in ${rightEnv}`;
  }
  return "Changed";
}

function columnNames(statement: ComparedStatement): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of [...statement.leftRows, ...statement.rightRows]) {
    for (const name of Object.keys(row)) {
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function defaultIgnored(statements: readonly ComparedStatement[]): Record<number, string[]> {
  const ignored: Record<number, string[]> = {};
  for (const statement of statements) {
    ignored[statement.index] = columnNames(statement).filter(isDefaultIgnoredColumn);
  }
  return ignored;
}

export function TableCompareButton({
  script,
}: {
  script: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [rightEnv, setRightEnv] = useState<string | undefined>(undefined);
  const [loadingEnvs, setLoadingEnvs] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareTableQueryResult | null>(null);
  const [ignored, setIgnored] = useState<Record<number, string[]>>({});
  const [matched, setMatched] = useState<Record<number, string[]>>({});
  const recorded = script.trim() !== "";

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setLoadingEnvs(true);
    void listTableCompareEnvironments()
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        setEnvironments(loaded.environments);
        setSelected(loaded.selected);
        setRightEnv((current) => {
          if (current && current !== loaded.selected && loaded.environments.includes(current)) {
            return current;
          }
          return otherEnvironment(loaded.environments, loaded.selected);
        });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEnvs(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function runCompare(): Promise<void> {
    if (!rightEnv) {
      return;
    }
    setComparing(true);
    setError(null);
    try {
      const compared = await compareTableQuery({ script, rightEnv });
      setResult(compared);
      setIgnored(defaultIgnored(compared.queries));
      setMatched({});
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setComparing(false);
    }
  }

  return (
    <>
      <Tooltip title="Compare across environments">
        <Button
          aria-label="Compare across environments"
          htmlType="button"
          icon={<DiffOutlined />}
          size="small"
          type="text"
          onClick={() => {
            setOpen(true);
          }}
        />
      </Tooltip>
      <Modal
        cancelText="Close"
        destroyOnHidden
        footer={null}
        open={open}
        title="Compare across environments"
        width={1040}
        onCancel={() => {
          setOpen(false);
          setResult(null);
          setError(null);
        }}
      >
        <div className="flex flex-col gap-3">
          <Typography.Text type="secondary">
            Compares the recorded query on {selected ?? "the current environment"} and another
            environment. On-screen search and column filters are not applied.
          </Typography.Text>
          {recorded ? (
            <div className="flex flex-wrap items-center gap-2">
              <SearchSelect
                className="min-w-40"
                loading={loadingEnvs}
                placeholder="Compare to…"
                value={rightEnv}
                options={environments
                  .filter((environment) => environment !== selected)
                  .map((environment) => ({ label: environment, value: environment }))}
                onChange={(value) => {
                  setRightEnv(value);
                }}
              />
              <Button
                disabled={!rightEnv || rightEnv === selected || comparing}
                loading={comparing}
                type="primary"
                onClick={() => {
                  void runCompare();
                }}
              >
                Compare
              </Button>
            </div>
          ) : (
            <Typography.Text type="secondary">
              No SQL was recorded for this table.
            </Typography.Text>
          )}
          {error ? <Alert showIcon type="error" title={error} /> : null}
          {result
            ? result.queries.map((statement) => (
                <QuerySection
                  ignored={ignored[statement.index] ?? []}
                  key={statement.index}
                  leftEnv={result.leftEnv}
                  matched={matched[statement.index] ?? []}
                  rightEnv={result.rightEnv}
                  showHeading={result.queries.length > 1}
                  statement={statement}
                  onIgnore={(columns) => {
                    setIgnored((current) => ({ ...current, [statement.index]: columns }));
                    setMatched((current) => ({
                      ...current,
                      [statement.index]: (current[statement.index] ?? []).filter(
                        (column) => !columns.includes(column),
                      ),
                    }));
                  }}
                  onMatch={(columns) => {
                    setMatched((current) => ({ ...current, [statement.index]: columns }));
                  }}
                />
              ))
            : null}
        </div>
      </Modal>
    </>
  );
}

function QuerySection({
  statement,
  leftEnv,
  rightEnv,
  ignored,
  matched,
  showHeading,
  onIgnore,
  onMatch,
}: {
  statement: ComparedStatement;
  leftEnv: string;
  rightEnv: string;
  ignored: string[];
  matched: string[];
  showHeading: boolean;
  onIgnore: (columns: string[]) => void;
  onMatch: (columns: string[]) => void;
}): React.JSX.Element {
  const allColumns = useMemo(() => columnNames(statement), [statement]);
  const diff = useMemo(
    () =>
      diffQueryRows(statement.leftRows, statement.rightRows, {
        ignoreColumns: ignored,
        matchColumns: matched,
      }),
    [ignored, matched, statement.leftRows, statement.rightRows],
  );
  const matchOptions = allColumns.filter((column) => !ignored.includes(column));
  const columns: ColumnsType<QueryDiffRow & { key: number }> = [
    {
      title: "Status",
      dataIndex: "status",
      width: 160,
      render: (status: QueryDiffStatus) => (
        <Tag color={STATUS_COLOR[status]}>{statusLabel(status, leftEnv, rightEnv)}</Tag>
      ),
    },
    ...diff.columns.map((column) => ({
      title: column,
      dataIndex: ["values", column],
      render: (_: unknown, row: QueryDiffRow) => {
        const change = row.changes[column];
        if (change) {
          const leftText = formatCompareValue(change.left);
          const rightText = formatCompareValue(change.right);
          return (
            <span
              className="block max-w-xs truncate rounded-sm bg-amber-100 px-1 dark:bg-amber-900/40"
              title={`${leftText} → ${rightText}`}
            >
              {leftText} → {rightText}
            </span>
          );
        }
        const text = formatCompareValue(row.values[column]);
        return (
          <span className="block max-w-xs truncate" title={text}>
            {text}
          </span>
        );
      },
    })),
  ];

  return (
    <section className="flex flex-col gap-2">
      {showHeading ? (
        <Typography.Text strong>Query {statement.index + 1}</Typography.Text>
      ) : null}
      {statement.error ? <Alert showIcon type="error" title={statement.error} /> : null}
      {statement.leftTruncated || statement.rightTruncated ? (
        <Alert
          showIcon
          type="warning"
          title={`Showing the first ${statement.maxRows} rows${
            statement.leftTruncated ? ` from ${leftEnv}` : ""
          }${
            statement.leftTruncated && statement.rightTruncated ? " and" : ""
          }${statement.rightTruncated ? ` from ${rightEnv}` : ""}. The diff may be incomplete.`}
        />
      ) : null}
      {statement.error ? null : (
        <>
          <Typography.Text>
            Only in {leftEnv}: {diff.counts["only-left"]} · Only in {rightEnv}:{" "}
            {diff.counts["only-right"]} · Changed: {diff.counts.changed}
          </Typography.Text>
          {allColumns.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Typography.Text type="secondary">
                Ignore columns. Checked columns are left out of the diff. Id columns start checked.
              </Typography.Text>
              <Checkbox.Group
                className="flex flex-wrap gap-x-3"
                options={allColumns.map((column) => ({ label: column, value: column }))}
                value={ignored}
                onChange={(values) => {
                  onIgnore(values.map(String));
                }}
              />
              <SearchSelect
                allowClear
                className="max-w-xl"
                mode="multiple"
                placeholder="Match rows by (default: the whole remaining row)"
                value={matched}
                options={matchOptions.map((column) => ({ label: column, value: column }))}
                onChange={(value) => {
                  onMatch(value);
                }}
              />
            </div>
          ) : null}
          {diff.rows.length === 0 ? (
            <Typography.Text type="secondary">No differences.</Typography.Text>
          ) : (
            <Table<QueryDiffRow & { key: number }>
              columns={columns}
              dataSource={diff.rows.map((row, index) => ({ ...row, key: index }))}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: "max-content" }}
              size="small"
            />
          )}
        </>
      )}
    </section>
  );
}
