import type { FlowEdge, FlowNode } from "./model";

export const CALL_NODE_WIDTH = 280;
export const CALL_COLUMN_GAP = 200;

const LABEL_CHARS = 32;
const GAP_CHARS = 36;

export type LaidOutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LaidOutEdge = {
  id: string;
  source: string;
  target: string;
  label: string | null;
};

export function layoutCallGraph(
  flowNodes: readonly FlowNode[],
  flowEdges: readonly FlowEdge[],
): { nodes: LaidOutNode[]; edges: LaidOutEdge[] } {
  const depth = new Map<string, number>();
  const roots = flowNodes.filter((node) => !flowEdges.some((edge) => edge.to === node.id));
  const start = roots[0] ?? flowNodes[0];
  if (start) depth.set(start.id, 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of flowEdges) {
      const fromDepth = depth.get(edge.from);
      if (fromDepth === undefined) continue;
      const next = fromDepth + 1;
      if ((depth.get(edge.to) ?? -1) < next) {
        depth.set(edge.to, next);
        changed = true;
      }
    }
  }

  const columnY = new Map<number, number>();
  const nodes: LaidOutNode[] = flowNodes.map((node) => {
    const column = depth.get(node.id) ?? 0;
    const height = callNodeHeight(node.label, node.gap);
    const y = columnY.get(column) ?? 0;
    columnY.set(column, y + height + 28);
    return {
      id: node.id,
      x: column * (CALL_NODE_WIDTH + CALL_COLUMN_GAP),
      y,
      width: CALL_NODE_WIDTH,
      height,
    };
  });

  const edges: LaidOutEdge[] = flowEdges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.sectionKey ? `section ${edge.sectionKey}` : null,
  }));

  return { nodes, edges };
}

export function callNodeHeight(label: string, gap: string | null): number {
  const labelLines = Math.max(1, Math.ceil(label.length / LABEL_CHARS));
  const gapLines = gap ? Math.max(1, Math.ceil(gap.length / GAP_CHARS)) : 0;
  return 16 + labelLines * 20 + 18 + (gapLines === 0 ? 0 : 8 + gapLines * 16);
}
