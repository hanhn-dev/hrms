"use client";

import { useEffect, useMemo, useState } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Splitter, Tooltip, Typography } from "antd";
import { scriptObjectRefs, tokenizeSql } from "@/features/employer/inspector/script-sql";
import { bindSql } from "@/features/employer/inspector/script-symbols";
import { formatSql } from "@/features/employer/inspector/script-format";
import { ScriptCompare } from "@/features/employer/inspector/script-compare";
import { ScriptExecuteModal } from "@/features/employer/inspector/script-execute-modal";
import { RelatedScriptButtons, SqlScript } from "@/features/employer/inspector/script-view";
import type { ScriptRelation } from "@/features/employer/inspector/script-relations";
import {
  ScriptUsedObjects,
  type UsedObject,
} from "@/features/employer/inspector/script-used-objects";
import {
  resolveScriptObjectKinds,
  type InspectorObjectKind,
  type ResolvedScript,
  type ScriptObjectKind,
} from "@/features/employer/inspector/queries";

export type ScriptTab = {
  key: string;
  schema: string;
  name: string;
  kind: InspectorObjectKind | "lookup";
  loading: boolean;
  error: string | null;
  script: ResolvedScript | null;
  relation?: ScriptRelation;
};

type RelatedActions = {
  onLoadCallers?: () => void;
  onLoadNested?: () => void;
  loadingCallers?: boolean;
  loadingNested?: boolean;
};

function ScriptReload({ onRefresh }: { onRefresh: () => void }): React.JSX.Element {
  return (
    <div className="flex justify-end">
      <Tooltip title="Reload from database">
        <Button
          aria-label="Reload from database"
          icon={<ReloadOutlined />}
          size="small"
          type="text"
          onClick={onRefresh}
        />
      </Tooltip>
    </div>
  );
}

export function ScriptTabBody({
  tab,
  writesEnabled,
  onOpenObject,
  onRefresh,
  onLoadCallers,
  onLoadNested,
  loadingCallers,
  loadingNested,
}: {
  tab: ScriptTab;
  writesEnabled: boolean;
  onOpenObject: (object: { schema: string; name: string }) => void;
  onRefresh: () => void;
} & RelatedActions): React.JSX.Element {
  const [comparing, setComparing] = useState(false);
  if (tab.loading) {
    return <Typography.Text type="secondary">Loading {tab.schema}.{tab.name}…</Typography.Text>;
  }
  if (tab.error) {
    return <Alert type="error" showIcon title={tab.error} />;
  }
  if (comparing && tab.script) {
    return (
      <ScriptCompare
        kind={tab.script.kind}
        name={tab.script.name}
        schema={tab.script.schema}
        onClose={() => {
          setComparing(false);
        }}
      />
    );
  }
  if (tab.script?.kind === "table") {
    return (
      <div className="flex flex-col gap-2">
        <ScriptReload onRefresh={onRefresh} />
        <div className="flex items-center justify-between gap-2">
          <Typography.Text type="secondary">
            {tab.script.schema}.{tab.script.name} is a table. Columns:
          </Typography.Text>
          <div className="flex items-center gap-2">
            <RelatedScriptButtons
              loadingCallers={loadingCallers}
              loadingNested={loadingNested}
              onLoadCallers={onLoadCallers}
              onLoadNested={onLoadNested}
            />
            <Button
              size="small"
              onClick={() => {
                setComparing(true);
              }}
            >
              Compare
            </Button>
          </div>
        </div>
        <pre className="max-h-[36rem] overflow-auto rounded bg-slate-50 p-3 font-mono text-xs leading-5 whitespace-pre dark:bg-slate-900">
          {tab.script.columns.map((column) => `${column.name}  ${column.typeName}`).join("\n")}
        </pre>
      </div>
    );
  }
  if (tab.script && "unavailableReason" in tab.script && tab.script.unavailableReason) {
    return (
      <div className="flex flex-col gap-2">
        <ScriptReload onRefresh={onRefresh} />
        <div className="flex items-center gap-2">
          <RelatedScriptButtons
            loadingCallers={loadingCallers}
            loadingNested={loadingNested}
            onLoadCallers={onLoadCallers}
            onLoadNested={onLoadNested}
          />
          <Button
            size="small"
            onClick={() => {
              setComparing(true);
            }}
          >
            Compare
          </Button>
        </div>
        <Alert type="warning" showIcon title={tab.script.unavailableReason} />
      </div>
    );
  }
  if (tab.script && "definition" in tab.script && tab.script.definition) {
    return (
      <div className="flex flex-col gap-2">
        <ScriptReload onRefresh={onRefresh} />
        <ScriptBody
          loadingCallers={loadingCallers}
          loadingNested={loadingNested}
          name={tab.script.name}
          schema={tab.script.schema}
          sql={tab.script.definition}
          writesEnabled={writesEnabled}
          onCompare={() => {
            setComparing(true);
          }}
          onLoadCallers={onLoadCallers}
          onLoadNested={onLoadNested}
          onOpenObject={onOpenObject}
        />
      </div>
    );
  }
  return <Typography.Text type="secondary">No script text is available.</Typography.Text>;
}

function ScriptBody({
  schema,
  name,
  sql,
  writesEnabled,
  onOpenObject,
  onCompare,
  onLoadCallers,
  onLoadNested,
  loadingCallers,
  loadingNested,
}: {
  schema: string;
  name: string;
  sql: string;
  writesEnabled: boolean;
  onOpenObject: (object: { schema: string; name: string }) => void;
  onCompare: () => void;
} & RelatedActions): React.JSX.Element {
  const [kinds, setKinds] = useState<Record<string, ScriptObjectKind>>({});
  const [kindsReady, setKindsReady] = useState(false);
  const [executeTarget, setExecuteTarget] = useState<UsedObject | null>(null);
  const [mode, setMode] = useState<"formatted" | "original">("formatted");
  const [jumpToken, setJumpToken] = useState<{ index: number; nonce: number } | null>(null);
  const formatted = useMemo(() => formatSql(sql), [sql]);
  const displaySql = mode === "formatted" ? formatted.sql : sql;
  const model = useMemo(() => bindSql(tokenizeSql(displaySql)), [displaySql]);
  const refs = useMemo(() => scriptObjectRefs(sql), [sql]);

  useEffect(() => {
    if (refs.length === 0) {
      setKinds({});
      setKindsReady(true);
      return;
    }
    let cancelled = false;
    setKindsReady(false);
    void resolveScriptObjectKinds(refs)
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const next: Record<string, ScriptObjectKind> = {};
        for (const row of rows) {
          next[`${row.schema}.${row.name}`.toLowerCase()] = row.kind;
        }
        setKinds(next);
        setKindsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setKinds({});
          setKindsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refs]);

  return (
    <>
      <Splitter
        className="h-[36rem] overflow-hidden rounded border border-slate-200 dark:border-slate-700"
        collapsible={{ motion: true }}
      >
        <Splitter.Panel min="40%" style={{ overflow: "hidden" }}>
          <SqlScript
            jumpToken={jumpToken}
            kinds={kinds}
            mode={mode}
            model={model}
            loadingCallers={loadingCallers}
            loadingNested={loadingNested}
            warning={mode === "formatted" ? formatted.warning : null}
            onCompare={onCompare}
            onLoadCallers={onLoadCallers}
            onLoadNested={onLoadNested}
            onMode={setMode}
            onOpenObject={onOpenObject}
          />
        </Splitter.Panel>
        <Splitter.Panel
          collapsible={{ start: true, showCollapsibleIcon: true }}
          defaultSize={256}
          max="40%"
          min={192}
          style={{ overflow: "hidden" }}
        >
          <ScriptUsedObjects
            current={{ schema, name }}
            kinds={kinds}
            kindsReady={kindsReady}
            refs={refs}
            onExecute={setExecuteTarget}
            onJump={(symbol) => {
              setJumpToken({ index: symbol.declToken, nonce: Date.now() });
            }}
            onView={onOpenObject}
            symbols={model.symbols}
          />
        </Splitter.Panel>
      </Splitter>
      <ScriptExecuteModal
        object={executeTarget}
        writesEnabled={writesEnabled}
        onClose={() => {
          setExecuteTarget(null);
        }}
      />
    </>
  );
}
