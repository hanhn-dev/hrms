"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatSql } from "@/features/employer/inspector/script-format";
import { tokenizeSql } from "@/features/employer/inspector/script-sql";
import { bindSql, type SqlModel } from "@/features/employer/inspector/script-symbols";
import type { ScriptObjectKind } from "@hrms/db";

const CHIP_COLOR: Record<ScriptObjectKind, string> = {
  table: "#1677ff",
  view: "#722ed1",
  storedProcedure: "#fa8c16",
  function: "#13c2c2",
};

type Piece = {
  text: string;
  tokenIndex: number;
  first: boolean;
  symbolId: string | null;
  role: "declaration" | "use" | null;
  kind: SqlModel["tokens"][number]["kind"];
  tokenType: SqlModel["tokens"][number]["token"]["type"];
  schema: string | null;
  name: string | null;
  hint: string | null;
};

function kindKey(schema: string, name: string): string {
  return `${schema}.${name}`.toLowerCase();
}

function layoutLines(model: SqlModel): Piece[][] {
  const hints = new Map(model.symbols.map((symbol) => [symbol.id, symbol.hint]));
  const lines: Piece[][] = [[]];
  model.tokens.forEach((bound, tokenIndex) => {
    const parts = bound.token.value.split("\n");
    parts.forEach((text, partIndex) => {
      if (partIndex > 0) lines.push([]);
      if (text.length === 0) return;
      lines[lines.length - 1]?.push({
        text,
        tokenIndex,
        first: partIndex === 0,
        symbolId: bound.symbolId,
        role: bound.role,
        kind: bound.kind,
        tokenType: bound.token.type,
        schema: bound.token.type === "object" ? bound.token.schema : null,
        name: bound.token.type === "object" ? bound.token.name : null,
        hint: bound.symbolId ? (hints.get(bound.symbolId) ?? null) : null,
      });
    });
  });
  return lines;
}

function symbolClass(kind: Piece["kind"], clickable: boolean, flash: boolean): string {
  const color =
    kind === "parameter"
      ? "text-violet-700 dark:text-violet-300"
      : kind === "local"
        ? "text-rose-700 dark:text-rose-300"
        : kind === "alias"
          ? "text-cyan-700 dark:text-cyan-300"
          : kind === "system"
            ? "italic text-slate-500 dark:text-slate-400"
            : "";
  const action = clickable ? "cursor-pointer underline decoration-dotted underline-offset-2" : "";
  const flashClass = flash ? "rounded bg-amber-200 dark:bg-amber-400/30" : "";
  return [color, action, flashClass].filter(Boolean).join(" ");
}

export function SqlHighlight({
  sql,
  kinds,
  onOpenObject,
}: {
  sql: string;
  kinds: Readonly<Record<string, ScriptObjectKind>>;
  onOpenObject: (object: { schema: string; name: string }) => void;
}): React.JSX.Element {
  const [mode, setMode] = useState<"formatted" | "original">("formatted");
  const [flashToken, setFlashToken] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const useCursor = useRef(new Map<string, number>());
  const formatted = useMemo(() => formatSql(sql), [sql]);
  const displaySql = mode === "formatted" ? formatted.sql : sql;
  const model = useMemo(() => bindSql(tokenizeSql(displaySql)), [displaySql]);
  const lines = useMemo(() => layoutLines(model), [model]);
  const symbolById = useMemo(
    () => new Map(model.symbols.map((symbol) => [symbol.id, symbol])),
    [model.symbols],
  );

  useEffect(() => {
    setFlashToken(null);
    useCursor.current.clear();
  }, [model]);

  useEffect(() => {
    if (flashToken == null) return;
    const timer = window.setTimeout(() => setFlashToken(null), 1200);
    return () => window.clearTimeout(timer);
  }, [flashToken]);

  const reveal = useCallback(
    (tokenIndex: number) => {
      setFlashToken(tokenIndex);
      const root = scrollRef.current;
      const node = root?.querySelector(`[data-token="${tokenIndex}"]`);
      if (!(node instanceof HTMLElement) || !root) return;
      const rootRect = root.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const top = nodeRect.top - rootRect.top + root.scrollTop - root.clientHeight / 2;
      root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    },
    [],
  );

  function onSymbolClick(symbolId: string, role: "declaration" | "use"): void {
    const symbol = symbolById.get(symbolId);
    if (!symbol) return;
    if (role === "use" || symbol.uses.length === 0) {
      reveal(symbol.declToken);
      return;
    }
    const cursor = useCursor.current.get(symbolId) ?? 0;
    const useIndex = symbol.uses[cursor % symbol.uses.length] ?? symbol.declToken;
    useCursor.current.set(symbolId, cursor + 1);
    reveal(useIndex);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <ModeButton current={mode} mode="formatted" onMode={setMode}>
          Formatted
        </ModeButton>
        <ModeButton current={mode} mode="original" onMode={setMode}>
          Original
        </ModeButton>
      </div>
      {mode === "formatted" && formatted.warning ? (
        <p className="shrink-0 px-3 py-1 text-xs text-amber-700 dark:text-amber-300">{formatted.warning}</p>
      ) : null}
      <div
        className="min-h-0 flex-1 overflow-auto bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
        ref={scrollRef}
      >
        {lines.map((pieces, line) => (
          <div className="min-h-5 whitespace-pre" key={line}>
            {pieces.map((piece, pieceIndex) => (
              <ScriptPiece
                flash={flashToken === piece.tokenIndex}
                key={`${piece.tokenIndex}-${pieceIndex}`}
                kinds={kinds}
                piece={piece}
                onOpenObject={onOpenObject}
                onSymbolClick={onSymbolClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModeButton({
  current,
  mode,
  onMode,
  children,
}: {
  current: "formatted" | "original";
  mode: "formatted" | "original";
  onMode: (mode: "formatted" | "original") => void;
  children: string;
}): React.JSX.Element {
  const selected = current === mode;
  return (
    <button
      className={
        selected
          ? "rounded bg-slate-900 px-2 py-0.5 text-xs text-white dark:bg-slate-100 dark:text-slate-900"
          : "rounded px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }
      type="button"
      onClick={() => onMode(mode)}
    >
      {children}
    </button>
  );
}

function ScriptPiece({
  piece,
  flash,
  kinds,
  onOpenObject,
  onSymbolClick,
}: {
  piece: Piece;
  flash: boolean;
  kinds: Readonly<Record<string, ScriptObjectKind>>;
  onOpenObject: (object: { schema: string; name: string }) => void;
  onSymbolClick: (symbolId: string, role: "declaration" | "use") => void;
}): React.JSX.Element {
  if (piece.tokenType === "keyword") {
    return <span className="font-semibold text-blue-700 dark:text-blue-300">{piece.text}</span>;
  }
  if (piece.tokenType === "comment") {
    return <span className="text-slate-400 dark:text-slate-500">{piece.text}</span>;
  }
  if (piece.tokenType === "string") {
    return <span className="text-emerald-700 dark:text-emerald-300">{piece.text}</span>;
  }
  if (piece.tokenType === "number") {
    return <span className="text-amber-700 dark:text-amber-300">{piece.text}</span>;
  }
  if (piece.tokenType === "builtin") {
    return <span className="font-bold text-pink-800 dark:text-pink-300">{piece.text}</span>;
  }
  if (piece.tokenType === "object" && piece.schema && piece.name) {
    const schema = piece.schema;
    const name = piece.name;
    const kind = kinds[kindKey(schema, name)];
    return (
      <button
        className="mx-0.5 inline-flex cursor-pointer rounded px-1 align-baseline font-mono text-[11px] leading-5 text-white"
        style={{ backgroundColor: kind ? CHIP_COLOR[kind] : "#64748b" }}
        type="button"
        onClick={() => onOpenObject({ schema, name })}
      >
        {piece.text}
      </button>
    );
  }
  if (piece.kind === "system") {
    return <span className={symbolClass(piece.kind, false, flash)}>{piece.text}</span>;
  }
  if (piece.symbolId && piece.role) {
    const symbolId = piece.symbolId;
    const role = piece.role;
    return (
      <span
        className={symbolClass(piece.kind, true, flash)}
        data-token={piece.first ? piece.tokenIndex : undefined}
        role="button"
        tabIndex={0}
        title={piece.hint ?? undefined}
        onClick={() => onSymbolClick(symbolId, role)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSymbolClick(symbolId, role);
          }
        }}
      >
        {piece.text}
      </span>
    );
  }
  return <span data-token={piece.first ? piece.tokenIndex : undefined}>{piece.text}</span>;
}

export function scriptKindMap(
  rows: ReadonlyArray<{ schema: string; name: string; kind: ScriptObjectKind }>,
): Record<string, ScriptObjectKind> {
  const kinds: Record<string, ScriptObjectKind> = {};
  for (const row of rows) kinds[kindKey(row.schema, row.name)] = row.kind;
  return kinds;
}
