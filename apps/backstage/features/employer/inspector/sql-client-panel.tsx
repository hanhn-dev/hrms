"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Space, Tag, Typography } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import { planColumnFilters } from "@hrms/db/data-fix";
import type { DataFixTableHit } from "@hrms/db";
import { DataFixRows } from "@/features/employer/data-fix/data-fix-rows";
import { searchTables } from "@/features/employer/data-fix/queries";
import {
  appliedColumnFilters,
  type SqlClientFilter,
} from "@/features/employer/inspector/sql-client-filters";
import { HighlightMatch, SearchSelect } from "@/shared/ui";

const SEARCH_DEBOUNCE_MS = 300;

type FilterColumn = {
  name: string;
  typeName: string;
};

const EMPTY_DRAFT: SqlClientFilter = { column: "", value: "" };

export function SqlClientPanel({
  employerId,
  writesEnabled,
}: {
  employerId: number;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tables, setTables] = useState<DataFixTableHit[]>([]);
  const [tableScript, setTableScript] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DataFixTableHit | null>(null);
  const [columns, setColumns] = useState<FilterColumn[]>([]);
  const [draft, setDraft] = useState<SqlClientFilter>(EMPTY_DRAFT);
  const [appliedFilters, setAppliedFilters] = useState<SqlClientFilter[]>([]);
  const [editCount, setEditCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setTables([]);
      setTableScript("");
      setSearchError(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchTables(trimmed)
        .then((found) => {
          if (!cancelled) {
            setTables(found.hits);
            setTableScript(found.queryScript);
            setSearchError(null);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setTables([]);
            setTableScript("");
            setSearchError(error instanceof Error ? error.message : "Table search failed.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function refreshSearch(): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    setSearching(true);
    try {
      const found = await searchTables(trimmed);
      setTables(found.hits);
      setTableScript(found.queryScript);
      setSearchError(null);
    } catch (error: unknown) {
      setTables([]);
      setTableScript("");
      setSearchError(error instanceof Error ? error.message : "Table search failed.");
    } finally {
      setSearching(false);
    }
  }

  function openTable(hit: DataFixTableHit): void {
    if (selected?.schema === hit.schema && selected.table === hit.table) {
      return;
    }
    if (editCount > 0) {
      setActionError("Commit or discard edits before opening another table.");
      return;
    }
    setActionError(null);
    setColumns([]);
    setDraft(EMPTY_DRAFT);
    setAppliedFilters([]);
    setSelected(hit);
  }

  function applyFilters(): void {
    if (editCount > 0) {
      setActionError("Commit or discard edits before filtering again.");
      return;
    }
    const next = appliedColumnFilters([...appliedFilters, draft]);
    const plan = planColumnFilters(columns, next);
    if (!plan.ok) {
      setActionError(plan.message);
      return;
    }
    setActionError(null);
    setAppliedFilters(next);
    setDraft({ column: draft.column, value: "" });
  }

  function clearFilters(): void {
    if (editCount > 0) {
      setActionError("Commit or discard edits before filtering again.");
      return;
    }
    setActionError(null);
    setAppliedFilters([]);
    setDraft(EMPTY_DRAFT);
  }

  function removeFilter(column: string): void {
    if (editCount > 0) {
      setActionError("Commit or discard edits before filtering again.");
      return;
    }
    setActionError(null);
    setAppliedFilters((current) =>
      current.filter((filter) => filter.column.toLowerCase() !== column.toLowerCase()),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Find a table">
        <Space orientation="vertical" size="middle" className="w-full">
          <Input
            allowClear
            placeholder="Table name"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
          {searchError ? <Alert showIcon type="error" title={searchError} /> : null}
          <DataTable<DataFixTableHit>
            loading={searching}
            onRefresh={refreshSearch}
            queryScript={tableScript}
            locale={{
              emptyText: query.trim().length < 2 ? "Type at least two characters." : "No tables match.",
            }}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            rowKey={(hit) => `${hit.schema}.${hit.table}`}
            size="small"
            dataSource={tables}
            columns={[
              { title: "Schema", dataIndex: "schema", width: 120 },
              {
                title: "Table",
                dataIndex: "table",
                render: (table: string) => <HighlightMatch query={query} text={table} />,
              },
              {
                title: "Employer",
                dataIndex: "hasEmployerColumn",
                width: 140,
                render: (hasEmployerColumn: boolean) =>
                  hasEmployerColumn ? <Tag color="green">Employer</Tag> : <Tag>No employer</Tag>,
              },
              {
                title: "",
                key: "open",
                width: 90,
                render: (_value, hit) => (
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      openTable(hit);
                    }}
                  >
                    Open
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Card>
      {selected ? (
        <Card title={`${selected.schema}.${selected.table}`}>
          <Space orientation="vertical" size="middle" className="w-full">
            {selected.hasEmployerColumn ? <Tag color="green">Employer scoped</Tag> : <Tag>No employer</Tag>}
            <Space wrap>
              <SearchSelect
                allowClear
                placeholder="Column"
                style={{ minWidth: 220 }}
                value={draft.column || undefined}
                options={columns.map((column) => ({ value: column.name, label: column.name }))}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, column: typeof value === "string" ? value : "" }));
                }}
              />
              <Input
                allowClear
                placeholder="Filter value"
                style={{ width: 220 }}
                value={draft.value}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, value: event.target.value }));
                }}
                onPressEnter={applyFilters}
              />
              <Button disabled={columns.length === 0} onClick={applyFilters}>
                Apply
              </Button>
              <Button disabled={appliedFilters.length === 0 && draft.value.trim() === ""} onClick={clearFilters}>
                Clear
              </Button>
            </Space>
            {appliedFilters.length > 0 ? (
              <Space wrap>
                {appliedFilters.map((filter) => (
                  <Tag
                    key={filter.column}
                    closable
                    onClose={(event) => {
                      event.preventDefault();
                      removeFilter(filter.column);
                    }}
                  >
                    {filter.column}: {filter.value}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">
                Filters apply together. Text contains the value, numbers and bits must match it, and dates use a YYYY-MM-DD prefix.
              </Typography.Text>
            )}
            {actionError ? <Alert showIcon type="error" title={actionError} /> : null}
            <DataFixRows
              key={`${selected.schema}.${selected.table}`}
              columnFilters={appliedFilters}
              employerId={employerId}
              expanded
              newestFirst
              schema={selected.schema}
              table={selected.table}
              writesEnabled={writesEnabled}
              onCommitted={() => {
                router.refresh();
              }}
              onEditsChange={setEditCount}
              onLoaded={(browse) => {
                setColumns(browse.columns.map((column) => ({ name: column.name, typeName: column.typeName })));
              }}
            />
          </Space>
        </Card>
      ) : null}
    </div>
  );
}
