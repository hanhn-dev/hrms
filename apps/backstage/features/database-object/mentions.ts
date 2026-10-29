import { isSystemProcedureName } from "@/features/employer/inspector/script-builtins";

export type ObjectRef = {
  schema: string;
  name: string;
};

export type ObjectKindMap = Readonly<Record<string, string>>;

export type MentionSegment =
  | { type: "text"; text: string }
  | { type: "object"; text: string; schema: string; name: string; kind: string };

const REF =
  /(?:\[([^\]]+)\]|([A-Za-z_][A-Za-z0-9_]*))(?:\s*\.\s*(?:\[([^\]]+)\]|([A-Za-z_][A-Za-z0-9_]*)))?/g;

const MODULE_PREFIX = /^(?:SP_|USP_|Fn_|FN_|Ufn_|TVF_|VW_)/i;
const TABLE_NAME = /^t[A-Za-z0-9_]{4,}$/i;
const SYSTEM_SCHEMAS = new Set(["master", "sys", "tempdb", "msdb", "information_schema"]);

type Hit = {
  start: number;
  end: number;
  schema: string;
  name: string;
};

export function objectKindKey(schema: string, name: string): string {
  return `${schema}.${name}`.toLowerCase();
}

function hits(text: string): Hit[] {
  const found: Hit[] = [];
  for (const match of text.matchAll(REF)) {
    const start = match.index ?? 0;
    const previous = start > 0 ? text[start - 1] : "";
    if (previous === "@" || previous === "#") {
      continue;
    }
    const first = match[1] ?? match[2] ?? "";
    const second = match[3] ?? match[4];
    if (!first) {
      continue;
    }
    if (second) {
      if (SYSTEM_SCHEMAS.has(first.toLowerCase()) || isSystemProcedureName(second)) {
        continue;
      }
      found.push({
        start,
        end: start + match[0].length,
        schema: first,
        name: second,
      });
      continue;
    }
    if (isSystemProcedureName(first) || (!MODULE_PREFIX.test(first) && !TABLE_NAME.test(first))) {
      continue;
    }
    found.push({
      start,
      end: start + match[0].length,
      schema: "dbo",
      name: first,
    });
  }
  return found;
}

export function objectCandidates(text: string): ObjectRef[] {
  const seen = new Set<string>();
  const objects: ObjectRef[] = [];
  for (const hit of hits(text)) {
    const key = objectKindKey(hit.schema, hit.name);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    objects.push({ schema: hit.schema, name: hit.name });
  }
  return objects;
}

export function mentionSegments(text: string, kinds: ObjectKindMap): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let cursor = 0;
  for (const hit of hits(text)) {
    const kind = kinds[objectKindKey(hit.schema, hit.name)];
    if (!kind) {
      continue;
    }
    if (hit.start > cursor) {
      segments.push({ type: "text", text: text.slice(cursor, hit.start) });
    }
    segments.push({
      type: "object",
      text: text.slice(hit.start, hit.end),
      schema: hit.schema,
      name: hit.name,
      kind,
    });
    cursor = hit.end;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", text: text.slice(cursor) });
  }
  return segments;
}

export function wholeObject(
  text: string,
  kinds: ObjectKindMap,
): Extract<MentionSegment, { type: "object" }> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const segments = mentionSegments(trimmed, kinds);
  const only = segments.length === 1 ? segments[0] : null;
  if (only?.type === "object" && only.text === trimmed) {
    return only;
  }
  return null;
}
