import type { FlowEdge, FlowGraph, FlowNode } from "./model";

const KIND_ORDER = ["screen", "sdkCall", "route", "handler", "procedure"] as const;

export function searchNodes(graph: FlowGraph, query: string, limit = 30): FlowNode[] {
  const trimmed = query.trim().toLowerCase();
  const words = trimmed.split(/\s+/).filter((word) => word.length >= 2);
  const ranked = graph.nodes.filter((node) => {
    if (!trimmed) return node.kind === "route" || node.kind === "screen";
    if (words.length === 0) return false;
    const haystack = `${node.label} ${node.detail} ${node.source?.path ?? ""}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  ranked.sort((left, right) => {
    const bank = Number(right.label.toLowerCase().includes("bank-details")) - Number(left.label.toLowerCase().includes("bank-details"));
    if (bank !== 0 && words.length === 0) return bank;
    return KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind) || left.label.localeCompare(right.label);
  });
  return ranked.slice(0, limit);
}

export type Journey = {
  chain: FlowNode[];
  chart: string;
  callNodes: FlowNode[];
  callEdges: FlowEdge[];
  truncated: boolean;
};

export function buildJourney(graph: FlowGraph, focusId: string): Journey | null {
  const focus = graph.nodes.find((node) => node.id === focusId);
  if (!focus) return null;
  const chain = linearChain(graph, focus);
  const procedure = [...chain].reverse().find((node) => node.kind === "procedure") ?? null;
  const neighborhood = procedure
    ? outgoingNeighborhood(graph, procedure.id, 2, 60)
    : { nodes: [], edges: [], truncated: false };
  return {
    chain,
    chart: sequenceChart(chain),
    callNodes: neighborhood.nodes,
    callEdges: neighborhood.edges,
    truncated: neighborhood.truncated,
  };
}

export function sequenceChart(chain: readonly FlowNode[]): string {
  const lines = ["sequenceDiagram", "  actor User"];
  chain.forEach((node, index) => {
    lines.push(`  participant P${index} as ${mermaidLabel(node.label)}`);
  });
  if (chain.length === 0) {
    lines.push("  Note over User: No source chain for this node");
    return lines.join("\n");
  }
  const first = chain[0];
  if (first) lines.push(`  User->>P0: opens ${mermaidText(first.label)}`);
  for (let index = 0; index < chain.length - 1; index += 1) {
    const current = chain[index];
    const next = chain[index + 1];
    if (!current || !next) continue;
    lines.push(`  P${index}->>P${index + 1}: ${mermaidText(arrowLabel(current, next))}`);
  }
  return lines.join("\n");
}

function linearChain(graph: FlowGraph, focus: FlowNode): FlowNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const anchor = walkBack(graph, byId, focus);
  const forward = walkForward(graph, byId, anchor);
  const chain = [anchor, ...forward.filter((node) => node.id !== anchor.id)];
  const seen = new Set<string>();
  return chain.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function walkBack(graph: FlowGraph, byId: Map<string, FlowNode>, focus: FlowNode): FlowNode {
  let current = focus;
  for (let step = 0; step < 6; step += 1) {
    const incoming = graph.edges.filter((edge) => {
      if (edge.to !== current.id) return false;
      if (current.kind === "procedure") return edge.kind === "exec" || edge.kind === "handles";
      return edge.kind !== "exec";
    });
    const previous = choosePrevious(byId, incoming);
    if (!previous || previous.id === current.id) break;
    current = previous;
  }
  return current;
}

function choosePrevious(byId: Map<string, FlowNode>, edges: readonly FlowEdge[]): FlowNode | undefined {
  const nodes = edges.flatMap((edge) => {
    const node = byId.get(edge.from);
    return node ? [node] : [];
  });
  return (
    nodes.find((node) => node.kind === "screen") ??
    nodes.find((node) => node.kind === "sdkCall") ??
    nodes.find((node) => node.kind === "route") ??
    nodes.find((node) => node.kind === "handler") ??
    nodes[0]
  );
}

function walkForward(graph: FlowGraph, byId: Map<string, FlowNode>, start: FlowNode): FlowNode[] {
  const chain: FlowNode[] = [];
  let current = start;
  for (let step = 0; step < 6; step += 1) {
    const candidates = graph.edges.filter((item) => {
      if (item.from !== current.id) return false;
      if (current.kind === "handler") return item.kind === "exec";
      if (current.kind === "procedure") return false;
      return item.kind === "http" || item.kind === "handles";
    });
    const sectionEdges = candidates.filter((item) => item.sectionKey);
    const edge = sectionEdges.at(-1) ?? candidates[0];
    const next = edge ? byId.get(edge.to) : undefined;
    if (!next) break;
    chain.push(next);
    current = next;
  }
  return chain;
}

function outgoingNeighborhood(
  graph: FlowGraph,
  rootId: string,
  hops: number,
  maxNodes: number,
): { nodes: FlowNode[]; edges: FlowEdge[]; truncated: boolean } {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const root = byId.get(rootId);
  if (!root) return { nodes: [], edges: [], truncated: false };
  const kept = new Map<string, FlowNode>([[root.id, root]]);
  const edges: FlowEdge[] = [];
  let frontier = [root.id];
  let truncated = false;
  for (let hop = 0; hop < hops; hop += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const edge of graph.edges) {
        if (edge.from !== id || edge.kind !== "exec") continue;
        if (!kept.has(edge.to) && kept.size >= maxNodes) {
          truncated = true;
          continue;
        }
        const target = byId.get(edge.to);
        if (!target) continue;
        edges.push(edge);
        if (!kept.has(target.id)) {
          kept.set(target.id, target);
          next.push(target.id);
        }
      }
    }
    frontier = next;
  }
  return { nodes: [...kept.values()], edges, truncated };
}

function arrowLabel(from: FlowNode, to: FlowNode): string {
  if (to.kind === "procedure") return to.label;
  if (from.kind === "sdkCall" || to.kind === "route") return to.detail || to.label;
  return to.label;
}

function mermaidLabel(text: string): string {
  return JSON.stringify(mermaidText(text));
}

function mermaidText(text: string): string {
  return text.replace(/\s+/g, " ").slice(0, 80);
}
