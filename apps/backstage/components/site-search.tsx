"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { SearchHit } from "@/lib/search-types";

const DEBOUNCE_MS = 180;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({
  text,
  query,
}: {
  text: string;
  query: string;
}): React.JSX.Element {
  const needle = query.trim();
  if (needle.length < 2) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, "ig"));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark
            className="rounded-sm bg-amber-200/80 text-inherit dark:bg-amber-400/30"
            key={`${part}-${index}`}
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function SearchIcon(): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function SiteSearch(): React.JSX.Element {
  const inputId = useId();
  const listId = useId();
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searching, setSearching] = useState(false);

  const close = useCallback((): void => {
    setOpen(false);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    close();
    setQuery("");
    setHits([]);
  }, [pathname, close]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [close]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
      inputRef.current?.blur();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    const needle = query.trim();
    abortRef.current?.abort();

    if (needle.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);

    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(needle)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Search failed");
          return (await response.json()) as SearchHit[];
        })
        .then((nextHits) => {
          setHits(nextHits);
          setActiveIndex(0);
          setSearching(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setHits([]);
          setSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (!open || hits.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter") {
      const hit = hits[activeIndex];
      if (!hit) return;
      event.preventDefault();
      router.push(hit.href);
      close();
    }
  }

  const showPanel = open && query.trim().length >= 2;
  const empty = showPanel && !searching && hits.length === 0;

  return (
    <div className="relative w-full max-w-md" ref={rootRef}>
      <label className="sr-only" htmlFor={inputId}>
        Search documents
      </label>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-slate-400 focus-within:bg-white dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-500 dark:focus-within:bg-slate-950">
        <SearchIcon />
        <input
          aria-activedescendant={
            showPanel && hits[activeIndex] ? `${listId}-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showPanel}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          id={inputId}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search documents…"
          ref={inputRef}
          role="combobox"
          spellCheck={false}
          type="search"
          value={query}
        />
        <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 font-sans text-[10px] tracking-wide text-slate-400 sm:inline dark:border-slate-700 dark:text-slate-500">
          Ctrl K
        </kbd>
      </div>

      {showPanel ? (
        <ul
          className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[min(24rem,70vh)] overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          id={listId}
          role="listbox"
        >
          {searching && hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              Searching…
            </li>
          ) : null}
          {empty ? (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              No documents match “{query.trim()}”.
            </li>
          ) : null}
          {hits.map((hit, index) => {
            const active = index === activeIndex;
            return (
              <li id={`${listId}-${index}`} key={hit.href} role="option" aria-selected={active}>
                <Link
                  className={
                    "block px-3 py-2 no-underline " +
                    (active
                      ? "bg-slate-100 dark:bg-slate-800"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60")
                  }
                  href={hit.href}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <p className="text-sm leading-snug font-medium break-words text-slate-800 dark:text-slate-100">
                    {hit.crumbs.map((crumb, crumbIndex) => (
                      <span key={`${hit.href}-${crumbIndex}`}>
                        {crumbIndex > 0 ? (
                          <span className="mx-1.5 font-normal text-slate-300 dark:text-slate-600">
                            &gt;
                          </span>
                        ) : null}
                        <Highlight query={query} text={crumb} />
                      </span>
                    ))}
                  </p>
                  {hit.snippet ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      <Highlight query={query} text={hit.snippet} />
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
