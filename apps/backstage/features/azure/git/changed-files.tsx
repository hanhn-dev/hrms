"use client";

import { Tag } from "antd";
import type { GitChangedFile, GitChangeType } from "@hrms/azure-devops";

const TAG_COLOR: Record<GitChangeType, string> = {
  add: "green",
  delete: "red",
  edit: "blue",
  rename: "purple",
  other: "default",
};

export function ChangedFiles({
  files,
  selectedPath,
  truncated,
  onSelect,
}: {
  files: readonly GitChangedFile[];
  selectedPath: string | null;
  truncated: boolean;
  onSelect: (file: GitChangedFile) => void;
}): React.JSX.Element {
  if (files.length === 0) {
    return <p className="text-sm text-slate-500">No file changes.</p>;
  }

  return (
    <div className="flex min-h-0 flex-col">
      {truncated ? (
        <p className="mb-2 text-sm text-slate-500">Showing the first 100 files.</p>
      ) : null}
      <ul className="max-h-80 overflow-auto rounded border border-slate-200 dark:border-slate-700">
        {files.map((file) => {
          const selected = file.path === selectedPath;
          return (
            <li key={`${file.changeType}:${file.originalPath ?? ""}:${file.path}`}>
              <button
                className={`flex w-full items-start gap-2 px-2 py-1 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  selected ? "bg-slate-100 dark:bg-slate-800" : ""
                }`}
                type="button"
                onClick={() => onSelect(file)}
              >
                <Tag className="shrink-0" color={TAG_COLOR[file.changeType]}>
                  {file.changeType}
                </Tag>
                <span className="min-w-0 break-all">
                  {file.originalPath && file.originalPath !== file.path
                    ? `${file.originalPath} → ${file.path}`
                    : file.path}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
