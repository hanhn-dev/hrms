import { isSystemProcedureName } from "@/features/employer/inspector/script-builtins";

export type ObjectMention = {
  schema: string;
  name: string;
};

const SYSTEM_SCHEMAS = new Set(["master", "sys", "tempdb", "msdb", "information_schema"]);

const MODULE_PREFIX = /^(?:SP_|USP_|Fn_|FN_|Ufn_|TVF_)/i;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function unwrap(part: string): string {
  const trimmed = part.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]") && trimmed.length > 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isTableName(name: string): boolean {
  return /^t[A-Za-z0-9_]{4,}$/i.test(name);
}

/**
 * A single inline code span that names one catalog object.
 * Temp tables, variables, system schemas, built-in procedures, and lists stay plain.
 */
export function objectMention(text: string): ObjectMention | null {
  const trimmed = text.trim();
  if (!trimmed || /[\s,;()]/.test(trimmed)) return null;

  const parts = trimmed.split(".").map(unwrap);
  if (parts.length === 0 || parts.some((part) => !IDENT.test(part))) return null;
  if (parts.some((part) => SYSTEM_SCHEMAS.has(part.toLowerCase()))) return null;

  if (parts.length === 1) {
    const name = parts[0]!;
    if (isSystemProcedureName(name) || !MODULE_PREFIX.test(name)) return null;
    return { schema: "dbo", name };
  }

  if (parts.length === 2) {
    const left = parts[0]!;
    const right = parts[1]!;
    if (left.toLowerCase() === "dbo") {
      if (isSystemProcedureName(right)) return null;
      return { schema: "dbo", name: right };
    }
    if (isTableName(left)) return { schema: "dbo", name: left };
    return null;
  }

  return null;
}

const DATABASE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function posixJoin(base: string[], relative: string): string {
  const segments = [...base];
  for (const part of relative.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return segments.join("/");
}

/**
 * Resolves a markdown link relative to the current page into `/docs/database/...`.
 * Absolute and non-markdown links pass through unchanged. Archive pages resolve
 * siblings against the database folder, not the dated snapshot folder.
 */
export function resolveDatabaseDocHref(href: string, currentSlug: string[]): string {
  const [target = "", hash] = href.split("#");
  if (!target.endsWith(".md")) return href;

  const logicalSlug = DATABASE_DATE_RE.test(currentSlug.at(-1) ?? "")
    ? currentSlug.slice(0, -1)
    : currentSlug;
  const resolved = posixJoin(logicalSlug.slice(0, -1), target).replace(/\.md$/, "");
  return `/docs/database/${resolved}${hash ? `#${hash}` : ""}`;
}

const DATABASE_SOURCE_FILE = /^HRMS-DATABASE\/(?:[A-Za-z0-9_.-]+\/)+[A-Za-z0-9_.-]+\.sql$/;

/** A checkout-relative SQL path, such as the script named under Steps. */
export function databaseSourcePath(text: string): string | null {
  const trimmed = text.trim();
  if (!DATABASE_SOURCE_FILE.test(trimmed) || trimmed.split("/").includes("..")) return null;
  return trimmed;
}

/** A database-document href for this catalog opens that object instead of navigating. */
export function objectFromDatabaseHref(href: string, database: string): ObjectMention | null {
  const path = href.split(/[?#]/, 1)[0] ?? "";
  if (!path.startsWith("/docs/database/")) return null;
  const parts = path
    .slice("/docs/database/".length)
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
  if (parts[0] !== database || !parts[1] || !IDENT.test(parts[1])) return null;
  return { schema: "dbo", name: parts[1] };
}
