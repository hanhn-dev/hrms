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
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  listTables,
  searchValueInTables,
  type ExploreSearchMode,
  type ExploreSearchTableResult,
  type ExploreTable,
} from "@/features/employer/explore/queries";
import { formatDate } from "@/shared/format-date";

const MAX_TABLES = 10;
const TABLE_SEARCH_DEBOUNCE_MS = 300;
const MIN_TABLE_SEARCH_LENGTH = 2;
const SCHEMA_CHIP_COLOR = "geekblue";
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
  const { schema, name } = parseQualified(qualified);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      <Tag color={SCHEMA_CHIP_COLOR} className="m-0">
        {schema}
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
        {name}
      </Tag>
    </span>
  );
}

function ResultTable({
  result,
}: {
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
      <Table
        size="small"
        pagination={false}
        scroll={{ x: true }}
        rowKey={(_, index) => String(index)}
        columns={columns}
        dataSource={result.rows}
      />
    </Space>
  );
}

export function ExplorePanel({
  employerId,
}: {
  employerId: number;
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
  const [filterByEmployer, setFilterByEmployer] = useState(true);
  const [results, setResults] = useState<ExploreSearchTableResult[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
          employerId: filterByEmployer ? employerId : null,
        });
        setResults(next);
      } catch (err) {
        setResults(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      <Card title="Search">
        <Space orientation="vertical" className="w-full" size="middle">
          <div>
            <Typography.Text strong>Tables</Typography.Text>
            <Typography.Paragraph type="secondary" className="!mb-2">
              Type at least {MIN_TABLE_SEARCH_LENGTH} characters to find tables.
              Schema and object name show as separate chips (up to {MAX_TABLES}
              ).
            </Typography.Paragraph>
            <Select
              mode="multiple"
              allowClear
              showSearch
              filterOption={false}
              className="w-full"
              placeholder="Type to search tables (e.g. TEmployee or dbo.TEmp)"
              maxCount={MAX_TABLES}
              value={selectedTables}
              options={selectOptions}
              loading={tablesLoading}
              searchValue={tableSearch}
              onSearch={setTableSearch}
              notFoundContent={
                tablesLoading
                  ? "Searching…"
                  : debouncedTableSearch.length < MIN_TABLE_SEARCH_LENGTH
                    ? `Type at least ${MIN_TABLE_SEARCH_LENGTH} characters`
                    : "No tables match"
              }
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
              onOpenChange={(open) => {
                if (!open) {
                  setTableSearch("");
                }
              }}
            />
            {selectedTables.length > 0 ? (
              <Typography.Paragraph type="secondary" className="!mt-2 !mb-0">
                {selectedTables.length} / {MAX_TABLES} selected
              </Typography.Paragraph>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[240px] flex-1">
              <Typography.Text strong>Value</Typography.Text>
              <Input
                className="mt-1"
                allowClear
                placeholder="Employment number, ID, DisplayText, …"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                }}
                onPressEnter={() => {
                  runSearch();
                }}
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
                  checked={filterByEmployer}
                  onChange={setFilterByEmployer}
                />
                <Typography.Text type="secondary">
                  {filterByEmployer
                    ? `Employer ${employerId}`
                    : "Global (all employers)"}
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
        <Card title="Results">
          {results.length === 0 ? (
            <Typography.Text type="secondary">No results.</Typography.Text>
          ) : (
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
                children: <ResultTable result={result} />,
              }))}
            />
          )}
        </Card>
      ) : null}
    </Space>
  );
}
