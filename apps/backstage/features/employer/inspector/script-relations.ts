export type ScriptRelation = {
  role: "caller" | "nested";
  viaSchema: string;
  viaName: string;
  depth: number;
};

export type RelatedScriptRef = {
  schema: string;
  name: string;
  kind: "storedProcedure" | "function" | "view";
  depth: number;
};

export type RelatedScriptList = {
  items: readonly RelatedScriptRef[];
  total: number;
  truncated: boolean;
};

export type OpenScriptTab = {
  key: string;
  schema: string;
  name: string;
  relation?: ScriptRelation;
};

export type RelatedTabMessage = {
  tone: "info" | "warning" | "success";
  text: string;
};

export type RelatedTabSource = {
  role: ScriptRelation["role"];
  schema: string;
  name: string;
};

function objectKey(schema: string, name: string): string {
  return `${schema}.${name}`.toLowerCase();
}

export function scriptTabKey(kind: string, schema: string, name: string): string {
  return `${kind}:${schema}.${name}`.toLowerCase();
}

export function relationTooltip(relation: ScriptRelation): string {
  const source = `${relation.viaSchema}.${relation.viaName}`;
  if (relation.role === "caller") {
    return `Calls ${source}`;
  }
  return `Nested call from ${source}, depth ${relation.depth}`;
}

export function relationLabelClass(role: ScriptRelation["role"]): string {
  if (role === "caller") {
    return "inline-flex items-center gap-1 rounded bg-amber-100 px-1 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100";
  }
  return "inline-flex items-center gap-1 rounded bg-sky-100 px-1 text-sky-950 dark:bg-sky-900/60 dark:text-sky-100";
}

function qualified(schema: string, name: string): string {
  return `${schema}.${name}`;
}

function noun(role: ScriptRelation["role"], count: number): string {
  if (role === "caller") {
    return count === 1 ? "caller" : "callers";
  }
  return count === 1 ? "nested call" : "nested calls";
}

function preposition(role: ScriptRelation["role"]): string {
  return role === "caller" ? "of" : "from";
}

function sameRelation(left: ScriptRelation | undefined, right: ScriptRelation): boolean {
  return (
    left?.role === right.role &&
    left.viaSchema === right.viaSchema &&
    left.viaName === right.viaName &&
    left.depth === right.depth
  );
}

function emptyMessage(source: RelatedTabSource): RelatedTabMessage {
  const name = qualified(source.schema, source.name);
  if (source.role === "caller") {
    return {
      tone: "info",
      text: `No procedures, functions, or views call ${name}.`,
    };
  }
  return {
    tone: "info",
    text: `${name} does not call other procedures, functions, or views.`,
  };
}

function relatedMessage(
  source: RelatedTabSource,
  related: RelatedScriptList,
  opened: number,
  recolored: number,
  actionable: number,
): RelatedTabMessage {
  if (actionable === 0) {
    return emptyMessage(source);
  }
  const name = qualified(source.schema, source.name);
  const place = preposition(source.role);
  if (related.truncated) {
    const leftover = Math.max(related.total - related.items.length, 0);
    return {
      tone: "warning",
      text: `Opened the nearest ${related.items.length} of ${related.total} ${noun(source.role, related.total)} ${place} ${name}. ${leftover} were left out.`,
    };
  }
  if (opened === 0 && recolored === 0) {
    return {
      tone: "info",
      text: `The ${noun(source.role, actionable)} ${place} ${name} are already open.`,
    };
  }
  if (opened > 0 && recolored > 0) {
    return {
      tone: "success",
      text: `Opened ${opened} ${noun(source.role, opened)} ${place} ${name}. Updated ${recolored} already open.`,
    };
  }
  if (opened > 0) {
    return {
      tone: "success",
      text: `Opened ${opened} ${noun(source.role, opened)} ${place} ${name}.`,
    };
  }
  return {
    tone: "success",
    text: `Updated ${recolored} ${noun(source.role, recolored)} ${place} ${name} that ${recolored === 1 ? "was" : "were"} already open.`,
  };
}

export function mergeRelatedTabs<T extends OpenScriptTab>(
  tabs: readonly T[],
  related: RelatedScriptList,
  source: RelatedTabSource,
  create: (item: RelatedScriptRef, relation: ScriptRelation) => T,
): { tabs: T[]; opened: number; recolored: number; message: RelatedTabMessage } {
  const sourceKey = objectKey(source.schema, source.name);
  const actionable = related.items.filter(
    (item) => objectKey(item.schema, item.name) !== sourceKey,
  );
  const next = tabs.map((tab) => ({ ...tab }));
  const indexByObject = new Map<string, number>();
  next.forEach((tab, index) => {
    indexByObject.set(objectKey(tab.schema, tab.name), index);
  });
  const additions: T[] = [];
  let recolored = 0;

  for (const item of actionable) {
    const relation: ScriptRelation = {
      role: source.role,
      viaSchema: source.schema,
      viaName: source.name,
      depth: item.depth,
    };
    const existingIndex = indexByObject.get(objectKey(item.schema, item.name));
    if (existingIndex !== undefined) {
      const existing = next[existingIndex];
      if (existing && !sameRelation(existing.relation, relation)) {
        next[existingIndex] = { ...existing, relation };
        recolored += 1;
      }
      continue;
    }
    const created = {
      ...create(item, relation),
      key: scriptTabKey(item.kind, item.schema, item.name),
      relation,
    };
    additions.push(created);
    indexByObject.set(objectKey(item.schema, item.name), next.length + additions.length - 1);
  }

  return {
    tabs: additions.length === 0 && recolored === 0 ? [...tabs] : [...next, ...additions],
    opened: additions.length,
    recolored,
    message: relatedMessage(source, related, additions.length, recolored, actionable.length),
  };
}
