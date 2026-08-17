import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PLATFORM_MENU } from "./feature-menu";
import { createSlugger } from "./slugify";

export const FEATURES_DIR = path.join(process.cwd(), "content", "features");
export const FEATURE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const PROPOSALS_DIR_NAME = "_proposals";

export interface FeatureSection {
  id: string;
  title: string;
  depth: 2 | 3;
}

export interface FeatureDoc {
  slug: string;
  currentSlug: string;
  title: string;
  content: string;
  sections: FeatureSection[];
  lastAnalyzed?: string;
  menu: string;
  submenu?: string;
  isArchive: boolean;
}

export interface FeatureVersion {
  date: string;
  slug: string;
  href: string;
  current: boolean;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function yamlScalar(block: string, key: string): string | undefined {
  const raw = block.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1]?.trim();
  if (!raw) return undefined;
  return raw.replace(/^['"]|['"]$/g, "");
}

export function parseFeatureFile(raw: string): {
  content: string;
  lastAnalyzed?: string;
  menu: string;
  submenu?: string;
} {
  const match = raw.match(FRONTMATTER_RE);
  const body = (match ? raw.slice(match[0].length) : raw).replace(/\r\n/g, "\n");
  const block = match?.[1] ?? "";
  return {
    content: body,
    lastAnalyzed: yamlScalar(block, "last-analyzed"),
    menu: yamlScalar(block, "menu") ?? PLATFORM_MENU,
    submenu: yamlScalar(block, "submenu"),
  };
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

function walk(dir: string, base: string[] = []): string[] {
  if (!existsSync(dir)) return [];
  let out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_")) continue;
    if (entry.isDirectory()) {
      out = out.concat(walk(path.join(dir, entry.name), [...base, entry.name]));
    } else if (entry.name.endsWith(".md")) {
      out.push([...base, entry.name.replace(/\.md$/, "")].join("/"));
    }
  }
  return out;
}

export function slugToFilePath(slug: string): string {
  const parts = slug.split("/").filter(Boolean);
  if (
    parts.length === 0 ||
    parts.some((part) => part === "." || part === ".." || part.startsWith("_"))
  ) {
    throw new Error(`Invalid feature slug: ${slug}`);
  }
  const filePath = path.resolve(path.join(FEATURES_DIR, ...parts) + ".md");
  const relative = path.relative(path.resolve(FEATURES_DIR), filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Invalid feature slug: ${slug}`);
  }
  return filePath;
}

export function isFeatureArchiveSlug(slug: string): boolean {
  const parts = slug.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || !FEATURE_DATE_RE.test(last)) return false;
  const parent = parts.slice(0, -1).join("/");
  if (!parent) return false;
  try {
    return existsSync(slugToFilePath(parent));
  } catch {
    return false;
  }
}

export function currentSlugOf(slug: string): string {
  return isFeatureArchiveSlug(slug)
    ? slug.split("/").filter(Boolean).slice(0, -1).join("/")
    : slug;
}

export function featureFileExists(slug: string): boolean {
  try {
    return existsSync(slugToFilePath(slug));
  } catch {
    return false;
  }
}

export function readFeatureRaw(slug: string): string {
  return readFileSync(slugToFilePath(slug), "utf8");
}

export function hashFeatureRaw(raw: string): string {
  return createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
}

export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function upsertLastAnalyzed(raw: string, date: string): string {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(FRONTMATTER_RE);
  if (!match) {
    return `---\nlast-analyzed: ${date}\n---\n${normalized}`;
  }
  const block = match[1] ?? "";
  const nextBlock = /^last-analyzed:/m.test(block)
    ? block.replace(/^last-analyzed:\s*.+$/m, `last-analyzed: ${date}`)
    : `${block.replace(/\s*$/, "")}\nlast-analyzed: ${date}\n`;
  return `---\n${nextBlock.replace(/\s*$/, "\n")}---\n${normalized.slice(match[0].length)}`;
}

export function getFeatureSlugs(): string[] {
  return walk(FEATURES_DIR);
}

export function getFeatureDoc(slug: string): FeatureDoc {
  const raw = readFeatureRaw(slug);
  const { content, lastAnalyzed, menu, submenu } = parseFeatureFile(raw);
  const isArchive = isFeatureArchiveSlug(slug);
  const currentSlug = currentSlugOf(slug);
  const fallback = slug.split("/").pop() ?? slug;
  return {
    slug,
    currentSlug,
    title: titleFromContent(content, fallback),
    content,
    sections: extractSections(content),
    lastAnalyzed,
    menu,
    submenu,
    isArchive,
  };
}

export function getAllFeatureDocs(): FeatureDoc[] {
  return getFeatureSlugs().map((slug) => getFeatureDoc(slug));
}

export function getCurrentFeatureDocs(): FeatureDoc[] {
  return getAllFeatureDocs().filter((doc) => !doc.isArchive);
}

export function getFeatureVersions(currentSlug: string): FeatureVersion[] {
  const current = getFeatureDoc(currentSlug);
  const versions: FeatureVersion[] = [];
  const seen = new Set<string>();

  if (current.lastAnalyzed && FEATURE_DATE_RE.test(current.lastAnalyzed)) {
    versions.push({
      date: current.lastAnalyzed,
      slug: currentSlug,
      href: `/features/${currentSlug}`,
      current: true,
    });
    seen.add(current.lastAnalyzed);
  } else {
    versions.push({
      date: "latest",
      slug: currentSlug,
      href: `/features/${currentSlug}`,
      current: true,
    });
  }

  const archiveDir = path.join(FEATURES_DIR, ...currentSlug.split("/").filter(Boolean));
  if (existsSync(archiveDir) && statSync(archiveDir).isDirectory()) {
    for (const name of readdirSync(archiveDir)) {
      if (!name.endsWith(".md")) continue;
      const date = name.slice(0, -3);
      if (!FEATURE_DATE_RE.test(date) || seen.has(date)) continue;
      versions.push({
        date,
        slug: `${currentSlug}/${date}`,
        href: `/features/${currentSlug}/${date}`,
        current: false,
      });
    }
  }

  return versions.sort((a, b) => {
    if (a.date === "latest") return -1;
    if (b.date === "latest") return 1;
    return b.date.localeCompare(a.date) || Number(b.current) - Number(a.current);
  });
}

export function archiveThenWrite(slug: string, markdown: string): string | undefined {
  const filePath = slugToFilePath(slug);
  let archivedAs: string | undefined;
  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, "utf8");
    const { lastAnalyzed } = parseFeatureFile(existing);
    const today = todayIsoDate();
    if (lastAnalyzed && FEATURE_DATE_RE.test(lastAnalyzed) && lastAnalyzed !== today) {
      const archivePath = slugToFilePath(`${slug}/${lastAnalyzed}`);
      if (!existsSync(archivePath)) {
        mkdirSync(path.dirname(archivePath), { recursive: true });
        writeFileSync(archivePath, existing.replace(/\r\n/g, "\n"), "utf8");
        archivedAs = lastAnalyzed;
      }
    }
  }

  const today = todayIsoDate();
  const next = upsertLastAnalyzed(markdown, today);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, next, "utf8");
  return archivedAs;
}
