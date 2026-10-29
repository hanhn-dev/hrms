"use client";

import { useRef } from "react";

import { Alert, Button } from "antd";
import type { GitFilePair } from "@hrms/azure-devops";
import { diffCode, type CodeDiffRow, type DiffSpan } from "@/features/azure/git/code-diff";
import { fileCompareView } from "@/features/azure/git/file-compare-view";

function spanClass(changed: boolean, side: "left" | "right"): string {
  if (!changed) {
    return "";
  }
  return side === "left"
    ? "rounded-sm bg-red-200 dark:bg-red-800/80"
    : "rounded-sm bg-green-200 dark:bg-green-800/80";
}

function cellClass(row: CodeDiffRow, side: "left" | "right"): string {
  if (side === "left" && (row.kind === "removed" || row.kind === "changed")) {
    return "bg-red-50 dark:bg-red-950/40";
  }
  if (side === "right" && (row.kind === "added" || row.kind === "changed")) {
    return "bg-green-50 dark:bg-green-950/40";
  }
  return "";
}

function OneSide({
  content,
  missingLabel,
}: {
  content: string | null;
  missingLabel: string;
}): React.JSX.Element {
  if (content === null) {
    return <div className="px-2 py-2 text-sm text-slate-500 dark:text-slate-400">Not on {missingLabel}</div>;
  }
  return (
    <pre className="m-0 min-w-0 px-2 py-1 font-mono text-xs whitespace-pre-wrap break-all">{content}</pre>
  );
}

function DiffCell({
  spans,
  row,
  side,
}: {
  spans: DiffSpan[] | null;
  row: CodeDiffRow;
  side: "left" | "right";
}): React.JSX.Element {
  return (
    <div className={`min-h-5 min-w-0 px-2 font-mono text-xs whitespace-pre-wrap break-all ${cellClass(row, side)}`}>
      {spans
        ? spans.map((span, index) => (
            <span className={spanClass(span.changed, side)} key={index}>
              {span.text.length > 0 ? span.text : " "}
            </span>
          ))
        : null}
    </div>
  );
}

export function FileDiff({
  pair,
  leftLabel,
  rightLabel,
}: {
  pair: GitFilePair;
  leftLabel: string;
  rightLabel: string;
}): React.JSX.Element {
  const view = fileCompareView(pair, leftLabel, rightLabel);
  const truncated = view.kind === "one-sided" ? view.truncated : pair.base.truncated || pair.target.truncated;
  const diff = view.kind === "diff" ? diffCode(pair.base.content ?? "", pair.target.content ?? "") : null;
  const scrollRef = useRef<HTMLDivElement>(null);

  function jumpTo(index: number): void {
    const root = scrollRef.current;
    const node = root?.querySelector(`[data-hunk="${index}"]`);
    if (!root || !(node instanceof HTMLElement)) {
      return;
    }
    const top = node.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
    root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  if (view.kind === "notice") {
    return <Alert title={view.message} type="info" />;
  }
  if (view.kind === "one-sided") {
    return (
      <div className="flex flex-col gap-2">
        <Alert title={view.message} type="info" />
        {truncated ? <Alert title="Showing the first 100 KB of this file." type="warning" /> : null}
        <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 text-xs text-slate-500 dark:border-slate-700">
          <div className="px-2 py-1">{leftLabel}</div>
          <div className="border-l border-slate-200 px-2 py-1 dark:border-slate-700">{rightLabel}</div>
        </div>
        <div className="grid max-h-[32rem] grid-cols-2 overflow-auto rounded border border-slate-200 dark:border-slate-700">
          <OneSide content={view.present === "left" ? view.content : null} missingLabel={leftLabel} />
          <div className="min-w-0 border-l border-slate-200 dark:border-slate-700">
            <OneSide content={view.present === "right" ? view.content : null} missingLabel={rightLabel} />
          </div>
        </div>
      </div>
    );
  }
  if (!diff) {
    return <Alert title="Nothing to compare." type="info" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {truncated ? (
        <Alert title="Showing the first 100 KB of this file." type="warning" />
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-green-700 dark:text-green-300">+{diff.addedLineCount}</span>
        <span className="text-red-700 dark:text-red-300">−{diff.removedLineCount}</span>
        {diff.identical ? <span>These versions match.</span> : null}
      </div>
      {diff.hunks.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {diff.hunks.map((hunk, index) => (
            <Button key={index} size="small" onClick={() => jumpTo(index)}>
              {hunk.preview || `Change ${index + 1}`}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 text-xs text-slate-500 dark:border-slate-700">
        <div className="px-2 py-1">{leftLabel}</div>
        <div className="border-l border-slate-200 px-2 py-1 dark:border-slate-700">{rightLabel}</div>
      </div>
      <div className="max-h-[32rem] overflow-auto rounded border border-slate-200 dark:border-slate-700" ref={scrollRef}>
        {diff.identical ? (
          <Alert title="These versions match." type="success" />
        ) : (
          diff.hunks.map((hunk, index) => (
            <section data-hunk={index} key={index}>
              <div className="bg-slate-100 px-2 py-1 font-mono text-xs text-slate-500 dark:bg-slate-800">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </div>
              {hunk.rows.map((row, rowIndex) => (
                <div className="grid grid-cols-2" key={rowIndex}>
                  <div className="flex min-w-0">
                    <span className="w-12 shrink-0 pr-2 text-right font-mono text-xs text-slate-400">
                      {row.leftLine ?? ""}
                    </span>
                    <DiffCell row={row} side="left" spans={row.left} />
                  </div>
                  <div className="flex min-w-0 border-l border-slate-200 dark:border-slate-700">
                    <span className="w-12 shrink-0 pr-2 text-right font-mono text-xs text-slate-400">
                      {row.rightLine ?? ""}
                    </span>
                    <DiffCell row={row} side="right" spans={row.right} />
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
