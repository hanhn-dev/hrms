"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FullscreenExitOutlined, FullscreenOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Input, Modal, Segmented, Space, Tag } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import type { DataFixColumnHit, DataFixTableHit } from "@hrms/db";
import { DataFixRows } from "@/features/employer/data-fix/data-fix-rows";
import { searchColumns, searchTables } from "@/features/employer/data-fix/queries";
import { HighlightMatch } from "@/shared/ui";

const SEARCH_DEBOUNCE_MS = 300;
const MODAL_CLOSE_OFFSET = 12;
const MODAL_CLOSE_SIZE = 32;
const MODAL_ACTION_GAP = 4;

type SearchMode = "column" | "table";

type Editor = {
  schema: string;
  table: string;
  hasEmployerColumn: boolean;
};

function columnKey(hit: Pick<DataFixColumnHit, "schema" | "table" | "column">): string {
  return `${hit.schema}.${hit.table}.${hit.column}`;
}

export function DataFixPanel({
  employerId,
  writesEnabled,
}: {
  employerId: number;
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("column");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<DataFixColumnHit[]>([]);
  const [tables, setTables] = useState<DataFixTableHit[]>([]);
  const [columnScript, setColumnScript] = useState("");
  const [tableScript, setTableScript] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setTables([]);
      setColumnScript("");
      setTableScript("");
      setSearchError(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      const request =
        mode === "column"
          ? searchColumns(trimmed).then((found) => {
              if (!cancelled) {
                setHits(found.hits);
                setColumnScript(found.queryScript);
                setTables([]);
              }
            })
          : searchTables(trimmed).then((found) => {
              if (!cancelled) {
                setTables(found.hits);
                setTableScript(found.queryScript);
                setHits([]);
              }
            });
      void request
        .then(() => {
          if (!cancelled) {
            setSearchError(null);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setHits([]);
            setSearchError(error instanceof Error ? error.message : "Column search failed.");
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
  }, [mode, query]);

  async function refreshSearch(): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }
    setSearching(true);
    try {
      if (mode === "column") {
        const found = await searchColumns(trimmed);
        setHits(found.hits);
        setColumnScript(found.queryScript);
        setTables([]);
      } else {
        const found = await searchTables(trimmed);
        setTables(found.hits);
        setTableScript(found.queryScript);
        setHits([]);
      }
      setSearchError(null);
    } catch (error: unknown) {
      setHits([]);
      setTables([]);
      setSearchError(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function closeEditor(): void {
    setEditor(null);
    setExpanded(false);
  }

  function openEditor(hit: { schema: string; table: string; hasEmployerColumn: boolean }): void {
    setEditor({
      schema: hit.schema,
      table: hit.table,
      hasEmployerColumn: hit.hasEmployerColumn,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Find a column or table">
        <Space orientation="vertical" size="middle" className="w-full">
          <Segmented<SearchMode>
            value={mode}
            options={[
              { label: "Column", value: "column" },
              { label: "Table", value: "table" },
            ]}
            onChange={setMode}
          />
          <Input
            allowClear
            placeholder={mode === "column" ? "Column name" : "Table name"}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
          {searchError ? <Alert showIcon type="error" title={searchError} /> : null}
          {mode === "table" ? (
            <DataTable<DataFixTableHit>
              queryScript={tableScript}
              loading={searching}
              onRefresh={refreshSearch}
              locale={{
                emptyText: query.trim().length < 2 ? "Type at least two characters." : "No tables match.",
              }}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
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
                        openEditor(hit);
                      }}
                    >
                      Open
                    </Button>
                  ),
                },
              ]}
            />
          ) : (
          <DataTable<DataFixColumnHit>
            queryScript={columnScript}
            onRefresh={refreshSearch}
            loading={searching}
            locale={{
              emptyText: query.trim().length < 2 ? "Type at least two characters." : "No columns match.",
            }}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            rowKey={columnKey}
            size="small"
            dataSource={hits}
            columns={[
              {
                title: "Schema",
                dataIndex: "schema",
                width: 120,
              },
              {
                title: "Table",
                dataIndex: "table",
              },
              {
                title: "Column",
                dataIndex: "column",
                render: (column: string) => <HighlightMatch query={query} text={column} />,
              },
              {
                title: "Type",
                dataIndex: "typeName",
                width: 140,
              },
              {
                title: "Employer",
                dataIndex: "hasEmployerColumn",
                width: 120,
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
                      openEditor(hit);
                    }}
                  >
                    Open
                  </Button>
                ),
              },
            ]}
          />
          )}
        </Space>
      </Card>
      <Modal
        destroyOnHidden
        footer={null}
        open={editor !== null}
        style={
          expanded
            ? { top: 0, maxWidth: "100vw", margin: 0, paddingBottom: 0 }
            : { top: 24 }
        }
        styles={{ header: { paddingInlineEnd: 72 } }}
        title={
          <>
            {editor ? `${editor.schema}.${editor.table}` : "Table"}
            <Button
              aria-label={expanded ? "Restore width" : "Full width"}
              icon={expanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              type="text"
              style={{
                position: "absolute",
                top: MODAL_CLOSE_OFFSET,
                insetInlineEnd: MODAL_CLOSE_OFFSET + MODAL_CLOSE_SIZE + MODAL_ACTION_GAP,
                zIndex: 20,
                width: MODAL_CLOSE_SIZE,
                height: MODAL_CLOSE_SIZE,
              }}
              onClick={() => {
                setExpanded((current) => !current);
              }}
            />
          </>
        }
        width={expanded ? "100vw" : "min(1440px, calc(100vw - 48px))"}
        onCancel={closeEditor}
      >
        {editor ? (
          <Space orientation="vertical" size="middle" className="w-full">
            {editor.hasEmployerColumn ? <Tag color="green">Employer scoped</Tag> : <Tag>No employer</Tag>}
            <DataFixRows
              employerId={employerId}
              expanded={expanded}
              schema={editor.schema}
              table={editor.table}
              writesEnabled={writesEnabled}
              onCommitted={() => {
                router.refresh();
              }}
            />
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
