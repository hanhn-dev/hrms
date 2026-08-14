"use client";

import { useEffect, useState } from "react";
import type { FeatureSection } from "@/lib/features";

export function useActiveSectionId(sections: FeatureSection[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const article = headings[0]!.closest("article");
    const scrollContainer = article ?? window;

    function updateActive(): void {
      const header = article?.parentElement?.querySelector("[data-doc-header]");
      const threshold = header
        ? header.getBoundingClientRect().bottom
        : (article?.getBoundingClientRect().top ?? 0);
      let current = headings[0]!.id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top - threshold <= 8) {
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

/** Nearest H2 title for the heading currently in view (H3s map to their parent H2). */
export function activeSectionTitle(
  sections: FeatureSection[],
  activeId: string | null,
): string | null {
  if (!activeId) return null;
  let lastH2: string | null = null;
  for (const section of sections) {
    if (section.depth === 2) lastH2 = section.title;
    if (section.id === activeId) return lastH2 ?? section.title;
  }
  return null;
}
