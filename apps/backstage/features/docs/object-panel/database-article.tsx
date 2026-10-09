"use client";

import { isValidElement, useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { scriptObjectRefs } from "@/features/employer/inspector/script-sql";
import { EDITOR_SETTING, readEditor } from "@/features/flows/editor-preference";
import { FLOW_ROOTS_SETTING, readRoots, ROOTS_KEY, type Roots } from "@/features/flows/roots-storage";
import { MermaidAwarePre, ScrollableTable } from "@/lib/markdown-components";
import { getSetting, migrateLocalSetting } from "@/shared/client-db";
import { databaseSourcePath, objectFromDatabaseHref, objectMention, resolveDatabaseDocHref, type ObjectMention } from "./mentions";
import type { ObjectPanelResult } from "./object-payload";
import { scriptKindMap, SqlHighlight } from "./sql-highlight";
import type { ScriptObjectKind } from "@hrms/db";

const KIND_LABEL = {
  table: "Table",
  view: "View",
  storedProcedure: "Stored procedure",
  function: "Function",
} as const;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; result: ObjectPanelResult }
  | { status: "error"; message: string };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

export function DatabaseArticle({
  content,
  slug,
  database,
  children,
}: {
  content: string;
  slug: string[];
  database: string;
  children: ReactNode;
}): React.JSX.Element {
  const [selected, setSelected] = useState<ObjectMention | null>(null);
  const [roots, setRoots] = useState<Roots>({});
  const [fileNote, setFileNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = readRoots(await migrateLocalSetting(FLOW_ROOTS_SETTING, ROOTS_KEY));
        if (!cancelled) setRoots(stored);
      } catch {
        // Saved folders are optional; the server list still fills defaults.
      }
      try {
        const response = await fetch("/api/flows/roots");
        const payload = (await response.json()) as { roots?: Roots };
        if (!cancelled) setRoots((current) => ({ ...payload.roots, ...current }));
      } catch {
        // The file still opens when a folder was saved in this browser.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openSource = useCallback(
    async (relativePath: string) => {
      setFileNote(null);
      let checkout = roots;
      if (!checkout["hrms-db"]) {
        try {
          const stored = readRoots(await migrateLocalSetting(FLOW_ROOTS_SETTING, ROOTS_KEY));
          const response = await fetch("/api/flows/roots");
          const payload = (await response.json()) as { roots?: Roots };
          checkout = { ...payload.roots, ...stored, ...checkout };
          setRoots(checkout);
        } catch {
          checkout = roots;
        }
      }
      let editor = readEditor(undefined);
      try {
        editor = readEditor(await getSetting(EDITOR_SETTING));
      } catch {
        editor = readEditor(undefined);
      }
      try {
        const response = await fetch("/api/flows/files", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            roots: checkout,
            editor,
            files: [
              {
                id: "source",
                source: { repo: "hrms-db", path: relativePath, line: 1, column: 1 },
              },
            ],
          }),
        });
        const payload = (await response.json()) as { hrefs?: Record<string, string | null> };
        const href = payload.hrefs?.source;
        if (href) {
          window.location.assign(href);
          return;
        }
      } catch {
        // Fall through to the checkout note.
      }
      setFileNote("Link the database checkout in Settings to open this file in your editor.");
    },
    [roots],
  );

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            {children}
            {fileNote ? (
              <p className="not-prose text-sm text-amber-700 dark:text-amber-300">
                {fileNote}{" "}
                <Link className="underline" href="/settings">
                  Open Settings
                </Link>
              </p>
            ) : null}
            <Markdown
              components={{
                a: ({ href, children: linkChildren }) => {
                  if (!href) return <>{linkChildren}</>;
                  const resolved = resolveDatabaseDocHref(href, slug);
                  const mention = objectFromDatabaseHref(resolved, database);
                  if (mention) {
                    return (
                      <button
                        className="cursor-pointer text-sky-700 underline decoration-sky-700/40 underline-offset-2 dark:text-sky-300"
                        type="button"
                        onClick={() => setSelected(mention)}
                      >
                        {linkChildren}
                      </button>
                    );
                  }
                  if (resolved.startsWith("/")) return <Link href={resolved}>{linkChildren}</Link>;
                  return (
                    <a href={resolved} rel="noopener noreferrer" target="_blank">
                      {linkChildren}
                    </a>
                  );
                },
                code: ({ className, children: codeChildren }) => {
                  if (className) return <code className={className}>{codeChildren}</code>;
                  const text = textOf(codeChildren);
                  const sourcePath = databaseSourcePath(text);
                  if (sourcePath) {
                    return (
                      <code>
                        <button
                          className="cursor-pointer text-sky-700 underline decoration-dotted underline-offset-2 dark:text-sky-300"
                          type="button"
                          onClick={() => {
                            void openSource(sourcePath);
                          }}
                        >
                          {codeChildren}
                        </button>
                      </code>
                    );
                  }
                  const mention = objectMention(text);
                  if (!mention) return <code>{codeChildren}</code>;
                  return (
                    <code>
                      <button
                        className="cursor-pointer text-sky-700 underline decoration-dotted underline-offset-2 dark:text-sky-300"
                        type="button"
                        onClick={() => setSelected(mention)}
                      >
                        {codeChildren}
                      </button>
                    </code>
                  );
                },
                table: ScrollableTable,
                pre: MermaidAwarePre,
              }}
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </Markdown>
          </article>
        </div>
      </div>
      {selected ? (
        <ObjectPanel
          database={database}
          object={selected}
          onClose={() => setSelected(null)}
          onOpen={setSelected}
        />
      ) : null}
    </div>
  );
}

function ObjectPanel({
  object,
  database,
  onClose,
  onOpen,
}: {
  object: ObjectMention;
  database: string;
  onClose: () => void;
  onOpen: (object: ObjectMention) => void;
}): React.JSX.Element {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [kinds, setKinds] = useState<Record<string, ScriptObjectKind>>({});

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    setKinds({});
    const params = new URLSearchParams({
      schema: object.schema,
      name: object.name,
      database,
    });
    void fetch(`/api/docs/database/object?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ObjectPanelResult & { message?: string };
        if (!response.ok) {
          throw new Error(payload.message ?? "Could not read this object.");
        }
        setState({ status: "ready", result: payload });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not read this object.",
        });
      });
    return () => controller.abort();
  }, [database, object.name, object.schema]);

  const definition =
    state.status === "ready" && state.result.found && state.result.kind !== "table"
      ? state.result.definition
      : null;

  useEffect(() => {
    if (!definition) return;
    const refs = scriptObjectRefs(definition);
    if (refs.length === 0) return;
    const controller = new AbortController();
    void fetch("/api/docs/database/object", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ objects: refs }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          kinds?: Array<{ schema: string; name: string; kind: ScriptObjectKind }>;
        };
        setKinds(scriptKindMap(payload.kinds ?? []));
      })
      .catch(() => {
        if (!controller.signal.aborted) setKinds({});
      });
    return () => controller.abort();
  }, [definition]);

  const result = state.status === "ready" ? state.result : null;
  const title = result?.found ? `${result.schema}.${result.name}` : `${object.schema}.${object.name}`;

  return (
    <aside className="flex h-full w-[min(42rem,46%)] min-w-80 shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {result?.found ? KIND_LABEL[result.kind] : "Database object"}
          </p>
          <h2 className="truncate text-base font-semibold">{title}</h2>
          {result?.found && result.docHref ? (
            <Link className="text-sm text-sky-700 hover:underline dark:text-sky-300" href={result.docHref}>
              Open the write-up
            </Link>
          ) : null}
        </div>
        <button
          aria-label="Close object panel"
          className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          type="button"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {state.status === "loading" ? (
          <p className="px-4 py-3 text-sm text-slate-500">Reading from the connected database…</p>
        ) : null}
        {state.status === "error" ? (
          <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{state.message}</p>
        ) : null}
        {result && !result.found ? (
          <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{result.message}</p>
        ) : null}
        {result?.found && result.kind === "table" ? <ColumnList columns={result.columns} /> : null}
        {result?.found && result.kind !== "table" && result.unavailableReason ? (
          <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{result.unavailableReason}</p>
        ) : null}
        {result?.found && result.kind !== "table" && result.definition ? (
          <SqlHighlight kinds={kinds} sql={result.definition} onOpenObject={onOpen} />
        ) : null}
      </div>
    </aside>
  );
}

function ColumnList({
  columns,
}: {
  columns: Array<{ name: string; dataType: string; nullable: boolean; primaryKey: boolean }>;
}): React.JSX.Element {
  if (columns.length === 0) {
    return <p className="px-4 py-3 text-sm text-slate-500">This table has no columns.</p>;
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-2 font-medium">Column</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Null</th>
            <th className="px-4 py-2 font-medium">Key</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr className="border-t border-slate-100 dark:border-slate-800" key={column.name}>
              <td className="px-4 py-1.5 font-mono text-xs">{column.name}</td>
              <td className="px-4 py-1.5 font-mono text-xs">{column.dataType}</td>
              <td className="px-4 py-1.5">{column.nullable ? "Yes" : "No"}</td>
              <td className="px-4 py-1.5">{column.primaryKey ? "PK" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
