"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Input,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { DataTable } from "@/shared/ui/data-table";
import {
  listTables,
  searchValueInTables,
  type ExploreSearchMode,
  type ExploreSearchTableResult,
  type ExploreTable,
} from "@/features/dbs/queries";
import { SCHEMA_CHIP_COLOR } from "@/features/dbs/kind-style";
import {
  QUERY_RESULT_ROW_KEY,
  withRowKeys,
} from "@/features/dbs/with-row-keys";
import { formatDate } from "@/shared/format-date";
import { HighlightMatch, SearchSelect, useSearchQuery } from "@/shared/ui";

const MAX_TABLES = 10;
const TABLE_SEARCH_DEBOUNCE_MS = 300;
const MIN_TABLE_SEARCH_LENGTH = 2;
const OBJECT_CHIP_COLOR = "green";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);
  return debounced;
}

function parseQualified(qualified: string): { schema: string; name: string } {
  const dot = qualified.indexOf(".");
  if (dot === -1) {
    return { schema: "dbo", name: qualified };
  }
  return {
    schema: qualified.slice(0, dot),
    name: qualified.slice(dot + 1),
  };
}

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

function QualifiedTableChips({
  qualified,
  closable,
  onClose,
}: {
  qualified: string;
  closable?: boolean;
  onClose?: (event: React.MouseEvent | React.KeyboardEvent) => void;
}): React.JSX.Element {
  const query = useSearchQuery();
  const { schema, name } = parseQualified(qualified);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      <Tag color={SCHEMA_CHIP_COLOR} className="m-0">
        <HighlightMatch query={query} text={schema} />
      </Tag>
      <Typography.Text type="secondary" className="text-xs">
        .
      </Typography.Text>
      <Tag
        color={OBJECT_CHIP_COLOR}
        className="m-0"
        closable={closable}
        onClose={onClose}
      >
        <HighlightMatch query={query} text={name} />
      </Tag>
    </span>
  );
}

function ResultTable({
  onRefresh,
  result,
}: {
  onRefresh: () => void;
  result: ExploreSearchTableResult;
}): React.JSX.Element {
  const columns = useMemo(() => {
    if (result.rows.length === 0) {
      return [];
    }
    const keys = Object.keys(result.rows[0]!);
    return keys.map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (value: unknown) => cellDisplay(value),
    }));
  }, [result.rows]);

  if (result.error && result.rows.length === 0) {
    return <Alert type="error" showIcon title={result.error} />;
  }

  if (!result.exists) {
    return (
      <Typography.Text type="secondary">
        No matching rows
        {result.error ? ` — ${result.error}` : ""}.
      </Typography.Text>
    );
  }

  return (
    <Space orientation="vertical" className="w-full" size="small">
      <Space wrap size="small">
        <Typography.Text type="secondary">
          {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
          {result.truncated ? " (truncated)" : ""}
        </Typography.Text>
        {result.matchedColumns.length > 0 ? (
          <Typography.Text type="secondary">
            Searched columns: {result.matchedColumns.join(", ")}
          </Typography.Text>
        ) : null}
        {result.employerFiltered ? (
          <Tag color="blue">Employer filtered</Tag>
        ) : result.hasEmployerColumn ? (
          <Tag>Global (employer column ignored)</Tag>
        ) : (
          <Tag>No employer column</Tag>
        )}
      </Space>
      <DataTable
        onRefresh={onRefresh}
        queryScript={result.queryScript ?? ""}
        size="small"
        pagination={false}
        scroll={{ x: true }}
        rowKey={QUERY_RESULT_ROW_KEY}
        columns={columns}
        dataSource={withRowKeys(result.rows)}
      />
    </Space>
  );
}

export function ValueSearchPanel({
  employerId,
  onClose,
}: {
  employerId: number | null;
  onClose: () => void;
}): React.JSX.Element {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const debouncedTableSearch = useDebouncedValue(
    tableSearch.trim(),
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const [tableOptions, setTableOptions] = useState<ExploreTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ExploreSearchMode>("exact");
  const [filterByEmployer, setFilterByEmployer] = useState(employerId !== null);
  const [results, setResults] = useState<ExploreSearchTableResult[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFilterByEmployer(employerId !== null);
  }, [employerId]);

  useEffect(() => {
    if (debouncedTableSearch.length < MIN_TABLE_SEARCH_LENGTH) {
      setTableOptions([]);
      setTablesLoading(false);
      return;
    }

    let cancelled = false;
    setTablesLoading(true);
    void listTables(debouncedTableSearch)
      .then((rows) => {
        if (!cancelled) {
          setTableOptions(rows);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTableOptions([]);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTablesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedTableSearch]);

  const selectOptions = useMemo(() => {
    const byKey = new Map<string, ExploreTable>();
    for (const table of tableOptions) {
      byKey.set(`${table.schema}.${table.name}`, table);
    }
    for (const qualified of selectedTables) {
      if (!byKey.has(qualified)) {
        const parsed = parseQualified(qualified);
        byKey.set(qualified, parsed);
      }
    }
    return [...byKey.entries()].map(([qualified, table]) => ({
      value: qualified,
      label: qualified,
      schema: table.schema,
      name: table.name,
    }));
  }, [tableOptions, selectedTables]);

  const canSearch =
    selectedTables.length > 0 &&
    selectedTables.length <= MAX_TABLES &&
    value.trim() !== "";

  function runSearch(): void {
    if (!canSearch) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const next = await searchValueInTables({
          tables: selectedTables,
          value: value.trim(),
          mode,
          employerId: filterByEmployer && employerId !== null ? employerId : null,
        });
        setResults(next);
      } catch (err) {
        setResults(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="absolute inset-4 z-20 overflow-auto rounded-lg bg-white p-4 shadow-lg ring-1 ring-slate-200">
      <Space orientation="vertical" className="w-full" size="middle">
        <div className="flex items-center justify-between gap-2">
          <Typography.Title level={4} className="!mb-0">
            Value search
          </Typography.Title>
          <Button onClick={onClose}>Close</Button>
        </div>
        <Card size="small" title="Search">
          <Space orientation="vertical" className="w-full" size="middle">
            <div>
              <Typography.Text strong>Tables</Typography.Text>
              <SearchSelect
                mode="multiple"
                allowClear
                filterOption={false}
                className="mt-1 w-full"
                placeholder="Type to search tables"
                maxCount={MAX_TABLES}
                value={selectedTables}
                options={selectOptions}
                loading={tablesLoading}
                searchValue={tableSearch}
                onSearch={setTableSearch}
                tagRender={(props) => (
                  <QualifiedTableChips
                    qualified={String(props.value)}
                    closable={props.closable}
                    onClose={(event) => {
                      event.preventDefault();
                      props.onClose();
                    }}
                  />
                )}
                optionRender={(option) => (
                  <QualifiedTableChips qualified={String(option.value ?? "")} />
                )}
                onChange={(next: string[]) => {
                  setSelectedTables(next);
                }}
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[240px] flex-1">
                <Typography.Text strong>Value</Typography.Text>
                <Input
                  className="mt-1"
                  allowClear
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                  }}
                  onPressEnter={runSearch}
                />
              </div>
              <div>
                <Typography.Text strong>Match</Typography.Text>
                <div className="mt-1">
                  <Segmented
                    value={mode}
                    onChange={(next) => {
                      setMode(next as ExploreSearchMode);
                    }}
                    options={[
                      { label: "Exact", value: "exact" },
                      { label: "Contains", value: "contains" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <Typography.Text strong>Employer filter</Typography.Text>
                <div className="mt-1 flex items-center gap-2">
                  <Switch
                    checked={filterByEmployer && employerId !== null}
                    disabled={employerId === null}
                    onChange={setFilterByEmployer}
                  />
                  <Typography.Text type="secondary">
                    {employerId === null
                      ? "Pick an employer in the header"
                      : filterByEmployer
                        ? `Employer ${employerId}`
                        : "Global"}
                  </Typography.Text>
                </div>
              </div>
              <Button
                type="primary"
                loading={pending}
                disabled={!canSearch || pending}
                onClick={runSearch}
              >
                Search
              </Button>
            </div>
          </Space>
        </Card>
        {error ? <Alert type="error" showIcon title={error} /> : null}
        {results ? (
          <Card size="small" title="Results">
            <Collapse
              items={results.map((result) => ({
                key: result.table,
                label: (
                  <Space wrap>
                    <QualifiedTableChips qualified={result.table} />
                    {result.error && result.rows.length === 0 ? (
                      <Badge status="error" text="Error" />
                    ) : result.exists ? (
                      <Badge status="success" text="Exists" />
                    ) : (
                      <Badge status="default" text="Not found" />
                    )}
                  </Space>
                ),
                children: <ResultTable onRefresh={runSearch} result={result} />,
              }))}
            />
          </Card>
        ) : null}
      </Space>
    </div>
  );
}
