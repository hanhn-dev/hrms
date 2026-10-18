import type { LayoutNode, LayoutStatement, PlanNode, PlanStatement } from "./types.ts";

export const PLAN_NODE_WIDTH = 136;
export const PLAN_NODE_HEIGHT = 92;
export const PLAN_ICON_SIZE = 32;
export const PLAN_ICON_TOP = 16;

const GAP_X = 56;
const GAP_Y = 12;

export function layoutPlan(
  statements: readonly PlanStatement[],
): LayoutStatement[] {
  return statements.map(layoutStatement);
}

function layoutStatement(statement: PlanStatement): LayoutStatement {
  const cost = statementCost(statement);
  const operators = statement.roots.map((root) => layoutNode(root, cost));
  const head = placeChildren({
    node: statementNode(statement),
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    costPercent: 0,
    children: operators,
  });
  return { statement, width: head.width, height: head.height, roots: [head] };
}

function statementNode(statement: PlanStatement): PlanNode {
  return {
    id: "statement",
    physicalOp: statementLabel(statement.text),
    logicalOp: "",
    objectName: null,
    estimateRows: null,
    subtreeCost: null,
    actualRows: null,
    actualElapsedMs: null,
    warnings: [],
    properties: [],
    children: [],
  };
}

function statementLabel(text: string): string {
  const match = text
    .trim()
    .toUpperCase()
    .match(/\b(SELECT|INSERT|UPDATE|DELETE|MERGE|IF)\b/);
  return match?.[1] ?? "Statement";
}

function layoutNode(node: PlanNode, cost: number | null): LayoutNode {
  return placeChildren(
    {
      node,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      costPercent: costPercent(node, cost),
      children: node.children.map((child) => layoutNode(child, cost)),
    },
  );
}

function placeChildren(node: LayoutNode, children = node.children): LayoutNode {
  const childrenHeight =
    children.reduce((sum, child) => sum + child.height, 0) +
    GAP_Y * Math.max(0, children.length - 1);
  const height = Math.max(PLAN_NODE_HEIGHT, childrenHeight);
  const childWidth = children.reduce((max, child) => Math.max(max, child.width), 0);
  const offset = (height - childrenHeight) / 2;
  let y = 0;
  for (const child of children) {
    child.x = PLAN_NODE_WIDTH + GAP_X;
    child.y = offset + y;
    y += child.height + GAP_Y;
  }
  return {
    ...node,
    width: PLAN_NODE_WIDTH + (children.length > 0 ? GAP_X + childWidth : 0),
    height,
    children,
  };
}

function statementCost(statement: PlanStatement): number | null {
  if (statement.cost != null && statement.cost > 0) {
    return statement.cost;
  }
  const sum = statement.roots.reduce(
    (total, root) => total + (root.subtreeCost ?? 0),
    0,
  );
  return sum > 0 ? sum : null;
}

function costPercent(node: PlanNode, cost: number | null): number | null {
  if (node.subtreeCost == null || cost == null) {
    return null;
  }
  const children = node.children.reduce(
    (sum, child) => sum + (child.subtreeCost ?? 0),
    0,
  );
  return (Math.max(0, node.subtreeCost - children) / cost) * 100;
}
