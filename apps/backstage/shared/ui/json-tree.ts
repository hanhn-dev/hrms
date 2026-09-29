export type JsonType = "string" | "number" | "boolean" | "null" | "object" | "array";
export type JsonPath = Array<string | number>;

export function jsonTypeOf(value: unknown): JsonType {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value === "object") {
    return "object";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return "string";
}

export function parseTypedValue(
  type: JsonType,
  raw: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (type) {
    case "string":
      return { ok: true, value: raw };
    case "number": {
      const trimmed = raw.trim();
      if (trimmed === "") {
        return { ok: false, error: "Enter a number." };
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return { ok: false, error: "Enter a number." };
      }
      return { ok: true, value: parsed };
    }
    case "boolean":
      return { ok: true, value: raw === "true" };
    case "null":
      return { ok: true, value: null };
    case "object":
      return { ok: true, value: {} };
    case "array":
      return { ok: true, value: [] };
  }
}

export function getAtPath(root: unknown, path: JsonPath): unknown {
  let current = root;
  for (const key of path) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = Array.isArray(current)
      ? current[key as number]
      : (current as Record<string, unknown>)[String(key)];
  }
  return current;
}

function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

export function setAtPath(root: unknown, path: JsonPath, value: unknown): unknown {
  if (path.length === 0) {
    return value;
  }
  const next = cloneJson(root);
  const parent = getAtPath(next, path.slice(0, -1));
  const last = path[path.length - 1];
  if (Array.isArray(parent) && typeof last === "number") {
    parent[last] = value;
    return next;
  }
  if (isPlainObject(parent) && typeof last === "string") {
    parent[last] = value;
    return next;
  }
  throw new Error("Cannot set value at path.");
}

export function removeAtPath(root: unknown, path: JsonPath): unknown {
  if (path.length === 0) {
    return root;
  }
  const next = cloneJson(root);
  const parent = getAtPath(next, path.slice(0, -1));
  const last = path[path.length - 1];
  if (Array.isArray(parent) && typeof last === "number") {
    parent.splice(last, 1);
    return next;
  }
  if (isPlainObject(parent) && typeof last === "string") {
    delete parent[last];
    return next;
  }
  throw new Error("Cannot remove value at path.");
}

export function defaultValueForType(type: JsonType): unknown {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "null":
      return null;
    case "object":
      return {};
    case "array":
      return [];
  }
}

export function renameObjectKey(
  root: unknown,
  objectPath: JsonPath,
  from: string,
  to: string,
): unknown {
  const name = to.trim();
  if (!name) {
    throw new Error("Enter a property name.");
  }
  if (name === from) {
    return root;
  }
  const next = cloneJson(root);
  const target = getAtPath(next, objectPath);
  if (!isPlainObject(target)) {
    throw new Error("Target is not an object.");
  }
  if (!Object.hasOwn(target, from)) {
    throw new Error("Property was not found.");
  }
  if (Object.hasOwn(target, name)) {
    throw new Error("Property already exists.");
  }
  const renamed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(target)) {
    renamed[key === from ? name : key] = value;
    delete target[key];
  }
  Object.assign(target, renamed);
  return next;
}

export function addObjectProperty(
  root: unknown,
  objectPath: JsonPath,
  key: string,
  value: unknown,
): unknown {
  const name = key.trim();
  if (!name) {
    throw new Error("Enter a property name.");
  }
  const next = cloneJson(root);
  const target = getAtPath(next, objectPath);
  if (!isPlainObject(target)) {
    throw new Error("Target is not an object.");
  }
  if (Object.hasOwn(target, name)) {
    throw new Error("Property already exists.");
  }
  target[name] = value;
  return next;
}

export function appendArrayItem(
  root: unknown,
  arrayPath: JsonPath,
  value: unknown,
): unknown {
  const next = cloneJson(root);
  const target = getAtPath(next, arrayPath);
  if (!Array.isArray(target)) {
    throw new Error("Target is not an array.");
  }
  target.push(value);
  return next;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isJsonContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return Array.isArray(value) || isPlainObject(value);
}

export function nodeSummary(value: unknown): string {
  if (isPlainObject(value)) {
    const rule = value.rule;
    if (typeof rule === "string" && rule.trim()) {
      return rule;
    }
    const count = Object.keys(value).length;
    return count === 0 ? "{}" : `{${count}}`;
  }
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value.length > 40 ? `${value.slice(0, 37)}…` : value;
  }
  return String(value);
}
