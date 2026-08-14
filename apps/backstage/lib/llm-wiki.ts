import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const WIKI_ROOT = path.join(process.cwd(), "content", "llm-wiki");

export interface LlmWikiPage {
  /** Path segments relative to the wiki root, e.g. ["identity", "purpose"]. Empty for the index page. */
  slug: string[];
  title: string;
  /** Markdown content with any YAML frontmatter stripped. */
  content: string;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

/** Title-case a wiki path segment: "approval-workflow" → "Approval Workflow". */
export function prettifyWikiSegment(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function prettifySlug(slug: string[]): string {
  return prettifyWikiSegment(slug[slug.length - 1] ?? "index");
}

function titleFromContent(content: string, slug: string[]): string {
  const heading = content.match(/^#\s+(.+)$/m);
  return heading?.[1] ? heading[1].trim() : prettifySlug(slug);
}

function walk(dir: string, base: string[] = []): string[][] {
  let out: string[][] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out = out.concat(walk(path.join(dir, entry.name), [...base, entry.name]));
    } else if (entry.name.endsWith(".md")) {
      out.push([...base, entry.name.replace(/\.md$/, "")]);
    }
  }
  return out;
}

function slugToFilePath(slug: string[]): string {
  const parts = slug.length === 0 ? ["index"] : slug;
  return path.join(WIKI_ROOT, ...parts) + ".md";
}

export function getAllWikiSlugs(): string[][] {
  return walk(WIKI_ROOT).map((slug) =>
    slug.length === 1 && slug[0] === "index" ? [] : slug,
  );
}

export function getWikiPage(slug: string[]): LlmWikiPage {
  const raw = readFileSync(slugToFilePath(slug), "utf8");
  const content = stripFrontmatter(raw);
  return { slug, title: titleFromContent(content, slug), content };
}

export function getAllWikiPages(): LlmWikiPage[] {
  return getAllWikiSlugs().map((slug) => getWikiPage(slug));
}

/**
 * Resolves a markdown link (relative to the directory of `currentSlug`) into an
 * in-app /wiki route. Non-.md links (external URLs, pure anchors) pass through unchanged.
 */
export function resolveWikiLink(href: string, currentSlug: string[]): string {
  const [target = "", hash] = href.split("#");
  if (!target.endsWith(".md")) return href;

  const currentDir = currentSlug.slice(0, -1).join("/");
  const resolved = path.posix
    .normalize(path.posix.join(currentDir, target))
    .replace(/\.md$/, "");

  return `/wiki/${resolved}${hash ? `#${hash}` : ""}`;
}
