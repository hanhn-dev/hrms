import { NextResponse } from "next/server";
import { loadFlowGraph } from "@/features/flows/load-graph";
import { searchNodes } from "@/features/flows/query";

export function GET(request: Request): NextResponse {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const graph = loadFlowGraph();
    return NextResponse.json({ nodes: searchNodes(graph, query) });
  } catch {
    return NextResponse.json({ nodes: [], error: "Request flow graph is not built yet." }, { status: 503 });
  }
}
