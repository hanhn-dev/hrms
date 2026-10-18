"use client";

import { useEffect, useState, useTransition } from "react";
import { CopyOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { KIND_COLOR, KIND_LABEL } from "@/features/dbs/kind-style";
import {
  confirmExecuteProcedure,
  executeFunction,
  fetchObjectDetails,
  previewExecuteProcedure,
  previewTableRows,
  type DatabaseObjectDetails,
} from "@/features/dbs/queries";
import {
  QUERY_RESULT_ROW_KEY,
  withRowKeys,
} from "@/features/dbs/with-row-keys";
import { ExecutionPlanDiagrams } from "@/features/employer/inspector/query-plan-view";
import { formatExecScript } from "@/features/employer/inspector/script-exec-text";
import type { UsedObject } from "@/features/employer/inspector/script-used-objects";
import { formatDate } from "@/shared/format-date";

type RoutineParameter = DatabaseObjectDetails["parameters"][number];

type ResultSet = {
  title: string;
  rows: Record<string, unknown>[];
};

type ExecOutcome = {
  summary: string;
  sets: ResultSet[];
  plans: readonly string[] | null;
  planWarning: string | null;
};

const PREVIEW_ROWS = 20;

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

function ParameterFields({
  schema,
  name,
  parameters,
  values,
  onChange,
}: {
  schema: string;
  name: string;
  parameters: readonly RoutineParameter[];
  values: Readonly<Record<string, string>>;
  onChange: (name: string, value: string) => void;
}): React.JSX.Element {
  const { message } = App.useApp();

  async function copyScript(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        formatExecScript(schema, name, parameters, values),
      );
      message.success("Script copied.");
    } catch {
      message.error("Could not copy the script.");
    }
  }

  return (
    <div className="relative">
      <div className="absolute right-1 top-1 z-10">
        <Tooltip title="Copy script">
          <Button
            aria-label="Copy script"
            htmlType="button"
            icon={<CopyOutlined />}
            size="small"
            type="text"
            onClick={() => {
              void copyScript();
            }}
          />
        </Tooltip>
      </div>
      <div className="grid grid-cols-[auto_11rem_minmax(8rem,1fr)_auto] items-center gap-x-2 overflow-auto rounded bg-slate-50 py-3 pl-3 pr-8 font-mono text-xs leading-6 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="col-span-4">
          <span className="font-semibold text-blue-700 dark:text-blue-300">EXEC</span>
          {" "}
          {schema}.{name}
        </div>
        {parameters.map((param, index) => {
          const output = param.mode === "out" || param.mode === "inout";
          const last = index === parameters.length - 1;
          return (
            <label className="contents" key={param.name}>
              <span className="pl-6">{param.name}</span>
              <span className="truncate text-slate-400">{param.dataType}</span>
              <span className="flex min-w-0 items-center border-b border-slate-200 dark:border-slate-700">
                <span className="shrink-0">=</span>
                <Input
                  className="font-mono text-xs"
                  size="small"
                  value={values[param.name] ?? ""}
                  variant="borderless"
                  onChange={(event) => {
                    onChange(param.name, event.target.value);
                  }}
                />
              </span>
              <span className="text-slate-500">
                {output ? "OUTPUT" : null}
                {last ? null : ","}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function rowSummary(rowCount: number, truncated: boolean): string {
  const noun = rowCount === 1 ? "row" : "rows";
  return `${rowCount} ${noun}${truncated ? " (truncated)" : ""}`;
}

function ResultGrid({ rows }: { rows: Record<string, unknown>[] }): React.JSX.Element {
  if (rows.length === 0) {
    return <Typography.Text type="secondary">No rows.</Typography.Text>;
  }
  const keyed = withRowKeys(rows);
  const columns = Object.keys(rows[0] ?? {})
    .filter((key) => key !== QUERY_RESULT_ROW_KEY)
    .map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (value: unknown) => cellDisplay(value),
    }));
  return (
    <Table
      columns={columns}
      dataSource={keyed}
      pagination={false}
      rowKey={QUERY_RESULT_ROW_KEY}
      scroll={{ x: true }}
      size="small"
    />
  );
}

export function ScriptExecuteModal({
  object,
  writesEnabled,
  onClose,
}: {
  object: UsedObject | null;
  writesEnabled: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [parametersLoaded, setParametersLoaded] = useState(false);
  const [parameters, setParameters] = useState<RoutineParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [includePlan, setIncludePlan] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ExecOutcome | null>(null);
  const [pending, startTransition] = useTransition();
  const isRoutine =
    object?.kind === "storedProcedure" || object?.kind === "function";
  const procedureBlocked = object?.kind === "storedProcedure" && !writesEnabled;

  useEffect(() => {
    setError(null);
    setOutcome(null);
    setIncludePlan(true);
    setParameters([]);
    setParamValues({});
    if (!object || !isRoutine) {
      setDetailsLoading(false);
      setParametersLoaded(object != null);
      return;
    }
    const target = object;
    let cancelled = false;
    setParametersLoaded(false);
    setDetailsLoading(true);
    void fetchObjectDetails({
      schema: target.schema,
      name: target.name,
      kind: target.kind,
      includeRelationships: false,
      includeDefinition: false,
      includeDependencies: false,
      includeDependents: false,
    })
      .then((details) => {
        if (cancelled) {
          return;
        }
        const next: Record<string, string> = {};
        for (const param of details.parameters) {
          next[param.name] = "";
        }
        setParameters([...details.parameters]);
        setParamValues(next);
        setParametersLoaded(true);
        setDetailsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setParametersLoaded(false);
        setError(err instanceof Error ? err.message : String(err));
        setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isRoutine, object]);

  function run(): void {
    if (!object || procedureBlocked) {
      return;
    }
    const target = object;
    startTransition(async () => {
      try {
        setError(null);
        if (target.kind === "table" || target.kind === "view") {
          const result = await previewTableRows({
            schema: target.schema,
            table: target.name,
            employerId: null,
            top: PREVIEW_ROWS,
          });
          setOutcome({
            summary: rowSummary(result.rowCount, result.truncated),
            sets: [{ title: "Rows", rows: result.rows }],
            plans: null,
            planWarning: null,
          });
          return;
        }
        if (target.kind === "function") {
          const result = await executeFunction({
            schema: target.schema,
            name: target.name,
            payload: paramValues,
          });
          setOutcome({
            summary:
              result.shape === "scalar"
                ? "Scalar result"
                : rowSummary(result.rowCount, result.truncated),
            sets: [
              {
                title: result.shape === "scalar" ? "Value" : "Rows",
                rows: result.rows,
              },
            ],
            plans: null,
            planWarning: null,
          });
          return;
        }
        const payload: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(paramValues)) {
          payload[key] = value;
        }
        const preview = await previewExecuteProcedure({
          schema: target.schema,
          name: target.name,
          payload,
        });
        if (!preview.dryRun.ok) {
          setOutcome(null);
          setError(
            preview.dryRun.message || preview.dryRun.error || "Dry-run failed.",
          );
          return;
        }
        const result = await confirmExecuteProcedure(preview.token, {
          includePlan: target.kind === "storedProcedure" && includePlan,
        });
        if (!result.ok) {
          setOutcome(null);
          setError(result.message || result.error || "Execution failed.");
          return;
        }
        const sets: ResultSet[] = (result.recordsets ?? []).map((rows, index) => ({
          title: `Result set ${index + 1}`,
          rows: [...rows],
        }));
        if (result.output && Object.keys(result.output).length > 0) {
          sets.push({ title: "Output", rows: [result.output] });
        }
        const setCount = result.recordsets?.length ?? 0;
        setOutcome({
          summary: `Return value: ${String(result.returnValue)}. ${setCount} result set${setCount === 1 ? "" : "s"}.`,
          sets,
          plans:
            target.kind === "storedProcedure" && includePlan
              ? [...(result.executionPlans ?? [])]
              : null,
          planWarning:
            result.warnings.find((warning) =>
              warning.startsWith("Execution plan was not captured"),
            ) ?? null,
        });
      } catch (err) {
        setOutcome(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <Modal
      classNames={{ body: "max-h-[calc(100vh-14rem)] overflow-auto" }}
      width="96vw"
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button
            disabled={
              procedureBlocked ||
              detailsLoading ||
              pending ||
              !object ||
              (isRoutine && !parametersLoaded)
            }
            loading={pending}
            type="primary"
            onClick={run}
          >
            Execute
          </Button>
        </Space>
      }
      open={object != null}
      title={
        object ? (
          <span className="inline-flex flex-wrap items-center gap-1">
            <Tag className="m-0" color={KIND_COLOR[object.kind]}>
              {KIND_LABEL[object.kind]}
            </Tag>
            {object.schema}.{object.name}
          </span>
        ) : (
          "Execute"
        )
      }
      width={960}
      onCancel={onClose}
    >
      <Space className="w-full" orientation="vertical" size="middle">
        {error ? <Alert showIcon title={error} type="error" /> : null}
        {object && (object.kind === "table" || object.kind === "view") ? (
          <Typography.Text type="secondary">
            Preview returns the first {PREVIEW_ROWS} rows.
          </Typography.Text>
        ) : null}
        {procedureBlocked ? (
          <Typography.Text type="secondary">
            Writes are disabled for this environment.
          </Typography.Text>
        ) : null}
        {detailsLoading ? (
          <Typography.Text type="secondary">Loading parameters…</Typography.Text>
        ) : null}
        {isRoutine && !detailsLoading && parametersLoaded ? (
          parameters.length === 0 ? (
            <Typography.Text type="secondary">No parameters.</Typography.Text>
          ) : (
            <ParameterFields
              name={object.name}
              parameters={parameters}
              schema={object.schema}
              values={paramValues}
              onChange={(name, value) => {
                setParamValues((current) => ({
                  ...current,
                  [name]: value,
                }));
              }}
            />
          )
        ) : null}
        {object?.kind === "storedProcedure" && !procedureBlocked && !detailsLoading ? (
          <Checkbox
            checked={includePlan}
            onChange={(event) => {
              setIncludePlan(event.target.checked);
            }}
          >
            Include execution plan
          </Checkbox>
        ) : null}
        {outcome ? (
          <Space className="w-full" orientation="vertical" size="small">
            <Alert showIcon title={outcome.summary} type="success" />
            {outcome.sets.map((set) => (
              <div key={set.title}>
                <Typography.Text strong>{set.title}</Typography.Text>
                <div className="mt-1">
                  <ResultGrid rows={set.rows} />
                </div>
              </div>
            ))}
            {outcome.plans && outcome.plans.length > 0 ? (
              <ExecutionPlanDiagrams plans={outcome.plans} />
            ) : null}
            {outcome.plans && outcome.plans.length === 0 ? (
              <Alert
                showIcon
                title={outcome.planWarning ?? "No execution plan was returned."}
                type="warning"
              />
            ) : null}
          </Space>
        ) : null}
      </Space>
    </Modal>
  );
}
