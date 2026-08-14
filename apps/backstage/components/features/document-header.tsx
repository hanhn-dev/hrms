"use client";

import Link from "next/link";
import type { FeatureDoc, FeatureSection } from "../../lib/features";
import { ReadModeToggle } from "./read-mode";
import { activeSectionTitle, useActiveSectionId } from "./use-active-section";

const NO_SECTIONS: FeatureSection[] = [];

export function DocumentHeader({
  doc,
  compact = false,
}: {
  doc: FeatureDoc;
  compact?: boolean;
}): React.JSX.Element {
  const activeId = useActiveSectionId(compact ? doc.sections : NO_SECTIONS);
  const sectionTitle = compact ? activeSectionTitle(doc.sections, activeId) : null;

  return (
    <div
      className={
        compact
          ? "flex items-center justify-between gap-4"
          : "flex items-start justify-between gap-4"
      }
    >
      <div className="min-w-0">
        <p
          className={
            compact
              ? "mt-0 mb-1 text-sm text-slate-600 dark:text-slate-400"
              : "mt-0 mb-2 text-sm text-slate-600 dark:text-slate-400"
          }
        >
          <Link
            className="no-underline hover:text-slate-900 dark:hover:text-white"
            href="/features"
          >
            ← Features
          </Link>
          <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
          <span>{doc.menu}</span>
          {doc.submenu ? (
            <>
              <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
              <span>{doc.submenu}</span>
            </>
          ) : null}
        </p>
        <h1
          className={
            compact
              ? "mt-0 mb-0 flex flex-wrap items-baseline gap-x-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white"
              : "mt-0 mb-0 text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          }
        >
          <span>
            {doc.title}
            {sectionTitle ? (
              <>
                <span
                  aria-hidden="true"
                  className="mx-2 font-normal text-slate-300 dark:text-slate-600"
                >
                  &gt;
                </span>
                <span className="font-semibold" aria-live="polite">
                  {sectionTitle}
                </span>
              </>
            ) : null}
          </span>
          {doc.lastAnalyzed ? (
            <time
              className={
                compact
                  ? "text-sm font-normal text-slate-500 dark:text-slate-400"
                  : "mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400"
              }
              dateTime={doc.lastAnalyzed}
            >
              Last analyzed: {doc.lastAnalyzed}
            </time>
          ) : null}
        </h1>
      </div>
      <ReadModeToggle compact={compact} />
    </div>
  );
}
