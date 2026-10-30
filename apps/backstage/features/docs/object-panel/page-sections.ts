export type PageSection = {
  id: string;
  title: string;
  depth: 2 | 3;
};

/** Stable anchor for a heading. Repeated titles share an id. */
export function sectionId(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "section"
  );
}

/** H2 and H3 titles, with the same ids the heading renderer assigns. */
export function pageSections(markdown: string): PageSection[] {
  const sections: PageSection[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const title = match[2]!.replace(/[*_`]/g, "").trim();
    sections.push({
      id: sectionId(title),
      title,
      depth: match[1]!.length as 2 | 3,
    });
  }

  return sections;
}
