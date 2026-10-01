"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretDownOutlined, CaretRightOutlined } from "@ant-design/icons";
import { Button, Segmented, Tag, Tooltip, Typography } from "antd";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import type { SqlModel, SqlFold } from "@/features/employer/inspector/script-symbols";
import type { ScriptObjectKind } from "@/features/employer/inspector/queries";

type ScriptMode = "formatted" | "original";

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

function layoutLines(model: SqlModel): { lines: Piece[][]; tokenLine: number[] } {
  const hints = new Map(model.symbols.map((symbol) => [symbol.id, symbol.hint]));
  const lines: Piece[][] = [[]];
  const tokenLine: number[] = [];
  model.tokens.forEach((bound, tokenIndex) => {
    const parts = bound.token.value.split("\n");
    parts.forEach((text, partIndex) => {
      if (partIndex > 0) {
        lines.push([]);
      }
      if (partIndex === 0) {
        tokenLine[tokenIndex] = lines.length - 1;
      }
      if (text.length === 0) {
        return;
      }
      const line = lines[lines.length - 1];
      line?.push({
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
  return { lines, tokenLine };
}

function openingFold(line: number, folds: readonly SqlFold[]): SqlFold | null {
  let best: SqlFold | null = null;
  for (const fold of folds) {
    if (fold.startLine !== line) {
      continue;
    }
    if (!best || fold.endLine > best.endLine) {
      best = fold;
    }
  }
  return best;
}

function lineHidden(line: number, folds: readonly SqlFold[], collapsed: ReadonlySet<string>): boolean {
  return folds.some(
    (fold) => collapsed.has(fold.id) && line > fold.startLine && line <= fold.endLine,
  );
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

export function SqlScript({
  model,
  warning,
  mode,
  jumpToken,
  kinds,
  onMode,
  onOpenObject,
}: {
  model: SqlModel;
  warning: string | null;
  mode: ScriptMode;
  jumpToken: { index: number; nonce: number } | null;
  kinds: Readonly<Record<string, ScriptObjectKind>>;
  onMode: (mode: ScriptMode) => void;
  onOpenObject: (object: { schema: string; name: string }) => void;
}): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<number | null>(null);
  const lastNonce = useRef<number | null>(null);
  const useCursor = useRef(new Map<string, number>());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [flashToken, setFlashToken] = useState<number | null>(null);
  const [scrollGeneration, setScrollGeneration] = useState(0);
  const { lines, tokenLine } = useMemo(() => layoutLines(model), [model]);
  const symbolById = useMemo(
    () => new Map(model.symbols.map((symbol) => [symbol.id, symbol])),
    [model.symbols],
  );

  useEffect(() => {
    pendingScroll.current = null;
    setCollapsed(new Set());
    setFlashToken(null);
    useCursor.current.clear();
  }, [model]);

  useEffect(() => {
    if (flashToken == null) {
      return;
    }
    const timer = window.setTimeout(() => {
      setFlashToken(null);
    }, 1200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [flashToken]);

  const scrollToken = useCallback((tokenIndex: number): void => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }
    const node = root.querySelector(`[data-token="${tokenIndex}"]`);
    if (!(node instanceof HTMLElement)) {
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const top = nodeRect.top - rootRect.top + root.scrollTop - root.clientHeight / 2;
    root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    if (nodeRect.left < rootRect.left + 16 || nodeRect.right > rootRect.right) {
      root.scrollLeft += nodeRect.left - rootRect.left - 24;
    }
  }, []);

  const revealRef = useRef<(tokenIndex: number) => void>(() => {});

  function reveal(tokenIndex: number): void {
    const line = tokenLine[tokenIndex] ?? 0;
    pendingScroll.current = tokenIndex;
    setFlashToken(tokenIndex);
    setScrollGeneration((current) => current + 1);
    setCollapsed((current) => {
      let changed = false;
      const next = new Set(current);
      for (const fold of model.folds) {
        if (next.has(fold.id) && line > fold.startLine && line <= fold.endLine) {
          next.delete(fold.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }

  revealRef.current = reveal;

  useEffect(() => {
    if (!jumpToken || jumpToken.nonce === lastNonce.current) {
      return;
    }
    lastNonce.current = jumpToken.nonce;
    revealRef.current(jumpToken.index);
  }, [jumpToken]);

  useEffect(() => {
    const tokenIndex = pendingScroll.current;
    if (tokenIndex == null) {
      return;
    }
    const root = scrollRef.current;
    const node = root?.querySelector(`[data-token="${tokenIndex}"]`);
    if (!(node instanceof HTMLElement)) {
      return;
    }
    pendingScroll.current = null;
    scrollToken(tokenIndex);
  }, [collapsed, flashToken, scrollGeneration, scrollToken]);

  function onSymbolClick(symbolId: string, role: "declaration" | "use"): void {
    const symbol = symbolById.get(symbolId);
    if (!symbol) {
      return;
    }
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-2 py-1 dark:border-slate-700">
        <Segmented
          size="small"
          value={mode}
          options={[
            { label: "Formatted", value: "formatted" },
            { label: "Original", value: "original" },
          ]}
          onChange={(value) => {
            if (value === "formatted" || value === "original") {
              onMode(value);
            }
          }}
        />
        <Button
          size="small"
          disabled={model.folds.length === 0}
          onClick={() => {
            setCollapsed(new Set());
          }}
        >
          Expand all
        </Button>
        <Button
          size="small"
          disabled={model.folds.length === 0}
          onClick={() => {
            setCollapsed(new Set(model.folds.map((fold) => fold.id)));
          }}
        >
          Collapse all
        </Button>
      </div>
      {warning ? (
        <Typography.Text className="shrink-0 px-3 py-1 text-xs" type="warning">
          {warning}
        </Typography.Text>
      ) : null}
      <div
        className="min-h-0 flex-1 overflow-auto bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-800 dark:bg-slate-900 dark:text-slate-100"
        ref={scrollRef}
      >
        {lines.map((pieces, line) => {
          if (lineHidden(line, model.folds, collapsed)) {
            return null;
          }
          const fold = openingFold(line, model.folds);
          const folded = fold ? collapsed.has(fold.id) : false;
          return (
            <div className="flex min-h-5" key={line}>
              {fold ? (
                <button
                  aria-expanded={!folded}
                  aria-label={folded ? "Expand block" : "Collapse block"}
                  className="inline-flex h-5 w-4 shrink-0 items-center justify-center text-slate-400"
                  type="button"
                  onClick={() => {
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(fold.id)) {
                        next.delete(fold.id);
                      } else {
                        next.add(fold.id);
                      }
                      return next;
                    });
                  }}
                >
                  {folded ? (
                    <CaretRightOutlined className="text-[10px]" />
                  ) : (
                    <CaretDownOutlined className="text-[10px]" />
                  )}
                </button>
              ) : (
                <span className="inline-block w-4 shrink-0" />
              )}
              <span className="whitespace-pre">
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
                {folded ? <span className="text-slate-400"> …</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
    return (
      <span className="font-semibold text-blue-700 dark:text-blue-300">{piece.text}</span>
    );
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
    const kind = kinds[kindKey(piece.schema, piece.name)];
    return (
      <Tag
        className="mx-0 inline-flex cursor-pointer align-baseline font-mono text-[11px] leading-5"
        color={kind ? KIND_COLOR[kind] : "default"}
        onClick={() => {
          onOpenObject({ schema: piece.schema ?? "", name: piece.name ?? "" });
        }}
      >
        {piece.text}
      </Tag>
    );
  }
  if (piece.kind === "system") {
    return <span className={symbolClass(piece.kind, false, flash)}>{piece.text}</span>;
  }
  if (piece.symbolId && piece.role) {
    const symbolId = piece.symbolId;
    const role = piece.role;
    const body = (
      <span
        className={symbolClass(piece.kind, true, flash)}
        data-token={piece.first ? piece.tokenIndex : undefined}
        role="button"
        tabIndex={0}
        onClick={() => {
          onSymbolClick(symbolId, role);
        }}
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
    return piece.hint ? <Tooltip title={piece.hint}>{body}</Tooltip> : body;
  }
  return (
    <span data-token={piece.first ? piece.tokenIndex : undefined}>{piece.text}</span>
  );
}
