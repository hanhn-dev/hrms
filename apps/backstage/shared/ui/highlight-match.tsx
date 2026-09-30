"use client";

import { createContext, useContext } from "react";
import { matchRanges } from "./match-ranges";

const SearchQueryContext = createContext("");

export function useSearchQuery(): string {
  return useContext(SearchQueryContext);
}

export function SearchQueryProvider({
  query,
  children,
}: {
  query: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return <SearchQueryContext.Provider value={query}>{children}</SearchQueryContext.Provider>;
}

export function HighlightMatch({
  text,
  query,
}: {
  text: string;
  query: string;
}): React.JSX.Element {
  const ranges = matchRanges(text, query);
  if (ranges.length === 0) {
    return <>{text}</>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) {
      nodes.push(<span key={`text-${cursor}`}>{text.slice(cursor, start)}</span>);
    }
    nodes.push(
      <mark
        className="rounded-sm bg-amber-200/80 text-inherit dark:bg-amber-400/30"
        key={`mark-${start}`}
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  if (cursor < text.length) {
    nodes.push(<span key={`text-${cursor}`}>{text.slice(cursor)}</span>);
  }
  return <>{nodes}</>;
}
