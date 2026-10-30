"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";

import { CopyOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { LIST_PAGE_SIZE } from "@hrms/db/page";
import { App, Button, Input, Pagination, Select, Table, Tooltip, type InputRef } from "antd";
import type { TableProps } from "antd";
import type { ColumnGroupType, ColumnsType, ColumnType } from "antd/es/table";
import type { TablePaginationConfig } from "antd/es/table/interface";
import { useRouter } from "next/navigation";
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
import { pageRowCountLabel, pageSizeChoices } from "@/shared/ui/data-table-page";
import { searchInputValue, serverSearchChanged } from "@/shared/ui/data-table-search";
import { HighlightMatch, SearchQueryProvider } from "@/shared/ui/highlight-match";

export type DataTableProps<RecordType extends object> = TableProps<RecordType> & {
  columnFilter?: boolean;
  onRefresh?: () => void | Promise<void>;
  queryScript: string;
  skipRefresh?: boolean;
  /** Applied server search. Highlighting uses this, not the in-progress keystrokes. */
  searchQuery?: string;
  /**
   * With server pagination (`current` and `total`), the search box calls this
   * instead of hiding rows on the loaded page.
   */
  onSearch?: (query: string) => void;
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

function listRows<RecordType extends object>(
  dataSource: readonly RecordType[] | { rows?: readonly RecordType[] } | null | undefined,
): readonly RecordType[] {
  if (Array.isArray(dataSource)) {
    return dataSource;
  }
  if (
    dataSource != null &&
    typeof dataSource === "object" &&
    "rows" in dataSource &&
    Array.isArray(dataSource.rows)
  ) {
    return dataSource.rows;
  }
  return [];
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
  clientTotal: number,
  shownSize: number,
  onPage: (page: number, pageSize: number) => void,
): TablePaginationConfig | false {
  if (pagination === false) {
    return false;
  }
  const config: TablePaginationConfig = pagination ?? {};
  const pageSize = isServerPaged(pagination)
    ? (config.pageSize ?? LIST_PAGE_SIZE)
    : shownSize;
  return {
    ...config,
    current: isServerPaged(pagination) ? config.current : page,
    pageSize,
    total: isServerPaged(pagination) ? config.total : clientTotal,
    placement: ["none"],
    showSizeChanger: false,
    onChange: (nextPage, nextSize) => {
      const pageToUse = nextSize !== pageSize ? 1 : nextPage;
      onPage(pageToUse, nextSize);
      config.onChange?.(pageToUse, nextSize);
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
  appliedQuery,
  onFilterQueryChange,
}: {
  appliedQuery: string;
  onFilterQueryChange: (query: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState(appliedQuery);
  const inputRef = useRef<InputRef>(null);
  const report = useEffectEvent(onFilterQueryChange);

  useEffect(() => {
    const input = inputRef.current?.input;
    const focused = input != null && document.activeElement === input;
    setQuery((typed) => searchInputValue(typed, appliedQuery, focused));
  }, [appliedQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      report(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <Input
      ref={inputRef}
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
  onSearch,
  queryScript,
  searchQuery = "",
  skipRefresh = false,
  title,
  loading,
  columns,
  dataSource,
  locale,
  onChange,
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
  const propPageSize =
    pagination !== false && pagination != null && typeof pagination.pageSize === "number"
      ? pagination.pageSize
      : LIST_PAGE_SIZE;
  const [shownSize, setShownSize] = useState(propPageSize);
  const [trackedSize, setTrackedSize] = useState(propPageSize);
  if (trackedSize !== propPageSize) {
    setTrackedSize(propPageSize);
    setShownSize(propPageSize);
  }
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);
  const [trackedSource, setTrackedSource] = useState(dataSource);
  if (trackedSource !== dataSource) {
    setTrackedSource(dataSource);
    setFilteredTotal(null);
  }
  const serverPaged = isServerPaged(pagination);
  const serverSearch = onSearch != null;
  const appliedSearch = searchQuery;

  const onFilterQueryChange = (next: string) => {
    if (serverSearch) {
      if (!onSearch) {
        return;
      }
      const changed = serverSearchChanged(next, appliedSearch);
      if (changed == null) {
        return;
      }
      onSearch(changed);
      return;
    }
    startSearchTransition(() => {
      setFilterQuery(next);
      setFilteredTotal(null);
      if (!serverPaged) {
        setPage(1);
      }
    });
  };

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

  const highlightQuery = serverSearch ? appliedSearch : filterQuery;
  const searchActive = highlightQuery.trim() !== "";
  const sourceRows = listRows(dataSource);
  const rowSearchTexts = serverSearch ? [] : buildRowSearchTexts(columns, sourceRows);
  const visibleRows = (() => {
    if (serverSearch || !searchActive) {
      return sourceRows;
    }
    const needle = filterQuery.trim().toLowerCase();
    return sourceRows.filter((_, index) => rowSearchTexts[index]?.includes(needle) === true);
  })();
  const visibleLocale =
    locale?.emptyText != null || !searchActive
      ? locale
      : { ...locale, emptyText: "No rows match." };
  const columnFilteredTotal = trackedSource === dataSource ? filteredTotal : null;
  const clientTotal = columnFilteredTotal ?? visibleRows.length;
  const resolvedPagination = clientPagination(
    pagination,
    page,
    clientTotal,
    shownSize,
    (nextPage, nextSize) => {
      setShownSize(nextSize);
      if (!serverPaged) {
        setPage(nextPage);
      }
    },
  );

  const copyRows = Array.isArray(visibleRows) ? visibleRows : sourceRows;
  const baseColumns = copyColumns(columns, copyRows, columnFilter);
  const highlightedColumns = baseColumns?.map((column) =>
    withSearchHighlight(column, highlightQuery),
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

  function changePage(nextPage: number, nextSize: number): void {
    const pageToUse = nextSize !== shownSize ? 1 : nextPage;
    if (resolvedPagination !== false) {
      resolvedPagination.onChange?.(pageToUse, nextSize);
    }
    onChange?.(
      { current: pageToUse, pageSize: nextSize },
      {},
      {},
      { action: "paginate", currentDataSource: [...visibleRows] },
    );
  }

  return (
    <SearchQueryProvider query={highlightQuery}>
      <div className="flex items-center gap-2">
        <TableSearchInput
          appliedQuery={serverSearch ? appliedSearch : ""}
          onFilterQueryChange={onFilterQueryChange}
        />
        {typeof title === "function" ? (
          <div className="min-w-0 shrink-0">{title(visibleRows)}</div>
        ) : null}
        <div className="flex shrink-0 items-center gap-1">
          <TableSqlButton script={queryScript} />
          <TableCompareButton script={queryScript} />
          <Tooltip title={reloadLabel}>
            {skipRefresh ? <span>{reloadButton}</span> : reloadButton}
          </Tooltip>
        </div>
      </div>
      <Table<RecordType>
        {...tableProps}
        columns={highlightedColumns}
        dataSource={visibleRows}
        loading={refreshing ? true : loading}
        locale={visibleLocale}
        pagination={resolvedPagination}
        styles={{
          ...callerStyles,
          title: {
            ...callerTitleStyles,
            paddingInline: 0,
          },
        }}
        title={
          resolvedPagination === false
            ? undefined
            : (currentPageData) => (
                <PageBar
                  count={currentPageData.length}
                  pagination={resolvedPagination}
                  onChange={changePage}
                />
              )
        }
        onChange={(nextPagination, filters, sorter, extra) => {
          if (!serverPaged && extra.action === "filter") {
            setFilteredTotal(extra.currentDataSource.length);
          }
          onChange?.(nextPagination, filters, sorter, extra);
        }}
      />
    </SearchQueryProvider>
  );
}

function PageBar({
  count,
  pagination,
  onChange,
}: {
  count: number;
  pagination: TablePaginationConfig;
  onChange: (page: number, pageSize: number) => void;
}): React.JSX.Element {
  const pageSize = pagination.pageSize ?? LIST_PAGE_SIZE;
  const total = pagination.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const current = Math.min(pagination.current ?? 1, maxPage);
  const showPager = total > 0 && !(pagination.hideOnSinglePage === true && total <= pageSize);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span>{pageRowCountLabel(count)}</span>
        <Select
          aria-label="Rows per page"
          className="min-w-[7.5rem]"
          options={pageSizeChoices(pageSize).map((size) => ({
            label: `${size} / page`,
            value: size,
          }))}
          size="small"
          value={pageSize}
          onChange={(next: number) => {
            onChange(1, next);
          }}
        />
      </div>
      {showPager ? (
        <Pagination
          current={current}
          pageSize={pageSize}
          showSizeChanger={pagination.showSizeChanger ?? false}
          showTotal={pagination.showTotal}
          total={total}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
