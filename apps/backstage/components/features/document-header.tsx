"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeatureDoc, FeatureSection, FeatureVersion } from "@/lib/features";
import { ReadModeToggle } from "./read-mode";
import { VersionSelect } from "./version-select";
import { activeSectionTitle, useActiveSectionId } from "./use-active-section";

const NO_SECTIONS: FeatureSection[] = [];

interface DocAuthState {
  canEdit: boolean;
  hasPending: boolean;
  pendingHref?: string;
}

export function DocumentHeader({
  doc,
  compact = false,
  versions = [],
}: {
  doc: FeatureDoc;
  compact?: boolean;
  versions?: FeatureVersion[];
}): React.JSX.Element {
  const activeId = useActiveSectionId(compact ? doc.sections : NO_SECTIONS);
  const sectionTitle = compact ? activeSectionTitle(doc.sections, activeId) : null;
  const [authState, setAuthState] = useState<DocAuthState>({
    canEdit: false,
    hasPending: false,
  });

  useEffect(() => {
    if (compact || doc.isArchive) return;
    let cancelled = false;
    void fetch(`/api/features/doc-state?slug=${encodeURIComponent(doc.currentSlug)}`)
      .then((response) => response.json() as Promise<DocAuthState>)
      .then((next) => {
        if (!cancelled) setAuthState(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [compact, doc.currentSlug, doc.isArchive]);

  const { canEdit, hasPending, pendingHref } = authState;

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
        {compact ? null : (
          <VersionSelect currentSlug={doc.slug} versions={versions} />
        )}
        {compact || doc.isArchive ? null : pendingHref ? (
          <p className="mt-2 mb-0 text-sm text-slate-600 dark:text-slate-400">
            <Link href={pendingHref}>A proposal is awaiting review</Link>
          </p>
        ) : hasPending ? (
          <p className="mt-2 mb-0 text-sm text-slate-600 dark:text-slate-400">
            A proposal is awaiting review
          </p>
        ) : canEdit ? (
          <p className="mt-2 mb-0 text-sm">
            <Link
              className="text-slate-700 no-underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              href={`/features/edit/${doc.currentSlug}`}
            >
              Edit this guide
            </Link>
          </p>
        ) : null}
      </div>
      <ReadModeToggle compact={compact} />
    </div>
  );
}
