"use client";

import { useMemo } from "react";
import { Tag } from "antd";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import { tokenizeSql } from "@/features/employer/inspector/script-sql";
import type { ScriptObjectKind } from "@/features/employer/inspector/queries";

function kindKey(schema: string, name: string): string {
  return `${schema}.${name}`.toLowerCase();
}

export function SqlScript({
  sql,
  kinds,
  onOpenObject,
}: {
  sql: string;
  kinds: Readonly<Record<string, ScriptObjectKind>>;
  onOpenObject: (object: { schema: string; name: string }) => void;
}): React.JSX.Element {
  const tokens = useMemo(() => tokenizeSql(sql), [sql]);

  return (
    <pre className="h-full overflow-auto rounded bg-slate-50 p-3 font-mono text-xs leading-5 whitespace-pre text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      {tokens.map((token, index) => {
        if (token.type === "keyword") {
          return (
            <span className="font-semibold text-blue-700 dark:text-blue-300" key={index}>
              {token.value}
            </span>
          );
        }
        if (token.type === "comment") {
          return (
            <span className="text-slate-400 dark:text-slate-500" key={index}>
              {token.value}
            </span>
          );
        }
        if (token.type === "string") {
          return (
            <span className="text-emerald-700 dark:text-emerald-300" key={index}>
              {token.value}
            </span>
          );
        }
        if (token.type === "object") {
          const kind = kinds[kindKey(token.schema, token.name)];
          return (
            <Tag
              className="mx-0 inline-flex cursor-pointer align-baseline font-mono text-[11px] leading-5"
              color={kind ? KIND_COLOR[kind] : "default"}
              key={index}
              onClick={() => {
                onOpenObject({ schema: token.schema, name: token.name });
              }}
            >
              {token.value}
            </Tag>
          );
        }
        return <span key={index}>{token.value}</span>;
      })}
    </pre>
  );
}
