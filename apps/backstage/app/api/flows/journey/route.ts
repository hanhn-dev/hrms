import { NextResponse } from "next/server";
import { loadFlowGraph } from "@/features/flows/load-graph";
import { buildJourney } from "@/features/flows/query";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: Request): Promise<NextResponse> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ journey: null }, { status: 400 });
  try {
    const graph = loadFlowGraph();
    return NextResponse.json({ journey: buildJourney(graph, id) });
  } catch {
    return NextResponse.json({ journey: null, error: "Request flow graph is not built yet." }, { status: 503 });
  }
}
