"use client";

import { CopyOutlined } from "@ant-design/icons";
import { App, AutoComplete, Button, Space, Tooltip } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GitBranchSummary } from "@hrms/azure-devops";
import {
  prepareGitPaths,
  rankGitPathSuggestions,
  type GitPathMatch,
} from "@/features/azure/git/file-search";
import {
  readRecentGitPaths,
  subscribeRecentGitPaths,
  type RecentGitPath,
} from "@/features/azure/git/recent-git-paths";
import { useGitFileIndex } from "@/features/azure/git/use-git-file-index";

const SEARCH_DELAY_MS = 100;

type PathOption = {
  value: string;
  recent: boolean;
  ranges: ReadonlyArray<readonly [number, number]>;
};

export function GitPathSearch({
  repositoryId,
  branches,
  branchesLoading,
  fallbackBranch,
  value,
  onChange,
  onSelectRecent,
  onPressEnter,
}: {
  repositoryId: string;
  branches: readonly GitBranchSummary[];
  branchesLoading: boolean;
  fallbackBranch: string;
  value: string;
  onChange: (value: string) => void;
  onSelectRecent?: (recent: RecentGitPath) => void;
  onPressEnter?: (value: string) => void;
}): React.JSX.Element {
  const { message } = App.useApp();
  const index = useGitFileIndex(repositoryId, branches, fallbackBranch);
  const [recents, setRecents] = useState<readonly RecentGitPath[]>([]);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setRecents(readRecentGitPaths(repositoryId));
    return subscribeRecentGitPaths(() => {
      setRecents(readRecentGitPaths(repositoryId));
    });
  }, [repositoryId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  const prepared = useMemo(() => prepareGitPaths(index.paths), [index.paths]);
  const preparedRecents = useMemo(() => prepareGitPaths(recents.map((item) => item.path)), [recents]);
  const ranking = value !== debouncedValue;
  const suggestions = useMemo(
    () =>
      rankGitPathSuggestions({
        index: ranking ? [] : prepared,
        recents: preparedRecents,
        query: value,
      }),
    [prepared, preparedRecents, ranking, value],
  );

  const recentByPath = useMemo(() => {
    const byPath = new Map<string, RecentGitPath>();
    for (const recent of recents) {
      byPath.set(recent.path, recent);
    }
    return byPath;
  }, [recents]);

  function publish(next: string): void {
    valueRef.current = next;
    onChange(next);
  }

  async function copyPath(): Promise<void> {
    const text = valueRef.current;
    if (text.trim().length === 0) {
      return;
    }
    if (copyWithSelection(text)) {
      message.success("Copied path");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success("Copied path");
    } catch {
      message.error("Could not copy the path.");
    }
  }

  const pathToCopy = value.trim();

  return (
    <Space.Compact block className="w-full">
      <AutoComplete<string, PathOption>
        allowClear
        aria-label="Path"
        className="min-w-0 flex-1"
        defaultActiveFirstOption
        options={suggestions.map(toOption)}
        placeholder="/src/file.ts"
        popupMatchSelectWidth={560}
        showSearch={{ filterOption: false }}
        value={value}
        notFoundContent={emptyContent({
          branchName: index.branchName,
          branchesLoading,
          error: index.error,
          loading: index.loading,
          ranking,
          ready: index.ready,
          suggestions: suggestions.length,
          value,
        })}
        optionRender={(option) => (
          <PathOptionRow option={option.data} />
        )}
        onChange={(next) => {
          publish(typeof next === "string" ? next : "");
        }}
        onInputKeyDown={(event) => {
          if (event.key !== "Enter" || !onPressEnter) {
            return;
          }
          const press = onPressEnter;
          window.setTimeout(() => {
            press(valueRef.current);
          }, 0);
        }}
        onSelect={(selected) => {
          const recent = recentByPath.get(String(selected));
          if (recent) {
            onSelectRecent?.(recent);
          }
        }}
      />
      <Tooltip title={pathToCopy.length > 0 ? "Copy path" : undefined}>
        <Button
          aria-label="Copy path"
          disabled={pathToCopy.length === 0}
          htmlType="button"
          icon={<CopyOutlined />}
          onClick={() => {
            void copyPath();
          }}
        />
      </Tooltip>
    </Space.Compact>
  );
}

function copyWithSelection(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}

function toOption(match: GitPathMatch): PathOption {
  return { value: match.path, recent: match.recent, ranges: match.ranges };
}

function emptyContent({
  branchName,
  branchesLoading,
  error,
  loading,
  ranking,
  ready,
  suggestions,
  value,
}: {
  branchName: string;
  branchesLoading: boolean;
  error: string | null;
  loading: boolean;
  ranking: boolean;
  ready: boolean;
  suggestions: number;
  value: string;
}): string | null {
  if (suggestions > 0 || ranking) {
    return null;
  }
  if (value.trim().length === 0) {
    return loading || branchesLoading ? `Loading files from ${branchName}…` : null;
  }
  if (!ready) {
    return error ?? `Loading files from ${branchName}…`;
  }
  return `No files on ${branchName} match that name.`;
}

function PathOptionRow({ option }: { option: PathOption }): React.JSX.Element {
  const slash = option.value.lastIndexOf("/");
  const fileName = option.value.slice(slash + 1);
  const directory = slash <= 0 ? "" : option.value.slice(option.value.startsWith("/") ? 1 : 0, slash);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate font-medium">
          <MarkedText ranges={rangesInSlice(option.ranges, slash + 1, option.value.length)} text={fileName} />
        </div>
        {directory.length > 0 ? (
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            <MarkedText ranges={rangesInSlice(option.ranges, option.value.startsWith("/") ? 1 : 0, slash)} text={directory} />
          </div>
        ) : null}
      </div>
      {option.recent ? <span className="shrink-0 text-xs text-slate-400">Recent</span> : null}
    </div>
  );
}

function rangesInSlice(
  ranges: ReadonlyArray<readonly [number, number]>,
  sliceStart: number,
  sliceEnd: number,
): Array<[number, number]> {
  const sliced: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const left = Math.max(start, sliceStart);
    const right = Math.min(end, sliceEnd);
    if (left < right) {
      sliced.push([left - sliceStart, right - sliceStart]);
    }
  }
  return sliced;
}

function MarkedText({
  text,
  ranges,
}: {
  text: string;
  ranges: ReadonlyArray<readonly [number, number]>;
}): React.JSX.Element {
  if (ranges.length === 0 || text.length === 0) {
    return <>{text}</>;
  }
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    const safeStart = Math.max(0, Math.min(start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(end, text.length));
    if (safeStart > cursor) {
      nodes.push(<span key={`text-${index}`}>{text.slice(cursor, safeStart)}</span>);
    }
    if (safeEnd > safeStart) {
      nodes.push(
        <mark className="rounded-sm bg-amber-200/80 text-inherit dark:bg-amber-400/30" key={`mark-${index}`}>
          {text.slice(safeStart, safeEnd)}
        </mark>,
      );
    }
    cursor = safeEnd;
  });
  if (cursor < text.length) {
    nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  }
  return <>{nodes}</>;
}
