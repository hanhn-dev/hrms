"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { DatabaseObjectDetails, DatabaseObjectKind } from "@/features/dbs/queries";
import {
  confirmExecuteProcedure,
  fetchObjectDetails,
  previewExecuteProcedure,
  previewTableRows,
} from "@/features/dbs/queries";
import {
  FK_CHIP_COLOR,
  KIND_COLOR,
  SCHEMA_CHIP_COLOR,
} from "@/features/dbs/kind-style";
import {
  QUERY_RESULT_ROW_KEY,
  withRowKeys,
} from "@/features/dbs/with-row-keys";
import { formatDate } from "@/shared/format-date";

type CanvasObject = {
  id: string;
  schema: string;
  name: string;
  kind: DatabaseObjectKind;
};

type PeekTab =
  | "columns"
  | "rows"
  | "script"
  | "indexes"
  | "triggers"
  | "constraints"
  | "deps";

export type PeekLoadedParts = {
  columns?: boolean;
  script?: boolean;
  deps?: boolean;
};

/** Dedupe identical in-flight detail requests across Strict Mode / remounts. */
const inflightDetailRequests = new Map<
  string,
  Promise<DatabaseObjectDetails>
>();

function fetchObjectDetailsOnce(
  input: Parameters<typeof fetchObjectDetails>[0],
): Promise<DatabaseObjectDetails> {
  const key = [
    input.kind,
    input.schema,
    input.name,
    input.includeRelationships ?? true,
    input.includeDefinition ?? true,
    input.includeDependencies ?? true,
    input.includeDependents ?? false,
    input.includeStructure ?? false,
  ].join("|");
  const existing = inflightDetailRequests.get(key);
  if (existing) {
    return existing;
  }
  const request = fetchObjectDetails(input).finally(() => {
    inflightDetailRequests.delete(key);
  });
  inflightDetailRequests.set(key, request);
  return request;
}

function QualifiedObjectChips({
  objectId,
  kind,
}: {
  objectId: string;
  kind?: DatabaseObjectKind;
}): React.JSX.Element {
  const dot = objectId.indexOf(".");
  const schema = dot === -1 ? "dbo" : objectId.slice(0, dot);
  const name = dot === -1 ? objectId : objectId.slice(dot + 1);
  return (
    <span className="inline-flex items-center gap-0.5">
      <Tag color={SCHEMA_CHIP_COLOR} className="m-0">
        {schema}
      </Tag>
      <Tag color={kind ? KIND_COLOR[kind] : "default"} className="m-0">
        {name}
      </Tag>
    </span>
  );
}

const CONSTRAINT_KIND_LABEL: Record<string, string> = {
  primaryKey: "Primary key",
  unique: "Unique",
  check: "Check",
  foreignKey: "Foreign key",
  default: "Default",
};

function yesNo(value: boolean): string {
  return value ? "YES" : "NO";
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

function hasColumnsOrParams(details: DatabaseObjectDetails | null): boolean {
  if (!details) {
    return false;
  }
  return details.columns.length > 0 || details.parameters.length > 0;
}

function hasScriptPayload(details: DatabaseObjectDetails | null): boolean {
  if (!details) {
    return false;
  }
  return (
    details.definition != null || details.definitionUnavailableReason != null
  );
}

function hasDepsPayload(details: DatabaseObjectDetails | null): boolean {
  if (!details) {
    return false;
  }
  return (
    details.relationships.length > 0 ||
    details.dependencies.length > 0 ||
    details.dependents.length > 0
  );
}

export function ObjectPeek({
  object,
  details,
  loadedParts,
  employerId,
  writesEnabled,
  onClose,
  onDetails,
  onPartLoaded,
  onExpandRelated,
}: {
  object: CanvasObject;
  details: DatabaseObjectDetails | null;
  loadedParts?: PeekLoadedParts;
  employerId: number | null;
  writesEnabled: boolean;
  onClose: () => void;
  onDetails: (details: DatabaseObjectDetails) => void;
  onPartLoaded: (part: keyof PeekLoadedParts) => void;
  onExpandRelated: (obj: CanvasObject) => void;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<PeekTab>("columns");
  const [columnsLoaded, setColumnsLoaded] = useState(
    () => Boolean(loadedParts?.columns) || hasColumnsOrParams(details),
  );
  const [loading, setLoading] = useState(
    () => !(Boolean(loadedParts?.columns) || hasColumnsOrParams(details)),
  );
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [rowsMeta, setRowsMeta] = useState<string | null>(null);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [depsLoading, setDepsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => Boolean(loadedParts?.script) || hasScriptPayload(details),
  );
  const [depsLoaded, setDepsLoaded] = useState(
    () => Boolean(loadedParts?.deps) || hasDepsPayload(details),
  );
  const [pending, startTransition] = useTransition();
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [execPreview, setExecPreview] = useState<string | null>(null);
  const [confirmToken, setConfirmToken] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<string | null>(null);

  const onDetailsRef = useRef(onDetails);
  onDetailsRef.current = onDetails;
  const onPartLoadedRef = useRef(onPartLoaded);
  onPartLoadedRef.current = onPartLoaded;

  const objectKey = `${object.kind}:${object.schema}.${object.name}`;
  // Survives effect cleanup / Strict Mode remounts for this component instance.
  const columnsRequestedRef = useRef(false);
  const scriptRequestedRef = useRef(false);
  const depsRequestedRef = useRef(false);

  useEffect(() => {
    const columnsReady =
      Boolean(loadedParts?.columns) || hasColumnsOrParams(details);
    setActiveTab("columns");
    setColumnsLoaded(columnsReady);
    setLoading(!columnsReady);
    setRows(null);
    setRowsMeta(null);
    setRowsLoaded(false);
    setScriptLoaded(
      Boolean(loadedParts?.script) || hasScriptPayload(details),
    );
    setDepsLoaded(Boolean(loadedParts?.deps) || hasDepsPayload(details));
    setError(null);
    setConfirmToken(null);
    setExecPreview(null);
    setExecResult(null);
    columnsRequestedRef.current = columnsReady;
    scriptRequestedRef.current =
      Boolean(loadedParts?.script) || hasScriptPayload(details);
    depsRequestedRef.current =
      Boolean(loadedParts?.deps) || hasDepsPayload(details);
    // Reset only when the peeked object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional objectKey gate
  }, [objectKey]);

  useEffect(() => {
    if (
      !columnsLoaded &&
      (Boolean(loadedParts?.columns) || hasColumnsOrParams(details))
    ) {
      columnsRequestedRef.current = true;
      setColumnsLoaded(true);
      setLoading(false);
    }
  }, [columnsLoaded, details, loadedParts]);

  useEffect(() => {
    if (columnsLoaded) {
      setLoading(false);
      return;
    }
    if (columnsRequestedRef.current) {
      return;
    }
    columnsRequestedRef.current = true;

    let alive = true;
    setLoading(true);
    setError(null);

    void fetchObjectDetailsOnce({
      schema: object.schema,
      name: object.name,
      kind: object.kind,
      includeRelationships: false,
      includeDefinition: false,
      includeDependencies: false,
      includeDependents: false,
      includeStructure: object.kind === "table" || object.kind === "view",
    })
      .then((next) => {
        // Always commit to parent cache so a remount/cleanup cannot discard the result
        // and retrigger the same request forever.
        onDetailsRef.current(next);
        onPartLoadedRef.current("columns");
        if (alive) {
          setColumnsLoaded(true);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        columnsRequestedRef.current = false;
        if (alive) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [columnsLoaded, object.kind, object.name, object.schema]);

  useEffect(() => {
    if (!details) {
      return;
    }
    const next: Record<string, string> = {};
    for (const param of details.parameters) {
      next[param.name] = "";
    }
    setParamValues(next);
    setConfirmToken(null);
    setExecPreview(null);
    setExecResult(null);
  }, [details?.object.id]);

  const loadRows = useCallback((): void => {
    if (object.kind !== "table" && object.kind !== "view") {
      return;
    }
    startTransition(async () => {
      try {
        const result = await previewTableRows({
          schema: object.schema,
          table: object.name,
          employerId,
          top: 20,
        });
        setRows(result.rows);
        setRowsMeta(
          `${result.rowCount} row${result.rowCount === 1 ? "" : "s"}${
            result.truncated ? " (truncated)" : ""
          }${result.employerFiltered ? " · employer filtered" : ""}`,
        );
        setRowsLoaded(true);
        setError(null);
      } catch (err) {
        setRows(null);
        setRowsLoaded(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }, [employerId, object.kind, object.name, object.schema]);

  useEffect(() => {
    if (activeTab !== "rows") {
      return;
    }
    if (object.kind !== "table" && object.kind !== "view") {
      return;
    }
    if (rowsLoaded) {
      return;
    }
    loadRows();
  }, [activeTab, loadRows, object.kind, rowsLoaded]);

  useEffect(() => {
    if (activeTab !== "script") {
      return;
    }
    if (scriptLoaded || scriptRequestedRef.current) {
      return;
    }
    scriptRequestedRef.current = true;

    let alive = true;
    setScriptLoading(true);
    setError(null);

    void fetchObjectDetailsOnce({
      schema: object.schema,
      name: object.name,
      kind: object.kind,
      includeRelationships: false,
      includeDefinition: true,
      includeDependencies: false,
      includeDependents: false,
    })
      .then((next) => {
        onDetailsRef.current(next);
        onPartLoadedRef.current("script");
        if (alive) {
          setScriptLoaded(true);
          setScriptLoading(false);
        }
      })
      .catch((err: unknown) => {
        scriptRequestedRef.current = false;
        if (alive) {
          setError(err instanceof Error ? err.message : String(err));
          setScriptLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [activeTab, object.kind, object.name, object.schema, scriptLoaded]);

  useEffect(() => {
    if (activeTab !== "deps") {
      return;
    }
    if (depsLoaded || depsRequestedRef.current) {
      return;
    }
    depsRequestedRef.current = true;

    let alive = true;
    setDepsLoading(true);
    setError(null);

    void fetchObjectDetailsOnce({
      schema: object.schema,
      name: object.name,
      kind: object.kind,
      includeRelationships: true,
      includeDefinition: false,
      includeDependencies: true,
      includeDependents: true,
    })
      .then((next) => {
        onDetailsRef.current(next);
        onPartLoadedRef.current("deps");
        if (alive) {
          setDepsLoaded(true);
          setDepsLoading(false);
        }
      })
      .catch((err: unknown) => {
        depsRequestedRef.current = false;
        if (alive) {
          setError(err instanceof Error ? err.message : String(err));
          setDepsLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [activeTab, depsLoaded, object.kind, object.name, object.schema]);

  function runPreviewExec(): void {
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(paramValues)) {
          payload[key.replace(/^@/, "")] = value;
          payload[key] = value;
        }
        const preview = await previewExecuteProcedure({
          schema: object.schema,
          name: object.name,
          payload,
        });
        setConfirmToken(preview.token);
        setExecPreview(
          preview.dryRun.ok
            ? `Dry-run OK. Bound ${preview.dryRun.boundParameters.length} parameter(s). Confirm to execute on ${preview.env}.`
            : preview.dryRun.message ||
                preview.dryRun.error ||
                "Dry-run failed.",
        );
        setExecResult(null);
        setError(null);
      } catch (err) {
        setConfirmToken(null);
        setExecPreview(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  function runConfirmExec(): void {
    if (!confirmToken) {
      return;
    }
    startTransition(async () => {
      try {
        const result = await confirmExecuteProcedure(confirmToken);
        setConfirmToken(null);
        const sets = result.recordsets?.length ?? 0;
        setExecResult(
          result.ok
            ? `Executed. ${sets} result set(s). Return value: ${String(result.returnValue)}`
            : result.message || result.error || "Execution failed.",
        );
        if (result.recordsets?.[0]) {
          setRows([...result.recordsets[0]]);
          setRowsMeta(
            `Procedure result set 1 (${result.recordsets[0].length} rows)`,
          );
          setRowsLoaded(true);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  const columnRows = useMemo(
    () =>
      (details?.columns ?? []).map((col) => ({
        key: col.name,
        name: col.name,
        dataType: col.dataType,
        nullable: col.nullable ? "YES" : "NO",
        primaryKey: Boolean(col.primaryKey),
        foreignKey: Boolean(col.foreignKey),
      })),
    [details],
  );

  const rowColumns = useMemo(() => {
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

  const isRoutine =
    object.kind === "storedProcedure" || object.kind === "function";
  const showStructure = object.kind === "table" || object.kind === "view";

  const indexRows = (details?.indexes ?? []).map((index) => ({
    key: index.name,
    name: index.name,
    type: index.type,
    unique: yesNo(index.unique),
    primaryKey: index.primaryKey,
    columns: index.columns.join(", ") || "—",
    included: index.includedColumns.join(", ") || "—",
  }));
  const triggerRows = (details?.triggers ?? []).map((trigger) => ({
    key: trigger.name,
    name: trigger.name,
    events: trigger.events.join(", ") || "—",
    insteadOf: yesNo(trigger.insteadOf),
    disabled: yesNo(trigger.disabled),
  }));
  const constraintRows = (details?.constraints ?? []).map((constraint) => ({
    key: `${constraint.kind}:${constraint.name}`,
    name: constraint.name,
    kind: CONSTRAINT_KIND_LABEL[constraint.kind] ?? constraint.kind,
    columns: constraint.columns.join(", ") || "—",
    definition: constraint.definition ?? "—",
    referenced: constraint.referencedObjectId ?? "—",
  }));

  return (
    <Drawer
      open
      size={520}
      title={
        <span className="inline-flex min-w-0 flex-wrap items-center gap-1">
          <Tag color={KIND_COLOR[object.kind]} className="m-0">
            {object.kind}
          </Tag>
          <Tag color={SCHEMA_CHIP_COLOR} className="m-0">
            {object.schema}
          </Tag>
          <Tag color={KIND_COLOR[object.kind]} className="m-0">
            {object.name}
          </Tag>
        </span>
      }
      onClose={onClose}
      destroyOnHidden
    >
      <Space orientation="vertical" className="w-full" size="middle">
        {error ? <Alert type="error" showIcon title={error} /> : null}
        {loading ? (
          <Typography.Text type="secondary">Loading…</Typography.Text>
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as PeekTab);
            }}
            items={[
              {
                key: "columns",
                label: isRoutine ? "Parameters" : "Columns",
                children: isRoutine ? (
                  <Space orientation="vertical" className="w-full">
                    {(details?.parameters ?? []).length === 0 ? (
                      <Typography.Text type="secondary">
                        No parameters.
                      </Typography.Text>
                    ) : (
                      <Form layout="vertical">
                        {(details?.parameters ?? []).map((param) => (
                          <Form.Item
                            key={param.name}
                            label={`${param.name} (${param.dataType}, ${param.mode ?? "in"})`}
                          >
                            <Input
                              value={paramValues[param.name] ?? ""}
                              onChange={(event) => {
                                setParamValues((current) => ({
                                  ...current,
                                  [param.name]: event.target.value,
                                }));
                              }}
                            />
                          </Form.Item>
                        ))}
                      </Form>
                    )}
                    {object.kind === "storedProcedure" ? (
                      <Space wrap>
                        <Button
                          type="primary"
                          loading={pending}
                          disabled={!writesEnabled || pending}
                          onClick={runPreviewExec}
                        >
                          Preview execute
                        </Button>
                        <Button
                          danger
                          loading={pending}
                          disabled={!confirmToken || pending}
                          onClick={runConfirmExec}
                        >
                          Confirm execute
                        </Button>
                        {!writesEnabled ? (
                          <Typography.Text type="secondary">
                            Writes disabled for this environment.
                          </Typography.Text>
                        ) : null}
                      </Space>
                    ) : null}
                    {execPreview ? (
                      <Alert type="info" showIcon title={execPreview} />
                    ) : null}
                    {execResult ? (
                      <Alert type="success" showIcon title={execResult} />
                    ) : null}
                  </Space>
                ) : (
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={columnRows}
                    rowClassName={(row) =>
                      row.primaryKey
                        ? "[&>td]:!bg-blue-50"
                        : row.foreignKey
                          ? "[&>td]:!bg-amber-50"
                          : ""
                    }
                    columns={[
                      {
                        title: "Name",
                        dataIndex: "name",
                        key: "name",
                        render: (
                          name: string,
                          row: { primaryKey: boolean; foreignKey: boolean },
                        ) => (
                          <span className="inline-flex flex-wrap items-center gap-1">
                            <span>{name}</span>
                            {row.primaryKey ? (
                              <Tag color={KIND_COLOR.table} className="m-0">
                                PK
                              </Tag>
                            ) : null}
                            {row.foreignKey ? (
                              <Tag color={FK_CHIP_COLOR} className="m-0">
                                FK
                              </Tag>
                            ) : null}
                          </span>
                        ),
                      },
                      {
                        title: "Type",
                        dataIndex: "dataType",
                        key: "dataType",
                      },
                      {
                        title: "Null",
                        dataIndex: "nullable",
                        key: "nullable",
                      },
                    ]}
                  />
                ),
              },
              {
                key: "rows",
                label: "Rows",
                children: (
                  <Space orientation="vertical" className="w-full">
                    {object.kind !== "table" && object.kind !== "view" ? (
                      <Typography.Text type="secondary">
                        Row preview is only available for tables and views.
                      </Typography.Text>
                    ) : (
                      <>
                        <Button loading={pending} onClick={loadRows}>
                          Refresh TOP 20
                        </Button>
                        {pending && !rows ? (
                          <Typography.Text type="secondary">
                            Loading rows…
                          </Typography.Text>
                        ) : null}
                        {rowsMeta ? (
                          <Typography.Text type="secondary">
                            {rowsMeta}
                          </Typography.Text>
                        ) : null}
                        {rows ? (
                          <Table
                            size="small"
                            pagination={false}
                            scroll={{ x: true }}
                            rowKey={QUERY_RESULT_ROW_KEY}
                            columns={rowColumns}
                            dataSource={withRowKeys(rows)}
                          />
                        ) : !pending ? (
                          <Typography.Text type="secondary">
                            No rows loaded yet.
                          </Typography.Text>
                        ) : null}
                      </>
                    )}
                  </Space>
                ),
              },
              {
                key: "script",
                label: "Script",
                children: scriptLoading ? (
                  <Typography.Text type="secondary">Loading…</Typography.Text>
                ) : details?.definition ? (
                  <pre className="max-h-[60vh] overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                    {details.definition}
                  </pre>
                ) : (
                  <Typography.Text type="secondary">
                    {details?.definitionUnavailableReason ??
                      "No definition available."}
                  </Typography.Text>
                ),
              },
              ...(showStructure
                ? [
                    {
                      key: "indexes",
                      label: "Indexes",
                      children:
                        indexRows.length === 0 ? (
                          <Typography.Text type="secondary">None</Typography.Text>
                        ) : (
                          <Table
                            size="small"
                            pagination={false}
                            scroll={{ x: true }}
                            dataSource={indexRows}
                            columns={[
                              { title: "Name", dataIndex: "name", key: "name" },
                              { title: "Type", dataIndex: "type", key: "type" },
                              {
                                title: "Unique",
                                dataIndex: "unique",
                                key: "unique",
                              },
                              {
                                title: "PK",
                                dataIndex: "primaryKey",
                                key: "primaryKey",
                                render: (primaryKey: boolean) => yesNo(primaryKey),
                              },
                              {
                                title: "Columns",
                                dataIndex: "columns",
                                key: "columns",
                              },
                              {
                                title: "Included",
                                dataIndex: "included",
                                key: "included",
                              },
                            ]}
                          />
                        ),
                    },
                    {
                      key: "triggers",
                      label: "Triggers",
                      children:
                        triggerRows.length === 0 ? (
                          <Typography.Text type="secondary">None</Typography.Text>
                        ) : (
                          <Table
                            size="small"
                            pagination={false}
                            scroll={{ x: true }}
                            dataSource={triggerRows}
                            columns={[
                              { title: "Name", dataIndex: "name", key: "name" },
                              {
                                title: "Events",
                                dataIndex: "events",
                                key: "events",
                              },
                              {
                                title: "Instead of",
                                dataIndex: "insteadOf",
                                key: "insteadOf",
                              },
                              {
                                title: "Disabled",
                                dataIndex: "disabled",
                                key: "disabled",
                              },
                            ]}
                          />
                        ),
                    },
                    {
                      key: "constraints",
                      label: "Constraints",
                      children:
                        constraintRows.length === 0 ? (
                          <Typography.Text type="secondary">None</Typography.Text>
                        ) : (
                          <Table
                            size="small"
                            pagination={false}
                            scroll={{ x: true }}
                            dataSource={constraintRows}
                            columns={[
                              { title: "Name", dataIndex: "name", key: "name" },
                              { title: "Kind", dataIndex: "kind", key: "kind" },
                              {
                                title: "Columns",
                                dataIndex: "columns",
                                key: "columns",
                              },
                              {
                                title: "Definition",
                                dataIndex: "definition",
                                key: "definition",
                                ellipsis: true,
                              },
                              {
                                title: "References",
                                dataIndex: "referenced",
                                key: "referenced",
                              },
                            ]}
                          />
                        ),
                    },
                  ]
                : []),
              {
                key: "deps",
                label: "Dependencies",
                children: depsLoading ? (
                  <Typography.Text type="secondary">Loading…</Typography.Text>
                ) : (
                  <Space orientation="vertical" className="w-full">
                    <Typography.Text strong>Depends on</Typography.Text>
                    {(details?.dependencies ?? []).length === 0 ? (
                      <Typography.Text type="secondary">None</Typography.Text>
                    ) : (
                      (details?.dependencies ?? []).map((dep) => (
                        <QualifiedObjectChips
                          key={`d-${dep.objectId}`}
                          objectId={dep.objectId}
                          kind={dep.kind}
                        />
                      ))
                    )}
                    <Typography.Text strong>Dependents</Typography.Text>
                    {(details?.dependents ?? []).length === 0 ? (
                      <Typography.Text type="secondary">None</Typography.Text>
                    ) : (
                      (details?.dependents ?? []).map((dep) => (
                        <QualifiedObjectChips
                          key={`r-${dep.objectId}`}
                          objectId={dep.objectId}
                          kind={dep.kind}
                        />
                      ))
                    )}
                    <Typography.Text strong>Relationships</Typography.Text>
                    {(details?.relationships ?? []).length === 0 ? (
                      <Typography.Text type="secondary">None</Typography.Text>
                    ) : (
                      (details?.relationships ?? []).map((rel) => (
                        <Button
                          key={rel.id}
                          type="link"
                          className="!px-0"
                          onClick={() => {
                            const [schema, name] = rel.to.objectId.includes(".")
                              ? [
                                  rel.to.objectId.slice(
                                    0,
                                    rel.to.objectId.indexOf("."),
                                  ),
                                  rel.to.objectId.slice(
                                    rel.to.objectId.indexOf(".") + 1,
                                  ),
                                ]
                              : ["dbo", rel.to.objectId];
                            onExpandRelated({
                              id: rel.to.objectId,
                              schema,
                              name,
                              kind: "table",
                            });
                          }}
                        >
                          {rel.from.objectId}.{rel.from.column} →{" "}
                          {rel.to.objectId}.{rel.to.column}
                        </Button>
                      ))
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Space>
    </Drawer>
  );
}
