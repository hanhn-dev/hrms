"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Collapse } from "antd";
import type { FieldSectionSummary } from "@hrms/db";
import { sectionAccordionKey, sectionTableIsOpen } from "@/features/employer/fields/section-list";

export type SectionPageResult<T> = {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  script: string;
};

export function SectionAccordion({
  sections,
  emptyText,
  initialOpenKey,
  renderPanel,
}: {
  sections: FieldSectionSummary[];
  emptyText: string;
  initialOpenKey: string | null;
  renderPanel: (section: FieldSectionSummary) => React.ReactNode;
}): React.JSX.Element {
  const [activeKey, setActiveKey] = useState<string[]>(
    initialOpenKey == null ? [] : [initialOpenKey],
  );
  if (sections.length === 0) {
    return <p className="text-slate-500">{emptyText}</p>;
  }
  return (
    <Collapse
      activeKey={activeKey}
      onChange={(key) => {
        const next = Array.isArray(key) ? key.map(String) : [String(key)];
        setActiveKey(next);
      }}
      items={sections.map((section) => {
        const key = sectionAccordionKey(section.sectionId);
        const open = sectionTableIsOpen(activeKey, key);
        return {
          key,
          label: `${section.section} (${section.fieldCount})`,
          children: open ? renderPanel(section) : null,
        };
      })}
    />
  );
}

export function SectionPageLoader<T>({
  focusField,
  revision,
  load,
  onLoaded,
  children,
}: {
  focusField: string | null;
  revision: number;
  load: (request: {
    page: number | null;
    focusField: string | null;
  }) => Promise<SectionPageResult<T>>;
  onLoaded?: () => void;
  children: (state: {
    result: SectionPageResult<T> | null;
    loading: boolean;
    error: string | null;
    onPage: (page: number) => void;
  }) => React.ReactNode;
}): React.JSX.Element {
  const [explicitPage, setExplicitPage] = useState<number | null>(null);
  const [result, setResult] = useState<SectionPageResult<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestKey = `${revision}:${explicitPage ?? "focus"}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(requestKey);
  if (errorKey !== requestKey) {
    setErrorKey(requestKey);
    setError(null);
  }
  const loading = settledKey !== requestKey;
  const loadPage = useEffectEvent(load);
  const notifyLoaded = useEffectEvent(() => {
    onLoaded?.();
  });
  const focusForFirstPage = useEffectEvent(() => focusField);

  useEffect(() => {
    let cancelled = false;
    const page = explicitPage;
    const focus = page == null ? focusForFirstPage() : null;
    void loadPage({ page, focusField: focus })
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        setResult(loaded);
        setSettledKey(`${revision}:${page ?? "focus"}`);
        notifyLoaded();
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        setSettledKey(`${revision}:${page ?? "focus"}`);
        setError(caught instanceof Error ? caught.message : "Could not load fields.");
      });
    return () => {
      cancelled = true;
    };
  }, [explicitPage, revision]);

  function onPage(page: number): void {
    setExplicitPage(page);
  }

  return <>{children({ result, loading, error, onPage })}</>;
}
