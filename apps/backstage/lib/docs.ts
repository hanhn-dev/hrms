import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const WIKI_DIR = path.join(process.cwd(), "content", "wiki");

export interface WikiDoc {
  slug: string;
  title: string;
  content: string;
  /** "markdown" for well-formed CommonMark; "text" for plain-text exports that would render incorrectly if parsed as markdown. */
  format: "markdown" | "text";
  category: "Database Baselines" | "Guides";
}

function isWellFormedMarkdown(content: string): boolean {
  return content.trimStart().startsWith("# ");
}

function titleFromContent(content: string, format: WikiDoc["format"], fallback: string): string {
  if (format === "markdown") {
    const heading = content.match(/^#\s+(.+)$/m);
    return heading?.[1] ? heading[1].trim() : fallback;
  }
  const firstLine = content.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? fallback;
}

export function getWikiDocSlugs(): string[] {
  return readdirSync(WIKI_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

export function getWikiDoc(slug: string): WikiDoc {
  const content = readFileSync(path.join(WIKI_DIR, `${slug}.md`), "utf8");
  const format = isWellFormedMarkdown(content) ? "markdown" : "text";
  const category = slug.startsWith("baseline-") ? "Database Baselines" : "Guides";
  return { slug, title: titleFromContent(content, format, slug), content, format, category };
}

export function getAllWikiDocs(): WikiDoc[] {
  return getWikiDocSlugs().map((slug) => getWikiDoc(slug));
}
