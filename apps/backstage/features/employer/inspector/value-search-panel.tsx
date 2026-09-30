"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Input,
  Progress,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  listSearchTargets,
  searchInspectorTable,
  searchValueExistence,
  type ExistenceTableResult,
  type ExploreSearchMode,
  type InspectorEmployer,
  type SearchTarget,
} from "@/features/employer/inspector/queries";
import { formatDate } from "@/shared/format-date";
import { SearchSelect } from "@/shared/ui";
import { rankTableMatches } from "./rank-table-matches";
import { orderSearchTargets } from "./search-target-order";

const BATCH_SIZE = 20;
const TABLE_OPTION_LIMIT = 50;
const DEFAULT_IGNORE_PATTERNS = ["history", "ssis"];

function scanKeyOf(input: {
  value: string;
  mode: ExploreSearchMode;
  employerId: number | null;
  tables: readonly string[];
  ignore: readonly string[];
}): string {
  return JSON.stringify({
    value: input.value.trim(),
    mode: input.mode,
    employerId: input.employerId,
    tables: [...input.tables].sort(),
    ignore: [...input.ignore].sort(),
  });
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

function withRowKeys(
  rows: ReadonlyArray<Record<string, unknown>>,
): Array<Record<string, unknown> & { __rowKey: string }> {
  return rows.map((row, index) => ({
    ...row,
    __rowKey: String(index),
  }));
}

function normalizeIgnorePatterns(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of values) {
    for (const part of raw.split(",")) {
      const pattern = part.trim().toLowerCase();
      if (pattern === "" || seen.has(pattern)) {
        continue;
      }
      seen.add(pattern);
      next.push(pattern);
    }
  }
  return next;
}

function isIgnoredObject(name: string, patterns: readonly string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }
  const lower = name.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern));
}

function qualifiedTable(target: SearchTarget): string {
  return `${target.schema}.${target.name}`;
}

function inSearchScope(
  target: SearchTarget,
  selectedTables: ReadonlySet<string>,
  patterns: readonly string[],
): boolean {
  if (isIgnoredObject(target.name, patterns)) {
    return false;
  }
  if (selectedTables.size === 0) {
    return true;
  }
  return selectedTables.has(qualifiedTable(target));
}

function scopeTag(result: ExistenceTableResult): React.JSX.Element {
  if (result.employerFiltered) {
    return <Tag color="blue">Employer filtered</Tag>;
  }
  if (result.hasEmployerColumn) {
    return <Tag>Global</Tag>;
  }
  return <Tag>No employer column</Tag>;
}

function HitRows({
  schema,
  name,
  employerId,
  value,
  mode,
}: {
  schema: string;
  name: string;
  employerId: number | null;
  value: string;
  mode: ExploreSearchMode;
}): React.JSX.Element {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void searchInspectorTable({
      schema,
      table: name,
      value,
      mode,
      employerId,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.error) {
          setError(result.error);
          return;
        }
        setRows(result.rows);
        setTruncated(result.truncated);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [schema, name, employerId, value, mode]);

  if (error) {
    return <Alert type="error" showIcon title={error} />;
  }
  if (!rows) {
    return <Typography.Text type="secondary">Loading rows…</Typography.Text>;
  }
  if (rows.length === 0) {
    return (
      <Typography.Text type="secondary">No matching rows.</Typography.Text>
    );
  }

  const keys = Object.keys(rows[0]!);
  return (
    <Space orientation="vertical" className="w-full" size="small">
      <Typography.Text type="secondary">
        {rows.length} matching row{rows.length === 1 ? "" : "s"}
        {truncated ? " (more exist)" : ""}
      </Typography.Text>
      <Table
        size="small"
        pagination={false}
        scroll={{ x: true }}
        rowKey="__rowKey"
        columns={keys.map((key) => ({
          title: key,
          dataIndex: key,
          key,
          ellipsis: true,
          render: (cell: unknown) => cellDisplay(cell),
        }))}
        dataSource={withRowKeys(rows)}
      />
    </Space>
  );
}

export function ValueSearchPanel({
  routeEmployerId,
  employers,
}: {
  routeEmployerId: number;
  employers: InspectorEmployer[];
}): React.JSX.Element {
  const [employerId, setEmployerId] = useState<number | null>(routeEmployerId);
  const [targets, setTargets] = useState<SearchTarget[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>(
    DEFAULT_IGNORE_PATTERNS,
  );
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ExploreSearchMode>("exact");
  const [hits, setHits] = useState<ExistenceTableResult[]>([]);
  const [errors, setErrors] = useState<ExistenceTableResult[]>([]);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [sampleEmployerId, setSampleEmployerId] = useState<number | null>(
    routeEmployerId,
  );
  const [searchedValue, setSearchedValue] = useState("");
  const [searchedMode, setSearchedMode] = useState<ExploreSearchMode>("exact");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [resultQuery, setResultQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [scanKey, setScanKey] = useState<string | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    setEmployerId(routeEmployerId);
  }, [routeEmployerId]);

  useEffect(() => {
    let cancelled = false;
    void listSearchTargets()
      .then((rows) => {
        if (!cancelled) {
          setTargets(rows);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCatalogError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTableSet = useMemo(
    () => new Set(selectedTables),
    [selectedTables],
  );
  const containsNeedsTables =
    mode === "contains" && selectedTables.length === 0;
  const canSearch =
    targets !== null && value.trim() !== "" && !containsNeedsTables && !running;

  const tableOptions = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    const options: Array<{ value: string; label: string }> = [];
    for (const qualified of selectedTables) {
      options.push({ value: qualified, label: qualified });
    }
    if (!targets || query.length === 0) {
      return options;
    }
    const ranked = rankTableMatches(
      targets.filter((target) => !selectedTableSet.has(qualifiedTable(target))),
      query,
      TABLE_OPTION_LIMIT,
    );
    for (const target of ranked) {
      const qualified = qualifiedTable(target);
      options.push({ value: qualified, label: qualified });
    }
    return options;
  }, [selectedTables, selectedTableSet, tableSearch, targets]);

  const visibleHits = useMemo(() => {
    const query = resultQuery.trim().toLowerCase();
    if (query === "") {
      return hits;
    }
    return hits.filter(
      (row) =>
        row.table.toLowerCase().includes(query) ||
        row.matchedColumns.some((column) =>
          column.toLowerCase().includes(query),
        ),
    );
  }, [hits, resultQuery]);

  const plannedCount = useMemo(() => {
    if (!targets) {
      return 0;
    }
    return targets.filter((target) =>
      inSearchScope(target, selectedTableSet, ignorePatterns),
    ).length;
  }, [targets, selectedTableSet, ignorePatterns]);

  function stopSearch(): void {
    runId.current += 1;
    setRunning(false);
    setPaused(true);
  }

  const activeScanKey = scanKeyOf({
    value,
    mode,
    employerId,
    tables: selectedTables,
    ignore: ignorePatterns,
  });
  const resumable =
    paused &&
    !running &&
    scanKey === activeScanKey &&
    scanned > 0 &&
    scanned < total;

  function runSearch(): void {
    if (!targets || value.trim() === "" || containsNeedsTables) {
      return;
    }

    const id = runId.current + 1;
    runId.current = id;
    const trimmed = value.trim();
    const selectedEmployer = employerId;
    const key = scanKeyOf({
      value: trimmed,
      mode,
      employerId: selectedEmployer,
      tables: selectedTables,
      ignore: ignorePatterns,
    });
    const resume = paused && scanKey === key && scanned > 0 && scanned < total;
    const ordered = orderSearchTargets(
      targets.filter((target) =>
        inSearchScope(target, selectedTableSet, ignorePatterns),
      ),
      selectedEmployer !== null,
    );
    const start = resume ? scanned : 0;

    if (!resume) {
      setHits([]);
      setErrors([]);
      setScanned(0);
    }
    setTotal(ordered.length);
    setSampleEmployerId(selectedEmployer);
    setSearchedValue(trimmed);
    setSearchedMode(mode);
    setSearchError(null);
    setScanKey(key);
    setPaused(false);
    setRunning(true);

    void (async () => {
      try {
        for (let index = start; index < ordered.length; index += BATCH_SIZE) {
          if (runId.current !== id) {
            return;
          }
          const batch = ordered
            .slice(index, index + BATCH_SIZE)
            .map((target) => `${target.schema}.${target.name}`);
          const next = await searchValueExistence({
            tables: batch,
            value: trimmed,
            mode,
            employerId: selectedEmployer,
          });
          if (runId.current !== id) {
            return;
          }
          const found = next.filter((row) => row.exists && !row.error);
          const failed = next.filter((row) => row.error);
          if (found.length > 0) {
            setHits((current) => [...current, ...found]);
          }
          if (failed.length > 0) {
            setErrors((current) => [...current, ...failed]);
          }
          setScanned(index + batch.length);
        }
      } catch (err) {
        if (runId.current === id) {
          setSearchError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (runId.current === id) {
          setRunning(false);
        }
      }
    })();
  }

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      {catalogError ? (
        <Alert type="error" showIcon title={catalogError} />
      ) : null}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <Typography.Text strong>Value</Typography.Text>
          <Input
            className="mt-1"
            allowClear
            value={value}
            placeholder="Exact value to find"
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
        <div className="min-w-[240px] flex-1">
          <Typography.Text strong>
            Tables{mode === "contains" ? "" : " (optional)"}
          </Typography.Text>
          <SearchSelect
            mode="multiple"
            allowClear
            className="mt-1 w-full"
            placeholder={
              mode === "contains"
                ? "Search a table and press Enter"
                : "Search tables, press Enter to add"
            }
            value={selectedTables}
            options={tableOptions}
            notFoundContent={
              tableSearch.trim().length === 0
                ? "Type to search tables"
                : "No matching tables"
            }
            showSearch={{
              filterOption: false,
              onSearch: setTableSearch,
            }}
            onChange={(next: string[]) => {
              setSelectedTables(next);
            }}
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <Typography.Text strong>Ignore</Typography.Text>
          <Select
            mode="tags"
            allowClear
            className="mt-1 w-full"
            placeholder="Type a pattern and press Enter"
            value={ignorePatterns}
            tokenSeparators={[","]}
            suffixIcon={null}
            notFoundContent={null}
            open={false}
            onChange={(next: string[]) => {
              setIgnorePatterns(normalizeIgnorePatterns(next));
            }}
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <Typography.Text strong>Employer</Typography.Text>
          <SearchSelect
            allowClear
            optionFilterProp="label"
            className="mt-1 w-full"
            placeholder="All employers"
            value={employerId ?? undefined}
            options={employers.map((employer) => ({
              label: `${employer.employerName} (${employer.employerId})`,
              value: employer.employerId,
            }))}
            onChange={(next: number | undefined) => {
              setEmployerId(next ?? null);
            }}
          />
        </div>
        {running ? (
          <Button onClick={stopSearch}>Stop</Button>
        ) : (
          <Button type="primary" disabled={!canSearch} onClick={runSearch}>
            {resumable ? "Resume" : "Search"}
          </Button>
        )}
      </div>
      <Typography.Text type="secondary">
        {employerId === null
          ? "Searching every employer."
          : `Employer ${employerId} filters tables that have EmployerId. Tables without that column are still searched.`}
        {ignorePatterns.length > 0
          ? ` Ignoring names that contain ${ignorePatterns.join(", ")}.`
          : ""}
        {selectedTables.length > 0
          ? ` Limited to ${selectedTables.length} selected table${selectedTables.length === 1 ? "" : "s"}.`
          : ""}
        {mode === "contains"
          ? " Contains scans string columns and needs at least one table."
          : ""}
        {targets
          ? ` ${plannedCount} table${plannedCount === 1 ? "" : "s"} in scope.`
          : " Loading tables…"}
      </Typography.Text>
      {containsNeedsTables ? (
        <Typography.Text type="warning">
          Contains needs at least one table. Search a name and press Enter.
        </Typography.Text>
      ) : null}
      {searchError ? <Alert type="error" showIcon title={searchError} /> : null}
      {total > 0 ? (
        <Progress
          percent={Math.round((scanned / total) * 100)}
          status={
            running
              ? "active"
              : searchError
                ? "exception"
                : scanned < total
                  ? "normal"
                  : "success"
          }
        />
      ) : null}
      {total > 0 ? (
        <Typography.Text>
          {running
            ? "Searching"
            : paused && scanned < total
              ? "Stopped at"
              : "Scanned"}{" "}
          {scanned} of {total} tables. {hits.length} found.
        </Typography.Text>
      ) : null}
      {total > 0 ? (
        <Input
          allowClear
          placeholder="Filter by table or column"
          value={resultQuery}
          onChange={(event) => {
            setResultQuery(event.target.value);
          }}
        />
      ) : null}
      {errors.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          title={`${errors.length} table${errors.length === 1 ? "" : "s"} could not be searched`}
          description={
            <ul className="m-0 list-disc pl-4">
              {errors.slice(0, 8).map((row) => (
                <li key={row.table}>
                  {row.table}: {row.error}
                </li>
              ))}
            </ul>
          }
        />
      ) : null}
      <Table
        size="small"
        rowKey="table"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        loading={running && hits.length === 0}
        locale={{
          emptyText:
            resultQuery.trim() !== ""
              ? "No tables match this filter."
              : running
                ? "Searching…"
                : "No matching tables yet",
        }}
        columns={[
          {
            title: "Table",
            dataIndex: "table",
            key: "table",
          },
          {
            title: "Columns",
            dataIndex: "matchedColumns",
            key: "matchedColumns",
            ellipsis: true,
            render: (columns: string[]) => columns.join(", "),
          },
          {
            title: "Scope",
            key: "scope",
            render: (_value: unknown, row: ExistenceTableResult) =>
              scopeTag(row),
          },
        ]}
        dataSource={visibleHits}
        expandable={{
          expandedRowRender: (row) => (
            <HitRows
              schema={row.schema}
              name={row.name}
              employerId={sampleEmployerId}
              value={searchedValue}
              mode={searchedMode}
            />
          ),
        }}
      />
    </Space>
  );
}
