import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PLATFORM_MENU } from "./feature-menu";
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
  menu: string;
  submenu?: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function yamlScalar(block: string, key: string): string | undefined {
  const raw = block.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1]?.trim();
  if (!raw) return undefined;
  return raw.replace(/^['"]|['"]$/g, "");
}

function parseFeatureFile(raw: string): {
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
  let out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out = out.concat(walk(path.join(dir, entry.name), [...base, entry.name]));
    } else if (entry.name.endsWith(".md")) {
      out.push([...base, entry.name.replace(/\.md$/, "")].join("/"));
    }
  }
  return out;
}

function slugToFilePath(slug: string): string {
  const parts = slug.split("/").filter(Boolean);
  if (
    parts.length === 0 ||
    parts.some((part) => part === "." || part === "..")
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

export function getFeatureSlugs(): string[] {
  return walk(FEATURES_DIR);
}

export function getFeatureDoc(slug: string): FeatureDoc {
  const raw = readFileSync(slugToFilePath(slug), "utf8");
  const { content, lastAnalyzed, menu, submenu } = parseFeatureFile(raw);
  const fallback = slug.split("/").pop() ?? slug;
  return {
    slug,
    title: titleFromContent(content, fallback),
    content,
    sections: extractSections(content),
    lastAnalyzed,
    menu,
    submenu,
  };
}

export function getAllFeatureDocs(): FeatureDoc[] {
  return getFeatureSlugs().map((slug) => getFeatureDoc(slug));
}
