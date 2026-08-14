import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createSlugger } from "./slugify";

const FEATURES_DIR = path.join(process.cwd(), "content", "features");

export interface FeatureSection {
  id: string;
  title: string;
  depth: 2 | 3;
}

export interface FeatureDoc {
  slug: string;
  title: string;
  content: string;
  sections: FeatureSection[];
  lastAnalyzed?: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseFeatureFile(raw: string): { content: string; lastAnalyzed?: string } {
  const match = raw.match(FRONTMATTER_RE);
  const body = (match ? raw.slice(match[0].length) : raw).replace(/\r\n/g, "\n");
  const lastAnalyzed = match?.[1]
    ?.match(/^last-analyzed:\s*(.+?)\s*$/m)?.[1]
    ?.trim();
  return { content: body, lastAnalyzed };
}

function stripFrontmatter(raw: string): string {
  return parseFeatureFile(raw).content;
}

function titleFromContent(content: string, fallback: string): string {
  const heading = content.match(/^#\s+(.+)$/m);
  return heading?.[1] ? heading[1].trim() : fallback;
}

// Mirrors the heading ids assigned by lib/markdown-components.tsx's heading
// renderers — both derive ids from the same cleaned heading text, in document
// order, via a fresh createSlugger() per document.
function extractSections(content: string): FeatureSection[] {
  const slugify = createSlugger();
  const sections: FeatureSection[] = [];
  let inFence = false;

  for (const line of content.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const title = match[2]!.replace(/[*_`]/g, "").trim();
    sections.push({ id: slugify(title), title, depth: match[1]!.length as 2 | 3 });
  }

  return sections;
}

export function getFeatureSlugs(): string[] {
  return readdirSync(FEATURES_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

export function getFeatureDoc(slug: string): FeatureDoc {
  const raw = readFileSync(path.join(FEATURES_DIR, `${slug}.md`), "utf8");
  const content = stripFrontmatter(raw);
  const { lastAnalyzed } = parseFeatureFile(raw);
  return {
    slug,
    title: titleFromContent(content, slug),
    content,
    sections: extractSections(content),
    lastAnalyzed,
  };
}

export function getAllFeatureDocs(): FeatureDoc[] {
  return getFeatureSlugs().map((slug) => getFeatureDoc(slug));
}
