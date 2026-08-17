import { getAllWikiDocs } from "./docs";
import { getCurrentFeatureDocs } from "./features";
import { getAllWikiPages, prettifyWikiSegment } from "./llm-wiki";
import type { SearchHit } from "./search-types";

export type { SearchHit } from "./search-types";

const MAX_HITS = 40;
const SNIPPET_RADIUS = 48;

interface SearchRecord {
  href: string;
  crumbs: string[];
  title: string;
  headings: string[];
  body: string;
}

function uniqueCrumbs(parts: string[]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    const crumb = part.trim();
    if (!crumb) continue;
    if (out[out.length - 1] === crumb) continue;
    out.push(crumb);
  }
  return out;
}

function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  let inFence = false;
  for (const line of content.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    headings.push(match[2]!.replace(/[*_`]/g, "").trim());
  }
  return headings;
}

function searchableBody(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildIndex(): SearchRecord[] {
  const features = getCurrentFeatureDocs().map((doc) => ({
    href: `/features/${doc.slug}`,
    crumbs: uniqueCrumbs(["Features", doc.menu, doc.submenu ?? "", doc.title]),
    title: doc.title,
    headings: extractHeadings(doc.content),
    body: searchableBody(doc.content),
  }));

  const wiki = getAllWikiPages().map((page) => {
    const folderCrumbs = page.slug.slice(0, -1).map(prettifyWikiSegment);
    return {
      href: page.slug.length === 0 ? "/wiki" : `/wiki/${page.slug.join("/")}`,
      crumbs: uniqueCrumbs(["Wiki", ...folderCrumbs, page.title]),
      title: page.title,
      headings: extractHeadings(page.content),
      body: searchableBody(page.content),
    };
  });

  const docs = getAllWikiDocs().map((doc) => ({
    href: `/docs/${doc.slug}`,
    crumbs: uniqueCrumbs(["Docs", doc.category, doc.title]),
    title: doc.title,
    headings: extractHeadings(doc.content),
    body: searchableBody(doc.content),
  }));

  return [...features, ...wiki, ...docs];
}

let cachedIndex: SearchRecord[] | undefined;

export function invalidateSearchIndex(): void {
  cachedIndex = undefined;
}

function getSearchIndex(): SearchRecord[] {
  if (process.env.NODE_ENV === "production" && cachedIndex) {
    return cachedIndex;
  }
  const index = buildIndex();
  cachedIndex = index;
  return index;
}

function includesNormalized(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

function snippetAround(text: string, query: string): string | undefined {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query);
  if (index < 0) return undefined;
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + query.length + SNIPPET_RADIUS);
  const slice = text.slice(start, end).trim();
  if (!slice) return undefined;
  return `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`;
}

function scoreRecord(record: SearchRecord, query: string): number {
  const title = record.title.toLowerCase();
  const crumbs = record.crumbs.map((crumb) => crumb.toLowerCase());
  const headings = record.headings.map((heading) => heading.toLowerCase());
  const body = record.body.toLowerCase();

  let score = 0;
  if (title === query) score += 200;
  else if (title.includes(query)) score += 100;

  if (crumbs.some((crumb) => crumb === query || crumb.includes(query))) score += 50;
  if (headings.some((heading) => heading.includes(query))) score += 30;
  if (body.includes(query)) score += 10;

  return score;
}

export function searchDocuments(query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  return getSearchIndex()
    .map((record) => {
      const score = scoreRecord(record, needle);
      if (score === 0) return null;
      const snippet =
        snippetAround(record.title, needle) ||
        record.headings.find((heading) => includesNormalized(heading, needle)) ||
        snippetAround(record.body, needle);
      return { record, score, snippet };
    })
    .filter((hit): hit is { record: SearchRecord; score: number; snippet: string | undefined } => hit !== null)
    .sort((a, b) => b.score - a.score || a.record.crumbs.join("").localeCompare(b.record.crumbs.join("")))
    .slice(0, MAX_HITS)
    .map(({ record, snippet }) => ({
      href: record.href,
      crumbs: record.crumbs,
      snippet: snippet && snippet !== record.title ? snippet : undefined,
    }));
}
