"use client";

import { CopyOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { App, Button, Input, Table, Tooltip } from "antd";
import type { TableProps } from "antd";
import type { ColumnGroupType, ColumnsType, ColumnType } from "antd/es/table";
import type { TablePaginationConfig } from "antd/es/table/interface";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  columnCopyText,
  type ColumnDataIndex,
} from "@/shared/ui/column-values";
import {
  buildRowSearchTexts,
  columnCellText,
  matchesColumnFilter,
  shouldApplyDefaultFilter,
} from "@/shared/ui/data-table-filter";
import { runTableRefresh } from "@/shared/ui/data-table-refresh";
import { TableCompareButton } from "@/shared/ui/data-table-compare-button";
import { TableSqlButton } from "@/shared/ui/data-table-sql-button";
import { HighlightMatch, SearchQueryProvider } from "@/shared/ui/highlight-match";

export type DataTableProps<RecordType extends object> = TableProps<RecordType> & {
  columnFilter?: boolean;
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

function withColumnFilter<RecordType extends object>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
): ColumnType<RecordType> | ColumnGroupType<RecordType> {
  if (isColumnGroup(column)) {
    return {
      ...column,
      children: column.children.map((child) => withColumnFilter(child)),
    };
  }
  if (!shouldApplyDefaultFilter(column)) {
    return column;
  }
  const label =
    typeof column.title === "string" && column.title.trim() !== ""
      ? column.title
      : "column";
  return {
    ...column,
    filterOnClose: false,
    filterDropdown: ({ confirm, selectedKeys, setSelectedKeys }) => (
      <ColumnFilterDropdown
        confirm={confirm}
        label={label}
        selectedKeys={selectedKeys}
        setSelectedKeys={setSelectedKeys}
      />
    ),
    onFilter: (value, record) => matchesColumnFilter(columnCellText(column, record), value),
  };
}

function ColumnFilterDropdown({
  confirm,
  label,
  selectedKeys,
  setSelectedKeys,
}: {
  confirm: (param?: { closeDropdown: boolean }) => void;
  label: string;
  selectedKeys: readonly React.Key[];
  setSelectedKeys: (selectedKeys: React.Key[]) => void;
}): React.JSX.Element {
  const value = selectedKeys[0] == null ? "" : String(selectedKeys[0]);
  return (
    <div className="p-2" onKeyDown={(event) => event.stopPropagation()}>
      <Input
        allowClear
        aria-label={`Filter ${label}`}
        placeholder={`Filter ${label}`}
        size="small"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setSelectedKeys(next === "" ? [] : [next]);
          confirm({ closeDropdown: false });
        }}
      />
    </div>
  );
}

function withSearchHighlight<RecordType extends object>(
  column: ColumnType<RecordType> | ColumnGroupType<RecordType>,
  query: string,
): ColumnType<RecordType> | ColumnGroupType<RecordType> {
  if (query.trim() === "") {
    return column;
  }
  if (isColumnGroup(column)) {
    return {
      ...column,
      children: column.children.map((child) => withSearchHighlight(child, query)),
    };
  }
  const originalRender = column.render;
  return {
    ...column,
    render: (value, record, index) => {
      const node =
        typeof originalRender === "function" ? originalRender(value, record, index) : value;
      if (typeof node === "string" || typeof node === "number") {
        return <HighlightMatch query={query} text={String(node)} />;
      }
      return node;
    },
  };
}

function isServerPaged(pagination: TableProps<unknown>["pagination"]): boolean {
  return (
    typeof pagination === "object" &&
    pagination != null &&
    typeof pagination.current === "number" &&
    typeof pagination.total === "number"
  );
}

function clientPagination(
  pagination: TableProps<unknown>["pagination"],
  page: number,
  onPage: (page: number, pageSize: number) => void,
): TableProps<unknown>["pagination"] {
  if (pagination === false || isServerPaged(pagination)) {
    return pagination;
  }
  const config: TablePaginationConfig = pagination ?? {};
  return {
    ...config,
    current: page,
    onChange: (nextPage, nextSize) => {
      onPage(nextPage, nextSize);
      config.onChange?.(nextPage, nextSize);
    },
  };
}

function copyColumns<RecordType extends object>(
  columns: ColumnsType<RecordType> | undefined,
  rows: readonly RecordType[],
  columnFilter: boolean,
): ColumnsType<RecordType> | undefined {
  const filtered = columnFilter ? columns?.map((column) => withColumnFilter(column)) : columns;
  return filtered?.map((column) => withColumnCopy(column, rows));
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

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Owns local input state so keystrokes do not re-render the parent Table.
 * Only the debounced value is reported upward.
 */
function TableSearchInput({
  onFilterQueryChange,
}: {
  onFilterQueryChange: (query: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterQueryChange(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [query, onFilterQueryChange]);

  return (
    <Input
      allowClear
      aria-label="Search table"
      className="min-w-0 flex-1"
      placeholder="Search"
      prefix={<SearchOutlined />}
      value={query}
      onChange={(event) => {
        setQuery(event.target.value);
      }}
    />
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
  columnFilter = true,
  onRefresh,
  queryScript,
  skipRefresh = false,
  title,
  loading,
  columns,
  dataSource,
  locale,
  pagination,
  styles,
  ...tableProps
}: DataTableProps<RecordType>): React.JSX.Element {
  const router = useRouter();
  const [pagePending, startTransition] = useTransition();
  const [, startSearchTransition] = useTransition();
  const [customPending, setCustomPending] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [page, setPage] = useState(1);
  const serverPaged = isServerPaged(pagination);

  const onFilterQueryChange = useCallback(
    (next: string) => {
      startSearchTransition(() => {
        setFilterQuery(next);
        if (!serverPaged) {
          setPage(1);
        }
      });
    },
    [serverPaged],
  );

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

  const searchActive = filterQuery.trim() !== "";
  const sourceRows = Array.isArray(dataSource) ? dataSource : [];
  const rowSearchTexts = useMemo(
    () => buildRowSearchTexts(columns, sourceRows),
    [columns, sourceRows],
  );
  const visibleRows = useMemo(() => {
    if (!searchActive) {
      return dataSource;
    }
    const needle = filterQuery.trim().toLowerCase();
    return sourceRows.filter((_, index) => rowSearchTexts[index]?.includes(needle) === true);
  }, [dataSource, filterQuery, rowSearchTexts, searchActive, sourceRows]);
  const visibleLocale =
    locale?.emptyText != null || !searchActive
      ? locale
      : { ...locale, emptyText: "No rows match." };

  const copyRows = Array.isArray(visibleRows) ? visibleRows : sourceRows;
  const baseColumns = useMemo(
    () => copyColumns(columns, copyRows, columnFilter),
    [columnFilter, columns, copyRows],
  );
  const highlightedColumns = useMemo(
    () => baseColumns?.map((column) => withSearchHighlight(column, filterQuery)),
    [baseColumns, filterQuery],
  );

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

  const callerStyles =
    styles != null && typeof styles === "object" ? styles : undefined;
  const callerTitleStyles =
    callerStyles?.title != null && typeof callerStyles.title === "object"
      ? callerStyles.title
      : undefined;

  return (
    <SearchQueryProvider query={filterQuery}>
      <Table<RecordType>
        {...tableProps}
        columns={highlightedColumns}
        dataSource={visibleRows}
        loading={refreshing ? true : loading}
        locale={visibleLocale}
        pagination={clientPagination(pagination, page, (nextPage) => {
          setPage(nextPage);
        })}
        styles={{
          ...callerStyles,
          title: {
            ...callerTitleStyles,
            paddingInline: 0,
          },
        }}
        title={(currentPageData) => (
          <div className="flex items-center gap-2">
            <TableSearchInput onFilterQueryChange={onFilterQueryChange} />
            {typeof title === "function" ? (
              <div className="min-w-0 shrink-0">{title(currentPageData)}</div>
            ) : null}
            <div className="flex shrink-0 items-center gap-1">
              <TableSqlButton script={queryScript} />
              <TableCompareButton script={queryScript} />
              <Tooltip title={reloadLabel}>
                {skipRefresh ? <span>{reloadButton}</span> : reloadButton}
              </Tooltip>
            </div>
          </div>
        )}
      />
    </SearchQueryProvider>
  );
}
