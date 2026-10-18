export type PlanProperty = {
  label: string;
  value: string;
};

export type PlanNode = {
  id: string;
  physicalOp: string;
  logicalOp: string;
  objectName: string | null;
  estimateRows: number | null;
  subtreeCost: number | null;
  actualRows: number | null;
  actualElapsedMs: number | null;
  warnings: string[];
  properties: PlanProperty[];
  children: PlanNode[];
};

export type PlanStatement = {
  text: string;
  cost: number | null;
  missingIndexes: string[];
  roots: PlanNode[];
};

export type LayoutNode = {
  node: PlanNode;
  x: number;
  y: number;
  width: number;
  height: number;
  costPercent: number | null;
  children: LayoutNode[];
};

export type LayoutStatement = {
  statement: PlanStatement;
  width: number;
  height: number;
  roots: LayoutNode[];
};
