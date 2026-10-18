import type { PlanNode, PlanProperty, PlanStatement } from "./types.ts";

const STATEMENT_NAMES = new Set([
  "StmtSimple",
  "StmtCond",
  "StmtCursor",
  "StmtUseDb",
]);

export function parseShowplan(xml: string): PlanStatement[] {
  if (xml.trim() === "") {
    return [];
  }

  let document: Document;
  try {
    document = new DOMParser().parseFromString(xml, "text/xml");
  } catch {
    return [];
  }
  if (document.getElementsByTagName("parsererror").length > 0) {
    return [];
  }

  const statements: PlanStatement[] = [];
  let nextId = 0;
  for (const element of document.getElementsByTagName("*")) {
    if (!STATEMENT_NAMES.has(element.localName)) {
      continue;
    }
    statements.push({
      text: element.getAttribute("StatementText")?.trim() ?? "",
      cost: numberAttr(element, "StatementSubTreeCost"),
      missingIndexes: missingIndexes(element),
      roots: childOperators(element, element, () => {
        const id = nextId;
        nextId += 1;
        return id;
      }),
    });
  }
  return statements;
}

function childOperators(
  node: Element,
  owner: Element,
  nextId: () => number,
): PlanNode[] {
  const nodes: PlanNode[] = [];
  for (const child of node.children) {
    if (child !== owner && STATEMENT_NAMES.has(child.localName)) {
      continue;
    }
    if (child.localName === "RelOp") {
      nodes.push(operatorNode(child, owner, nextId));
      continue;
    }
    nodes.push(...childOperators(child, owner, nextId));
  }
  return nodes;
}

function operatorNode(
  operator: Element,
  owner: Element,
  nextId: () => number,
): PlanNode {
  const counters = runtimeCounters(operator);
  const physicalOp =
    operator.getAttribute("PhysicalOp") ??
    operator.getAttribute("LogicalOp") ??
    "Operator";
  const logicalOp = operator.getAttribute("LogicalOp") ?? "";
  const objectName = objectLabel(operator);
  const estimateRows = numberAttr(operator, "EstimateRows");
  const subtreeCost = numberAttr(operator, "EstimatedTotalSubtreeCost");
  const actualRows = sumCounters(counters, "ActualRows");
  const actualElapsedMs = maxCounters(counters, "ActualElapsedms");
  const warnings = warningLabels(operator);
  return {
    id: operator.getAttribute("NodeId") ?? `n${nextId()}`,
    physicalOp,
    logicalOp,
    objectName,
    estimateRows,
    subtreeCost,
    actualRows,
    actualElapsedMs,
    warnings,
    properties: properties({
      logicalOp,
      objectName,
      estimateRows,
      subtreeCost,
      estimateIo: numberAttr(operator, "EstimateIO"),
      estimateCpu: numberAttr(operator, "EstimateCPU"),
      actualRows,
      actualElapsedMs,
      parallel: operator.getAttribute("Parallel"),
      predicates: predicateStrings(operator),
      warnings,
    }),
    children: childOperators(operator, owner, nextId),
  };
}

function properties(input: {
  logicalOp: string;
  objectName: string | null;
  estimateRows: number | null;
  subtreeCost: number | null;
  estimateIo: number | null;
  estimateCpu: number | null;
  actualRows: number | null;
  actualElapsedMs: number | null;
  parallel: string | null;
  predicates: string[];
  warnings: string[];
}): PlanProperty[] {
  const rows: PlanProperty[] = [];
  push(rows, "Logical operation", input.logicalOp);
  push(rows, "Object", input.objectName);
  push(rows, "Estimated rows", formatCount(input.estimateRows));
  push(rows, "Estimated I/O", formatCount(input.estimateIo));
  push(rows, "Estimated CPU", formatCount(input.estimateCpu));
  push(rows, "Estimated subtree cost", formatCount(input.subtreeCost));
  push(rows, "Actual rows", formatCount(input.actualRows));
  push(rows, "Elapsed (ms)", formatCount(input.actualElapsedMs));
  push(rows, "Parallel", parallelLabel(input.parallel));
  for (const predicate of input.predicates) {
    rows.push({ label: "Predicate", value: predicate });
  }
  for (const warning of input.warnings) {
    rows.push({ label: "Warning", value: warning });
  }
  return rows;
}

function push(
  rows: PlanProperty[],
  label: string,
  value: string | null,
): void {
  if (value == null || value === "") {
    return;
  }
  rows.push({ label, value });
}

function parallelLabel(value: string | null): string | null {
  if (value == null || value === "") {
    return null;
  }
  return value === "1" || value.toLowerCase() === "true" ? "Yes" : "No";
}

export function formatCount(value: number | null): string | null {
  if (value == null) {
    return null;
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Math.round(value * 1000) / 1000);
}

function objectLabel(operator: Element): string | null {
  let label: string | null = null;
  eachOwned(operator, (element) => {
    if (label != null || element.localName !== "Object") {
      return;
    }
    const schema = bare(element.getAttribute("Schema"));
    const table = bare(element.getAttribute("Table"));
    const index = bare(element.getAttribute("Index"));
    const target = [schema, table].filter((part) => part !== "").join(".");
    if (target !== "" && index !== "") {
      label = `${target} (${index})`;
      return;
    }
    label = target || index || null;
  });
  return label;
}

function predicateStrings(operator: Element): string[] {
  const values: string[] = [];
  eachOwned(operator, (element) => {
    if (element.localName !== "ScalarOperator") {
      return;
    }
    const text = element.getAttribute("ScalarString")?.trim();
    if (text) {
      values.push(text);
    }
  });
  return values;
}

function warningLabels(operator: Element): string[] {
  const warnings = [...operator.children].find(
    (child) => child.localName === "Warnings",
  );
  if (!warnings) {
    return [];
  }
  return [...warnings.children].map((child) =>
    child.localName.replace(/([a-z])([A-Z])/g, "$1 $2"),
  );
}

function missingIndexes(statement: Element): string[] {
  const indexes: string[] = [];
  function walk(node: Element): void {
    for (const child of node.children) {
      if (child !== statement && STATEMENT_NAMES.has(child.localName)) {
        continue;
      }
      if (child.localName === "RelOp") {
        continue;
      }
      if (child.localName === "MissingIndex") {
        indexes.push(describeMissingIndex(child));
        continue;
      }
      walk(child);
    }
  }
  walk(statement);
  return indexes;
}

function describeMissingIndex(index: Element): string {
  const schema = bare(index.getAttribute("Schema"));
  const table = bare(index.getAttribute("Table"));
  const target = [schema, table].filter((part) => part !== "").join(".");
  const groups = [...index.children]
    .filter((child) => child.localName === "ColumnGroup")
    .map((group) => {
      const usage = (group.getAttribute("Usage") ?? "columns").toLowerCase();
      const columns = [...group.children]
        .filter((child) => child.localName === "Column")
        .map((column) => bare(column.getAttribute("Name")))
        .filter((name) => name !== "");
      return `${usage}: ${columns.join(", ")}`;
    });
  const impact = index.parentElement?.getAttribute("Impact");
  const detail = groups.length > 0 ? ` (${groups.join("; ")})` : "";
  const impactText = impact ? ` impact ${impact}` : "";
  return `${target}${detail}${impactText}`.trim();
}

function eachOwned(root: Element, visit: (element: Element) => void): void {
  function walk(node: Element): void {
    for (const child of node.children) {
      if (
        STATEMENT_NAMES.has(child.localName) ||
        child.localName === "RelOp"
      ) {
        continue;
      }
      visit(child);
      walk(child);
    }
  }
  walk(root);
}

function runtimeCounters(operator: Element): Element[] {
  const info = [...operator.children].find(
    (child) => child.localName === "RunTimeInformation",
  );
  if (!info) {
    return [];
  }
  return [...info.children].filter(
    (child) => child.localName === "RunTimeCountersPerThread",
  );
}

function sumCounters(
  counters: readonly Element[],
  attribute: string,
): number | null {
  if (counters.length === 0) {
    return null;
  }
  let sum = 0;
  for (const counter of counters) {
    const value = numberAttr(counter, attribute);
    if (value != null) {
      sum += value;
    }
  }
  return sum;
}

function maxCounters(
  counters: readonly Element[],
  attribute: string,
): number | null {
  let max: number | null = null;
  for (const counter of counters) {
    const value = numberAttr(counter, attribute);
    if (value != null && (max == null || value > max)) {
      max = value;
    }
  }
  return max;
}

function numberAttr(element: Element, name: string): number | null {
  const raw = element.getAttribute(name);
  if (raw == null || raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function bare(value: string | null): string {
  if (value == null) {
    return "";
  }
  return value.replaceAll("[", "").replaceAll("]", "");
}
