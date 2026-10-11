import { readdirSync, readFileSync } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";

const FLOWS_ROOT = path.join(process.cwd(), "content", "flows");

export const FLOW_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface FlowDoc {
  /** Latest: `[slug]`. Archive: `[slug, YYYY-MM-DD]`. */
  slug: string[];
  /** Latest page slug, even when this doc is an archive. */
  currentSlug: string[];
  objectName: string;
  title: string;
  feature?: string;
  /** Markdown with YAML frontmatter removed. */
  content: string;
  lastAnalyzed?: string;
  isArchive: boolean;
}

export interface FlowVersion {
  date: string;
  slug: string;
  href: string;
  current: boolean;
}

export function flowHref(slug: string[]): string {
  return `/docs/flows/${slug.map(encodeURIComponent).join("/")}`;
}

function splitFrontmatter(raw: string): { fields: Record<string, string>; body: string } {
  const match = /^(---\r?\n)([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) return { fields: {}, body: raw };

  const fields: Record<string, string> = {};
  for (const line of match[2]!.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) fields[key] = value;
  }

  return { fields, body: raw.slice(match[0].length).replace(/^(?:\r?\n)+/, "") };
}

function titleFrom(body: string, fallback: string): string {
  const heading = body.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || fallback;
}

function readFlowDoc(filePath: string, slug: string, isArchive: boolean, archiveDate?: string): FlowDoc {
  const raw = readFileSync(filePath, "utf8");
  const { fields, body } = splitFrontmatter(raw);
  const currentSlug = [slug];
  return {
    slug: isArchive && archiveDate ? [...currentSlug, archiveDate] : currentSlug,
    currentSlug,
    objectName: slug,
    title: titleFrom(body, fields.feature ?? slug),
    feature: fields.feature,
    content: body,
    lastAnalyzed: fields["last-analyzed"],
    isArchive,
  };
}

export function loadFlowDocs(root: string): FlowDoc[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }

  const latestNames = new Set(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("."))
      .map((entry) => entry.name),
  );

  const docs: FlowDoc[] = [];
  for (const name of latestNames) {
    const slug = name.replace(/\.md$/, "");
    docs.push(readFlowDoc(path.join(root, name), slug, false));
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    if (!latestNames.has(`${entry.name}.md`)) continue;
    const archiveDir = path.join(root, entry.name);
    for (const child of readdirSync(archiveDir, { withFileTypes: true })) {
      if (!child.isFile() || !child.name.endsWith(".md")) continue;
      const date = child.name.slice(0, -3);
      if (!FLOW_DATE_RE.test(date)) continue;
      docs.push(readFlowDoc(path.join(archiveDir, child.name), entry.name, true, date));
    }
  }

  return docs.sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title);
    if (byTitle !== 0) return byTitle;
    if (a.isArchive !== b.isArchive) return a.isArchive ? 1 : -1;
    return (b.slug.at(-1) ?? "").localeCompare(a.slug.at(-1) ?? "");
  });
}

export function currentFlowDocs(docs: FlowDoc[]): FlowDoc[] {
  return docs.filter((doc) => !doc.isArchive);
}

export function flowVersions(docs: FlowDoc[], currentSlug: string[]): FlowVersion[] {
  const key = currentSlug.join("/");
  const current = docs.find((doc) => !doc.isArchive && doc.currentSlug.join("/") === key);
  if (!current) return [];

  const versions: FlowVersion[] = [];
  const seen = new Set<string>();
  if (current.lastAnalyzed && FLOW_DATE_RE.test(current.lastAnalyzed)) {
    versions.push({
      date: current.lastAnalyzed,
      slug: current.slug.join("/"),
      href: flowHref(current.slug),
      current: true,
    });
    seen.add(current.lastAnalyzed);
  } else {
    versions.push({
      date: "latest",
      slug: current.slug.join("/"),
      href: flowHref(current.slug),
      current: true,
    });
  }

  for (const doc of docs) {
    if (!doc.isArchive || doc.currentSlug.join("/") !== key) continue;
    const date = doc.slug.at(-1) ?? "";
    if (!FLOW_DATE_RE.test(date) || seen.has(date)) continue;
    versions.push({
      date,
      slug: doc.slug.join("/"),
      href: flowHref(doc.slug),
      current: false,
    });
  }

  return versions.sort((a, b) => {
    if (a.date === "latest") return -1;
    if (b.date === "latest") return 1;
    return b.date.localeCompare(a.date) || Number(b.current) - Number(a.current);
  });
}

export function getAllFlowDocs(): FlowDoc[] {
  return loadFlowDocs(FLOWS_ROOT);
}

export function getCurrentFlowDocs(): FlowDoc[] {
  return currentFlowDocs(getAllFlowDocs());
}

export function getFlowDoc(slug: string[]): FlowDoc | undefined {
  const key = slug.join("/");
  return getAllFlowDocs().find((doc) => doc.slug.join("/") === key);
}

export function getFlowVersions(currentSlug: string[]): FlowVersion[] {
  return flowVersions(getAllFlowDocs(), currentSlug);
}
