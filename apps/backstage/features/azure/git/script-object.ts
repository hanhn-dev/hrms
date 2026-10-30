import type { GitFilePair, GitFileSide } from "@hrms/azure-devops";

const MODULE_FOLDERS = new Set(["storeprocedure", "views", "functions"]);
const IDENT = "[A-Za-z_][A-Za-z0-9_]*";
const HEADER =
  /\b(?:CREATE\s+(?:OR\s+ALTER\s+)?|ALTER\s+)(?:PROCEDURE|PROC|VIEW|FUNCTION)\s+(?:\[?([A-Za-z_][A-Za-z0-9_]*)\]?\s*\.\s*)?\[?([A-Za-z_][A-Za-z0-9_]*)\]?/i;

export type ScriptObjectName = {
  readonly schema: string;
  readonly name: string;
};

export type DatabaseModuleScript = {
  readonly schema: string;
  readonly name: string;
  readonly kind: "storedProcedure" | "function" | "view" | "table" | null;
  readonly definition: string | null;
  readonly unavailableReason: string | null;
};

function withoutComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function objectFromFileName(fileName: string): ScriptObjectName | null {
  const stem = fileName.replace(/\.sql$/i, "");
  const patterns = [
    new RegExp(`^\\[(${IDENT})\\]\\.\\[(${IDENT})\\]$`),
    new RegExp(`^(${IDENT})\\.(${IDENT})$`),
    new RegExp(`^\\[?(${IDENT})\\]?$`),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(stem);
    if (!match) {
      continue;
    }
    return match[2] ? { schema: match[1]!, name: match[2] } : { schema: "dbo", name: match[1]! };
  }
  return null;
}

export function readScriptObject(content: string, path: string): ScriptObjectName | null {
  const header = HEADER.exec(withoutComments(content));
  if (header?.[2]) {
    return { schema: header[1] ?? "dbo", name: header[2] };
  }
  const parts = path.replace(/\\/g, "/").split("/");
  if (!parts.some((part) => MODULE_FOLDERS.has(part.toLowerCase()))) {
    return null;
  }
  const fileName = parts[parts.length - 1] ?? "";
  return fileName.length > 0 ? objectFromFileName(fileName) : null;
}

export function normalizeScriptBody(script: string): string {
  const stripped = withoutComments(script);
  const createIndex = stripped.search(
    /\b(?:CREATE\s+(?:OR\s+ALTER\s+)?|ALTER\s+)(?:PROCEDURE|PROC|VIEW|FUNCTION)\b/i,
  );
  const body = createIndex >= 0 ? stripped.slice(createIndex) : stripped;
  return body
    .replace(/\bCREATE\s+OR\s+ALTER\s+/gi, "CREATE ")
    .replace(/\bALTER\s+(PROCEDURE|PROC|VIEW|FUNCTION)\b/gi, "CREATE $1")
    .replace(/\bCREATE\s+PROC\b/gi, "CREATE PROCEDURE")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function scriptBodiesMatch(script: string, definition: string): boolean {
  return normalizeScriptBody(script) === normalizeScriptBody(definition);
}

export function databaseScriptStatus(
  branch: string,
  environment: string,
  script: string,
  definition: string,
): { readonly match: boolean; readonly message: string } {
  const match = scriptBodiesMatch(script, definition);
  return {
    match,
    message: match
      ? `The ${branch} script matches the ${environment} database.`
      : `The ${branch} script differs from the ${environment} database.`,
  };
}

function fileSide(content: string, truncated: boolean): GitFileSide {
  return {
    content,
    missing: false,
    isBinary: false,
    truncated,
    omission: null,
  };
}

export function databaseScriptPair(script: string, definition: string, scriptTruncated = false): GitFilePair {
  return {
    base: fileSide(script, scriptTruncated),
    target: fileSide(definition, false),
    lineDiffBlocks: [],
  };
}
