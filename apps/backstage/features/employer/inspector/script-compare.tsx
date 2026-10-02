"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Segmented, Select, Splitter, Typography } from "antd";
import {
  diffDefinitions,
  diffPlaces,
  type DiffPlace,
  type DiffRow,
  type DiffSpan,
} from "@/features/employer/inspector/script-diff";
import { formatSql } from "@/features/employer/inspector/script-format";
import {
  getObjectDefinitionForEnvironment,
  listInspectorEnvironments,
  type InspectorObjectKind,
} from "@/features/employer/inspector/queries";

type SideText = {
  text: string | null;
  reason: string | null;
};

function otherEnvironment(environments: readonly string[], selected: string): string | undefined {
  return environments.find((environment) => environment !== selected);
}

function spanClass(changed: boolean, side: "left" | "right"): string {
  if (!changed) {
    return "";
  }
  return side === "left"
    ? "rounded-sm bg-red-200 dark:bg-red-800/80"
    : "rounded-sm bg-green-200 dark:bg-green-800/80";
}

function placeCaption(
  place: DiffPlace,
  leftEnv: string | undefined,
  rightEnv: string | undefined,
): string {
  const left = place.leftLine === null ? null : `${leftEnv ?? "Left"} ${place.leftLine}`;
  const right = place.rightLine === null ? null : `${rightEnv ?? "Right"} ${place.rightLine}`;
  const sides = [left, right].filter((side) => side !== null).join(" · ");
  if (place.lineCount === 1) {
    return sides;
  }
  return `${sides} · ${place.lineCount} lines`;
}

function cellClass(row: DiffRow, side: "left" | "right"): string {
  if (side === "left" && (row.kind === "removed" || row.kind === "changed")) {
    return "bg-red-50 dark:bg-red-950/40";
  }
  if (side === "right" && (row.kind === "added" || row.kind === "changed")) {
    return "bg-green-50 dark:bg-green-950/40";
  }
  return "";
}

function DiffCell({
  spans,
  row,
  side,
}: {
  spans: DiffSpan[] | null;
  row: DiffRow;
  side: "left" | "right";
}): React.JSX.Element {
  return (
    <div className={`min-h-5 px-2 whitespace-pre-wrap break-all ${cellClass(row, side)}`}>
      {spans
        ? spans.map((span, index) => (
            <span className={spanClass(span.changed, side)} key={index}>
              {span.text}
            </span>
          ))
        : null}
    </div>
  );
}

export function ScriptCompare({
  schema,
  name,
  kind,
  onClose,
}: {
  schema: string;
  name: string;
  kind: InspectorObjectKind;
  onClose: () => void;
}): React.JSX.Element {
  const [environments, setEnvironments] = useState<string[]>([]);
  const [leftEnv, setLeftEnv] = useState<string | undefined>(undefined);
  const [rightEnv, setRightEnv] = useState<string | undefined>(undefined);
  const [left, setLeft] = useState<SideText | null>(null);
  const [right, setRight] = useState<SideText | null>(null);
  const [loadingEnvs, setLoadingEnvs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"formatted" | "original">("formatted");

  useEffect(() => {
    let cancelled = false;
    void listInspectorEnvironments()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setEnvironments(result.environments);
        setLeftEnv(result.selected);
        setRightEnv(otherEnvironment(result.environments, result.selected));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEnvs(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!leftEnv || !rightEnv || leftEnv === rightEnv) {
      setLeft(null);
      setRight(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.all([
      getObjectDefinitionForEnvironment({ schema, name, kind, env: leftEnv }),
      getObjectDefinitionForEnvironment({ schema, name, kind, env: rightEnv }),
    ])
      .then(([leftDefinition, rightDefinition]) => {
        if (cancelled) {
          return;
        }
        setLeft({
          text: leftDefinition.text,
          reason: leftDefinition.unavailableReason,
        });
        setRight({
          text: rightDefinition.text,
          reason: rightDefinition.unavailableReason,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLeft(null);
          setRight(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [schema, name, kind, leftEnv, rightEnv]);

  const prepared = useMemo(() => {
    const leftText = left?.text ?? "";
    const rightText = right?.text ?? "";
    if (kind === "table" || mode === "original") {
      return { left: leftText, right: rightText, warning: null as string | null };
    }
    const leftFormatted = formatSql(leftText);
    const rightFormatted = formatSql(rightText);
    return {
      left: leftFormatted.sql,
      right: rightFormatted.sql,
      warning: leftFormatted.warning ?? rightFormatted.warning,
    };
  }, [kind, mode, left, right]);

  const diff = useMemo(
    () => diffDefinitions(prepared.left, prepared.right),
    [prepared.left, prepared.right],
  );
  const places = useMemo(() => diffPlaces(diff.rows), [diff.rows]);
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activePlace = places.find((place) => place.startRow === activeStart) ?? null;

  function jumpTo(place: DiffPlace): void {
    setActiveStart(place.startRow);
    const root = scrollRef.current;
    const node = root?.querySelector(`[data-diff-row="${place.startRow}"]`);
    if (!root || !(node instanceof HTMLElement)) {
      return;
    }
    const header = root.querySelector("[data-diff-header]");
    const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
    const top = node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - headerHeight;
    root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  const ready = Boolean(left && right && !loading);
  const status = !ready
    ? null
    : left?.reason && right?.reason
      ? "Missing on both sides"
      : diff.identical
        ? "Definitions match"
        : diff.changedLineCount === 1
          ? "1 line differs"
          : `${diff.changedLineCount} lines differ`;

  return (
    <div className="flex h-[36rem] min-h-0 flex-col overflow-hidden rounded border border-slate-200 dark:border-slate-700">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-2 py-1 dark:border-slate-700">
        <Select
          aria-label="Left environment"
          className="min-w-28"
          disabled={loadingEnvs || environments.length === 0}
          options={environments.map((environment) => ({
            label: environment,
            value: environment,
            disabled: environment === rightEnv,
          }))}
          placeholder="Left"
          size="small"
          value={leftEnv}
          onChange={setLeftEnv}
        />
        <Select
          aria-label="Right environment"
          className="min-w-28"
          disabled={loadingEnvs || environments.length === 0}
          options={environments.map((environment) => ({
            label: environment,
            value: environment,
            disabled: environment === leftEnv,
          }))}
          placeholder="Right"
          size="small"
          value={rightEnv}
          onChange={setRightEnv}
        />
        {kind === "table" ? null : (
          <Segmented
            size="small"
            value={mode}
            options={[
              { label: "Formatted", value: "formatted" },
              { label: "Original", value: "original" },
            ]}
            onChange={(value) => {
              if (value === "formatted" || value === "original") {
                setMode(value);
              }
            }}
          />
        )}
        {status ? (
          <Typography.Text type={diff.identical ? "success" : "warning"}>
            {status}
          </Typography.Text>
        ) : null}
        <Button className="ml-auto" size="small" onClick={onClose}>
          Close
        </Button>
      </div>
      {error ? (
        <div className="shrink-0 p-2">
          <Alert type="error" showIcon title={error} />
        </div>
      ) : null}
      {!loadingEnvs && environments.length < 2 ? (
        <div className="shrink-0 p-2">
          <Alert
            type="info"
            showIcon
            title="Configure another environment to compare."
          />
        </div>
      ) : null}
      {prepared.warning ? (
        <Typography.Text className="shrink-0 px-3 py-1 text-xs" type="warning">
          {prepared.warning}
        </Typography.Text>
      ) : null}
      {loading ? (
        <Typography.Text className="px-3 py-2" type="secondary">
          Loading {schema}.{name}…
        </Typography.Text>
      ) : null}
      {ready ? (
        <div className="min-h-0 flex-1">
          <Splitter className="h-full">
            <Splitter.Panel min="45%" style={{ overflow: "hidden" }}>
              <div
                className="h-full overflow-auto bg-slate-50 font-mono text-xs leading-5 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                ref={scrollRef}
              >
                <div
                  className="sticky top-0 z-10 grid grid-cols-2 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                  data-diff-header
                >
                  <div className="px-2 py-1">
                    <Typography.Text strong>{leftEnv}</Typography.Text>
                    {left?.reason ? (
                      <div className="mt-1">
                        <Alert type="warning" showIcon title={left.reason} />
                      </div>
                    ) : null}
                  </div>
                  <div className="border-l border-slate-200 px-2 py-1 dark:border-slate-700">
                    <Typography.Text strong>{rightEnv}</Typography.Text>
                    {right?.reason ? (
                      <div className="mt-1">
                        <Alert type="warning" showIcon title={right.reason} />
                      </div>
                    ) : null}
                  </div>
                </div>
                {diff.rows.map((row, index) => {
                  const marked =
                    activePlace !== null &&
                    index >= activePlace.startRow &&
                    index < activePlace.startRow + activePlace.lineCount;
                  return (
                    <div
                      className={`grid grid-cols-2 ${marked ? "ring-1 ring-amber-500 ring-inset" : ""}`}
                      data-diff-row={index}
                      key={index}
                    >
                      <DiffCell row={row} side="left" spans={row.left} />
                      <div className="border-l border-slate-200 dark:border-slate-700">
                        <DiffCell row={row} side="right" spans={row.right} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Splitter.Panel>
            {places.length > 0 ? (
              <Splitter.Panel
                collapsible={{ start: true, showCollapsibleIcon: true }}
                defaultSize={280}
                max="40%"
                min={200}
                style={{ overflow: "hidden" }}
              >
                <aside className="h-full overflow-auto p-3">
                  <Typography.Text strong>
                    {places.length === 1 ? "1 difference" : `${places.length} differences`}
                  </Typography.Text>
                  <div className="mt-2 flex flex-col gap-1">
                    {places.map((place, index) => {
                      const selected = place.startRow === activePlace?.startRow;
                      return (
                        <Button
                          block
                          className="h-auto px-2 py-1"
                          classNames={{
                            content: "w-full min-w-0 flex-col items-stretch gap-0",
                          }}
                          key={place.startRow}
                          size="small"
                          type={selected ? "primary" : "default"}
                          onClick={() => {
                            jumpTo(place);
                          }}
                        >
                          <span className="truncate text-left text-[11px] leading-4 opacity-80">
                            {index + 1}. {placeCaption(place, leftEnv, rightEnv)}
                          </span>
                          <span className="truncate text-left font-mono text-xs leading-4">
                            {place.preview || "(blank line)"}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </aside>
              </Splitter.Panel>
            ) : null}
          </Splitter>
        </div>
      ) : null}
    </div>
  );
}
