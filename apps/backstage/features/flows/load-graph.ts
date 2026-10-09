import { readFileSync } from "node:fs";
import path from "node:path";
import type { FlowGraph } from "./model";

let cached: FlowGraph | null = null;

export function loadFlowGraph(): FlowGraph {
  if (cached) return cached;
  const file = path.join(process.cwd(), "content", "flows", "flow-graph.json");
  cached = JSON.parse(readFileSync(file, "utf8")) as FlowGraph;
  return cached;
}
