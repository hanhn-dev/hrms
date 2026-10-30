"use client";

import { isValidElement, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ScriptObjectKind } from "@hrms/db";
import { useActiveSectionId } from "@/components/guides/use-active-section";
import { HeadingPermalink } from "@/components/heading-permalink";
import { scriptObjectRefs } from "@/features/employer/inspector/script-sql";
import { MermaidAwarePre, ScrollableTable } from "@/lib/markdown-components";
import { TrailLink } from "@/shared/navigation";
import { pageSections, sectionId, type PageSection } from "./page-sections";
import {
  mentionFromInlineCode,
  objectFromDatabaseHref,
  pageObjectMentions,
  resolveDatabaseDocHref,
  type ObjectMention,
} from "./mentions";
import type { ObjectPanelResult } from "./object-payload";
import { OBJECT_CHIP_CLASS, objectChipColor, scriptKindMap, SqlHighlight } from "./sql-highlight";

const KIND_BATCH = 200;

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

function loadMentionKinds(
  objects: readonly { schema: string; name: string }[],
  signal: AbortSignal,
): Promise<Array<{ schema: string; name: string; kind: ScriptObjectKind }>> {
  const batches: Array<readonly { schema: string; name: string }[]> = [];
  for (let index = 0; index < objects.length; index += KIND_BATCH) {
    batches.push(objects.slice(index, index + KIND_BATCH));
  }
  return Promise.all(
    batches.map(async (batch) => {
      const response = await fetch("/api/docs/database/object", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objects: batch }),
        signal,
      });
      if (!response.ok) return [];
      const payload = (await response.json()) as {
        kinds?: Array<{ schema: string; name: string; kind: ScriptObjectKind }>;
      };
      return payload.kinds ?? [];
    }),
  ).then((rows) => rows.flat());
}

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
  const [stack, setStack] = useState<ObjectMention[]>([]);
  const [kinds, setKinds] = useState<Record<string, ScriptObjectKind>>({});
  const selected = stack.at(-1) ?? null;
  const slugKey = slug.join("/");
  const current = objectFromDatabaseHref(`/docs/database/${slugKey}`, database);
  const sections = pageSections(content);
  const activeId = useActiveSectionId(sections);

  function renderHeading(tag: "h2" | "h3", children: ReactNode): React.JSX.Element {
    const label = textOf(children);
    const id = sectionId(label);
    const Tag = tag;
    return (
      <Tag className="group scroll-mt-6" id={id}>
        {children}
        <HeadingPermalink id={id} label={textOf(children)} />
      </Tag>
    );
  }

  useEffect(() => {
    const mentions = pageObjectMentions(content, database, slugKey.split("/"));
    if (mentions.length === 0) return;
    const controller = new AbortController();
    void loadMentionKinds(mentions, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setKinds(scriptKindMap(rows));
      })
      .catch(() => {
        if (!controller.signal.aborted) setKinds({});
      });
    return () => controller.abort();
  }, [content, database, slugKey]);

  function openObject(object: ObjectMention): void {
    setStack((previous) => [...previous, object]);
  }

  return (
    <div className="flex h-full min-h-0 w-full">
      <PageToc activeId={activeId} sections={sections} />
      <article className="prose prose-slate dark:prose-invert h-full max-w-none min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-8">
        <PageTocMobile activeId={activeId} sections={sections} />
          {children}
          <Markdown
            components={{
              h2: ({ children: headingChildren }) => renderHeading("h2", headingChildren),
              h3: ({ children: headingChildren }) => renderHeading("h3", headingChildren),
              h1: ({ children: titleChildren }) => (
                <h1 className="flex flex-wrap items-center gap-3">
                  <button
                    className="cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-inherit hover:text-sky-800 dark:hover:text-sky-200"
                    type="button"
                    onClick={() => {
                      if (current) openObject(current);
                    }}
                  >
                    {titleChildren}
                  </button>
                  {current ? (
                    <button
                      aria-label={`Open the script for ${current.name}`}
                      className="not-prose inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-sky-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-200"
                      type="button"
                      onClick={() => openObject(current)}
                    >
                      <ScriptIcon />
                    </button>
                  ) : null}
                </h1>
              ),
              a: ({ href, children: linkChildren }) => {
                if (!href) return <>{linkChildren}</>;
                const resolved = resolveDatabaseDocHref(href, slug);
                const mention = objectFromDatabaseHref(resolved, database);
                if (mention) {
                  return (
                    <ObjectChip kinds={kinds} mention={mention} onOpen={openObject}>
                      {linkChildren}
                    </ObjectChip>
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
                const mention = mentionFromInlineCode(textOf(codeChildren));
                if (!mention) return <code>{codeChildren}</code>;
                return (
                  <ObjectChip kinds={kinds} mention={mention} onOpen={openObject}>
                    {codeChildren}
                  </ObjectChip>
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
      {selected ? (
        <ObjectDialog
          database={database}
          object={selected}
          showBack={stack.length > 1}
          onBack={() => setStack((previous) => previous.slice(0, -1))}
          onClose={() => setStack([])}
          onOpen={openObject}
        />
      ) : null}
    </div>
  );
}

function scrollToSection(id: string): void {
  const heading = document.getElementById(id);
  const article = heading?.closest("article");
  if (heading && article) {
    const top =
      heading.getBoundingClientRect().top - article.getBoundingClientRect().top + article.scrollTop;
    article.scrollTo({ top: Math.max(0, top - 24) });
  }
  history.replaceState(null, "", `#${id}`);
}

function SectionLinks({
  sections,
  activeId,
  onNavigate,
}: {
  sections: PageSection[];
  activeId: string | null;
  onNavigate?: () => void;
}): React.JSX.Element {
  if (sections.length === 0) {
    return <p className="mt-3 text-sm italic text-slate-500 dark:text-slate-400">No sections.</p>;
  }
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {sections.map((section) => {
        const isActive = section.id === activeId;
        return (
          <li key={section.id}>
            <a
              aria-current={isActive ? "location" : undefined}
              className={
                (section.depth === 3 ? "block pl-3 " : "block ") +
                (isActive
                  ? "font-medium text-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white")
              }
              href={`#${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                scrollToSection(section.id);
                onNavigate?.();
              }}
            >
              {section.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function PageToc({
  sections,
  activeId,
}: {
  sections: PageSection[];
  activeId: string | null;
}): React.JSX.Element {
  return (
    <nav
      aria-label="On this page"
      className="hidden w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-4 py-8 lg:block dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        On this page
      </p>
      <SectionLinks activeId={activeId} sections={sections} />
    </nav>
  );
}

function PageTocMobile({
  sections,
  activeId,
}: {
  sections: PageSection[];
  activeId: string | null;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="not-prose mb-6 lg:hidden"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
        On this page
      </summary>
      <SectionLinks
        activeId={activeId}
        sections={sections}
        onNavigate={() => setOpen(false)}
      />
    </details>
  );
}

function ScriptIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function ObjectChip({
  mention,
  kinds,
  onOpen,
  children,
}: {
  mention: ObjectMention;
  kinds: Readonly<Record<string, ScriptObjectKind>>;
  onOpen: (object: ObjectMention) => void;
  children: ReactNode;
}): React.JSX.Element {
  const kind = kinds[`${mention.schema}.${mention.name}`.toLowerCase()];
  return (
    <button
      className={OBJECT_CHIP_CLASS}
      style={{ backgroundColor: objectChipColor(kind) }}
      type="button"
      onClick={() => onOpen(mention)}
    >
      {children}
    </button>
  );
}

function ObjectDialog({
  object,
  database,
  showBack,
  onBack,
  onClose,
  onOpen,
}: {
  object: ObjectMention;
  database: string;
  showBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onOpen: (object: ObjectMention) => void;
}): React.JSX.Element {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [kinds, setKinds] = useState<Record<string, ScriptObjectKind>>({});
  const objectKey = `${database}\0${object.schema}\0${object.name}`;
  const [loadedObjectKey, setLoadedObjectKey] = useState(objectKey);
  if (loadedObjectKey !== objectKey) {
    setLoadedObjectKey(objectKey);
    setState({ status: "loading" });
    setKinds({});
  }

  useEffect(() => {
    const controller = new AbortController();
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
    void loadMentionKinds(refs, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setKinds(scriptKindMap(rows));
      })
      .catch(() => {
        if (!controller.signal.aborted) setKinds({});
      });
    return () => controller.abort();
  }, [definition]);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const result = state.status === "ready" ? state.result : null;
  const title = result?.found ? `${result.schema}.${result.name}` : `${object.schema}.${object.name}`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        aria-labelledby="database-object-title"
        aria-modal="true"
        className="flex h-[min(40rem,90vh)] w-[min(68rem,100%)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {result?.found ? KIND_LABEL[result.kind] : "Database object"}
          </p>
          <h2 className="truncate text-base font-semibold" id="database-object-title">
            {title}
          </h2>
          {result?.found && result.docHref ? (
            <TrailLink className="text-sm text-sky-700 hover:underline dark:text-sky-300" href={result.docHref}>
              Open the write-up
            </TrailLink>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showBack ? (
            <button
              className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              type="button"
              onClick={onBack}
            >
              Back
            </button>
          ) : null}
          <button
            aria-label="Close script"
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
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
      </div>
    </div>,
    document.body,
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
