"use client";

import { useMemo, useRef } from "react";
import { Alert, Button } from "antd";
import type { GitFilePair } from "@hrms/azure-devops";
import { diffCode, type CodeDiffRow, type DiffSpan } from "@/features/azure/git/code-diff";

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

function pairNotice(pair: GitFilePair): string | null {
  if (pair.base.isBinary || pair.target.isBinary) {
    return pair.base.omission ?? pair.target.omission ?? "Binary or non-text content omitted";
  }
  const blocked = [pair.base, pair.target].filter(
    (side) => side.omission !== null && !side.missing && side.content === null,
  );
  if (blocked.length > 0) {
    return blocked.map((side) => side.omission).filter((note): note is string => note !== null).join("; ");
  }
  if (pair.base.missing && pair.target.missing) {
    return "This path is not in either version.";
  }
  return null;
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
  const notice = pairNotice(pair);
  const truncated = pair.base.truncated || pair.target.truncated;
  const diff = useMemo(
    () => (notice ? null : diffCode(pair.base.content ?? "", pair.target.content ?? "")),
    [notice, pair],
  );
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

  if (notice) {
    return <Alert title={notice} type="info" />;
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
