import { NextResponse } from "next/server";
import { loadFlowGraph } from "@/features/flows/load-graph";
import { buildJourney } from "@/features/flows/query";

export function GET(request: Request): NextResponse {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ journey: null }, { status: 400 });
  try {
    const graph = loadFlowGraph();
    return NextResponse.json({ journey: buildJourney(graph, id) });
  } catch {
    return NextResponse.json({ journey: null, error: "Request flow graph is not built yet." }, { status: 503 });
  }
}
