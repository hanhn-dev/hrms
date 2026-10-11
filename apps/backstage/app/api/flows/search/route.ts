import { NextResponse } from "next/server";
import { searchFeatureDocs } from "@/features/flows/feature-search";
import { loadFlowGraph } from "@/features/flows/load-graph";
import { searchNodes } from "@/features/flows/query";
import { getCurrentFlowDocs } from "@/lib/flow-docs";

export function GET(request: Request): NextResponse {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const features = searchFeatureDocs(
    getCurrentFlowDocs().map((doc) => ({
      slug: doc.objectName,
      title: doc.title,
      feature: doc.feature,
    })),
    query,
  );

  try {
    const graph = loadFlowGraph();
    return NextResponse.json({
      features,
      nodes: features.length > 0 ? [] : searchNodes(graph, query),
    });
  } catch {
    return NextResponse.json(
      { features, nodes: [], error: features.length > 0 ? undefined : "Request flow graph is not built yet." },
      { status: features.length > 0 ? 200 : 503 },
    );
  }
}
