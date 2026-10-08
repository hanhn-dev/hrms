import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DATABASE_ROOT = path.join(process.cwd(), "content", "database");

const DATABASE_LABELS: Record<string, string> = {
  hrms: "HRMS",
  "hrms-training": "HRMS Training",
  "hrms-survey": "HRMS Survey",
  "hrms-travelnexpense": "HRMS Travel and Expense",
  "hrms-resourceallocation": "HRMS Resource Allocation",
  "hrm-timeport": "HRM Timeport",
  "hrms-crbbooking": "HRMS CRB Booking",
  "hrms-translationservice": "HRMS Translation Service",
  "hrms-rewardnrecognition": "HRMS Reward and Recognition",
  "hrm-vms": "HRM VMS",
};

export const DATABASE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DatabaseObjectKind = "procedure" | "function";

export interface DatabaseDoc {
  /** Latest: `[database, object]`. Archive: `[database, object, YYYY-MM-DD]`. */
  slug: string[];
  /** Latest page slug, even when this doc is an archive. */
  currentSlug: string[];
  database: string;
  objectName: string;
  kind: DatabaseObjectKind;
  title: string;
  /** Markdown with YAML frontmatter removed. */
  content: string;
  lastAnalyzed?: string;
  isArchive: boolean;
}

export interface DatabaseVersion {
  date: string;
  slug: string;
  href: string;
  current: boolean;
}

export function databaseLabel(database: string): string {
  return DATABASE_LABELS[database] ?? database;
}

export function databaseHref(slug: string[]): string {
  return `/docs/database/${slug.map(encodeURIComponent).join("/")}`;
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

function kindFrom(value: string | undefined): DatabaseObjectKind {
  return value === "function" ? "function" : "procedure";
}

function titleFrom(body: string, fallback: string): string {
  const heading = body.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || fallback;
}

function readDoc(
  filePath: string,
  database: string,
  objectName: string,
  isArchive: boolean,
  archiveDate?: string,
): DatabaseDoc {
  const raw = readFileSync(filePath, "utf8");
  const { fields, body } = splitFrontmatter(raw);
  const currentSlug = [database, objectName];
  return {
    slug: isArchive && archiveDate ? [...currentSlug, archiveDate] : currentSlug,
    currentSlug,
    database,
    objectName,
    kind: kindFrom(fields.kind),
    title: titleFrom(body, objectName),
    content: body,
    lastAnalyzed: fields["last-analyzed"],
    isArchive,
  };
}

export function loadDatabaseDocs(root: string): DatabaseDoc[] {
  let databases: string[];
  try {
    databases = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !entry.name.startsWith("_"))
      .map((entry) => entry.name);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }

  const docs: DatabaseDoc[] = [];
  for (const database of databases) {
    const directory = path.join(root, database);
    const entries = readdirSync(directory, { withFileTypes: true });
    const latestNames = new Set(
      entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => entry.name),
    );

    for (const name of latestNames) {
      const objectName = name.replace(/\.md$/, "");
      docs.push(readDoc(path.join(directory, name), database, objectName, false));
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !latestNames.has(`${entry.name}.md`)) continue;
      const archiveDir = path.join(directory, entry.name);
      for (const child of readdirSync(archiveDir, { withFileTypes: true })) {
        if (!child.isFile() || !child.name.endsWith(".md")) continue;
        const date = child.name.slice(0, -3);
        if (!DATABASE_DATE_RE.test(date)) continue;
        docs.push(readDoc(path.join(archiveDir, child.name), database, entry.name, true, date));
      }
    }
  }

  return docs.sort((a, b) => {
    const byDatabase = databaseLabel(a.database).localeCompare(databaseLabel(b.database));
    if (byDatabase !== 0) return byDatabase;
    const byTitle = a.title.localeCompare(b.title);
    if (byTitle !== 0) return byTitle;
    if (a.isArchive !== b.isArchive) return a.isArchive ? 1 : -1;
    return (b.slug.at(-1) ?? "").localeCompare(a.slug.at(-1) ?? "");
  });
}

export function currentDatabaseDocs(docs: DatabaseDoc[]): DatabaseDoc[] {
  return docs.filter((doc) => !doc.isArchive);
}

export function databaseVersions(docs: DatabaseDoc[], currentSlug: string[]): DatabaseVersion[] {
  const key = currentSlug.join("/");
  const current = docs.find((doc) => !doc.isArchive && doc.currentSlug.join("/") === key);
  if (!current) return [];

  const versions: DatabaseVersion[] = [];
  const seen = new Set<string>();
  if (current.lastAnalyzed && DATABASE_DATE_RE.test(current.lastAnalyzed)) {
    versions.push({
      date: current.lastAnalyzed,
      slug: current.slug.join("/"),
      href: databaseHref(current.slug),
      current: true,
    });
    seen.add(current.lastAnalyzed);
  } else {
    versions.push({
      date: "latest",
      slug: current.slug.join("/"),
      href: databaseHref(current.slug),
      current: true,
    });
  }

  for (const doc of docs) {
    if (!doc.isArchive || doc.currentSlug.join("/") !== key) continue;
    const date = doc.slug.at(-1) ?? "";
    if (!DATABASE_DATE_RE.test(date) || seen.has(date)) continue;
    versions.push({
      date,
      slug: doc.slug.join("/"),
      href: databaseHref(doc.slug),
      current: false,
    });
  }

  return versions.sort((a, b) => {
    if (a.date === "latest") return -1;
    if (b.date === "latest") return 1;
    return b.date.localeCompare(a.date) || Number(b.current) - Number(a.current);
  });
}

export function getAllDatabaseDocs(): DatabaseDoc[] {
  return loadDatabaseDocs(DATABASE_ROOT);
}

export function getCurrentDatabaseDocs(): DatabaseDoc[] {
  return currentDatabaseDocs(getAllDatabaseDocs());
}

export function getDatabaseDoc(slug: string[]): DatabaseDoc | undefined {
  const key = slug.join("/");
  return getAllDatabaseDocs().find((doc) => doc.slug.join("/") === key);
}

export function getDatabaseVersions(currentSlug: string[]): DatabaseVersion[] {
  return databaseVersions(getAllDatabaseDocs(), currentSlug);
}

/**
 * Resolves a markdown link relative to the current page into `/docs/database/...`.
 * Absolute and non-markdown links pass through unchanged. Archive pages resolve
 * siblings against the database folder, not the dated snapshot folder.
 */
export function resolveDatabaseDocLink(href: string, currentSlug: string[]): string {
  const [target = "", hash] = href.split("#");
  if (!target.endsWith(".md")) return href;

  const logicalSlug = DATABASE_DATE_RE.test(currentSlug.at(-1) ?? "")
    ? currentSlug.slice(0, -1)
    : currentSlug;
  const currentDir = logicalSlug.slice(0, -1).join("/");
  const resolved = path.posix
    .normalize(path.posix.join(currentDir, target))
    .replace(/\.md$/, "");

  return `/docs/database/${resolved}${hash ? `#${hash}` : ""}`;
}
