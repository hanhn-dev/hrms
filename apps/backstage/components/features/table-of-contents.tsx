"use client";

import { useEffect, useState } from "react";
import type { FeatureSection } from "../../lib/features";

const ACTIVE_OFFSET_PX = 96;

function useActiveSectionId(sections: FeatureSection[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const scrollContainer = headings[0]!.closest("article") ?? window;

    function updateActive(): void {
      let current = headings[0]!.id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top - ACTIVE_OFFSET_PX <= 0) {
          current = heading.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    }

    updateActive();
    scrollContainer.addEventListener("scroll", updateActive, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", updateActive);
  }, [sections]);

  return activeId;
}

function SectionLinks({
  sections,
  activeId,
  onNavigate,
}: {
  sections: FeatureSection[];
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
              className={
                (section.depth === 3 ? "block pl-3 " : "block ") +
                (isActive
                  ? "font-medium text-slate-900 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white")
              }
              aria-current={isActive ? "location" : undefined}
              href={`#${section.id}`}
              onClick={onNavigate}
            >
              {section.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function TableOfContents({
  sections,
}: {
  sections: FeatureSection[];
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const activeId = useActiveSectionId(sections);

  return (
    <>
      <nav
        className={
          "hidden shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 py-4 lg:flex dark:border-slate-800 dark:bg-slate-900 " +
          (collapsed ? "w-10 items-center px-2" : "w-64 px-4")
        }
      >
        <button
          type="button"
          aria-label={collapsed ? "Expand table of contents" : "Collapse table of contents"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={"h-4 w-4 transition-transform" + (collapsed ? " rotate-180" : "")}
          >
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>

        {collapsed ? null : (
          <>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              On this page
            </p>
            <SectionLinks sections={sections} activeId={activeId} />
          </>
        )}
      </nav>

      <div className="lg:hidden">
        <button
          type="button"
          aria-label="On this page"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg dark:bg-indigo-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="14" y2="18" />
          </svg>
        </button>

        {open ? (
          <div className="fixed bottom-20 right-6 z-50 max-h-[60vh] w-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              On this page
            </p>
            <SectionLinks
              sections={sections}
              activeId={activeId}
              onNavigate={() => setOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
