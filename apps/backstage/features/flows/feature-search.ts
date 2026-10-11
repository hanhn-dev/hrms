export type FeatureDocHit = {
  slug: string;
  title: string;
  feature?: string;
};

export type FeatureSearchHit = {
  slug: string;
  title: string;
  href: string;
};

export function searchFeatureDocs(docs: readonly FeatureDocHit[], query: string): FeatureSearchHit[] {
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  if (words.length === 0) return [];

  return docs
    .filter((doc) => {
      const haystack = `${doc.title} ${doc.feature ?? ""} ${doc.slug.replace(/-/g, " ")}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      href: `/docs/flows/${encodeURIComponent(doc.slug)}`,
    }));
}

export function sequenceCharts(markdown: string): string[] {
  const charts: string[] = [];
  const pattern = /```mermaid\r?\n([\s\S]*?)```/g;
  for (const match of markdown.matchAll(pattern)) {
    const chart = match[1]?.trim() ?? "";
    if (chart.startsWith("sequenceDiagram")) charts.push(chart);
  }
  return charts;
}
