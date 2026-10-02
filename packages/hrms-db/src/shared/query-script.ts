import { AsyncLocalStorage } from "node:async_hooks";

type SqlLike = {
  strings: readonly string[];
  values: readonly unknown[];
};

type Capture = {
  scripts: string[];
};

const captureGlobal = globalThis as typeof globalThis & {
  __hrmsQueryCapture?: AsyncLocalStorage<Capture>;
};

const captureStore =
  captureGlobal.__hrmsQueryCapture ??
  (captureGlobal.__hrmsQueryCapture = new AsyncLocalStorage<Capture>());

/** Bump when the capture store changes so long-lived clients pick up the wrapper. */
export const queryCaptureGeneration = 2;

export type CapturedQuery<T> = {
  result: T;
  script: string;
};

export async function captureQueryScript<T>(
  work: () => Promise<T>,
): Promise<CapturedQuery<T>> {
  const capture: Capture = { scripts: [] };
  const result = await captureStore.run(capture, work);
  return { result, script: joinQueryScripts(capture.scripts) };
}

export function joinQueryScripts(scripts: readonly string[]): string {
  const bodies = scripts.map((sql) => sql.trim()).filter((sql) => sql !== "");
  if (bodies.length === 0) return "";
  if (bodies.length === 1) return bodies[0]!;
  return bodies
    .map((sql, index) => `-- query ${index + 1}\n${sql}`)
    .join("\n\n");
}

/** Record one `$queryRaw` / `$queryRawUnsafe` call when a capture is active. */
export function noteQueryScriptFromCall(
  query: unknown,
  values: readonly unknown[],
): void {
  const capture = captureStore.getStore();
  if (!capture) return;
  try {
    capture.scripts.push(renderQueryCall(query, values));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not render this query.";
    capture.scripts.push(`-- ${message}`);
  }
}

export function renderQueryCall(
  query: unknown,
  values: readonly unknown[],
): string {
  if (typeof query === "string") {
    return renderUnsafe(query, values);
  }
  if (isSqlLike(query)) {
    return renderSqlLike(query);
  }
  if (isTemplateStrings(query)) {
    return renderSqlLike({
      strings: Array.from(query),
      values,
    });
  }
  throw new Error("Refusing to render a query that is not SQL.");
}

function renderUnsafe(query: string, values: readonly unknown[]): string {
  if (values.length === 0) return query;
  let index = 0;
  return query.replaceAll("?", () => renderValue(values[index++]));
}

function renderSqlLike(sql: SqlLike): string {
  let out = sql.strings[0] ?? "";
  for (let i = 0; i < sql.values.length; i += 1) {
    out += renderValue(sql.values[i]);
    out += sql.strings[i + 1] ?? "";
  }
  return out;
}

function renderValue(value: unknown): string {
  if (isSqlLike(value)) return renderSqlLike(value);
  if (value == null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Refusing to render a non-finite number in a query script.");
    }
    return String(value);
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return `N'${value.replaceAll("'", "''")}'`;
  if (value instanceof Date) return `N'${value.toISOString()}'`;
  if (value instanceof Uint8Array) {
    return `0x${Buffer.from(value).toString("hex")}`;
  }
  if (isDecimalLike(value)) return value.toString();
  throw new Error(
    `Refusing to render query value of type ${value === null ? "null" : typeof value}.`,
  );
}

function isDecimalLike(value: object): value is { toString: () => string } {
  if (!("toString" in value) || typeof value.toString !== "function") {
    return false;
  }
  const text = value.toString();
  return /^-?\d+(\.\d+)?$/.test(text);
}

function isSqlLike(value: unknown): value is SqlLike {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  if (!("strings" in value) || !("values" in value)) return false;
  const strings = value.strings;
  const values = value.values;
  return Array.isArray(strings) && Array.isArray(values);
}

function isTemplateStrings(value: unknown): value is ArrayLike<string> {
  return Array.isArray(value) && value.every((part) => typeof part === "string");
}
