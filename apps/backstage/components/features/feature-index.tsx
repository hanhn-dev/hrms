"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  groupFeaturesByMenu,
  type FeatureNavItem,
} from "@/lib/feature-menu";

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

export function FeatureIndex({
  docs,
}: {
  docs: FeatureNavItem[];
}): React.JSX.Element {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const filtered = needle
      ? docs.filter((doc) => doc.title.toLowerCase().includes(needle))
      : docs;
    return groupFeaturesByMenu(filtered);
  }, [docs, needle]);

  if (docs.length === 0) {
    return (
      <p className="mt-8 text-sm italic text-slate-500 dark:text-slate-400">
        No feature guides generated yet.
      </p>
    );
  }

  return (
    <>
      <div className="mt-6">
        <label className="sr-only" htmlFor={inputId}>
          Search feature names
        </label>
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-slate-400 focus-within:bg-white dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-slate-500 dark:focus-within:bg-slate-950">
          <SearchIcon />
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            id={inputId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search feature names…"
            spellCheck={false}
            type="search"
            value={query}
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 text-sm italic text-slate-500 dark:text-slate-400">
          No features match “{query.trim()}”.
        </p>
      ) : (
        groups.map((group) => (
          <section className="mt-8" key={group.menu}>
            <h2 className="text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {group.menu}
            </h2>
            <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {group.subgroups
                .flatMap((subgroup) => subgroup.items)
                .map((doc) => (
                  <li key={doc.slug}>
                    <Link
                      className="flex items-baseline justify-between gap-4 px-4 py-3 no-underline hover:bg-slate-50 dark:hover:bg-slate-900"
                      href={`/features/${doc.slug}`}
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {doc.title}
                      </span>
                      {doc.submenu ? (
                        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                          {doc.submenu}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
