import { NextResponse } from "next/server";
import { sequenceCharts } from "@/features/flows/feature-search";
import { flowHref, getFlowDoc } from "@/lib/flow-docs";

export function GET(request: Request): NextResponse {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!slug || slug.includes("/") || slug.includes("\\")) {
    return NextResponse.json({ error: "Feature slug is required." }, { status: 400 });
  }

  const doc = getFlowDoc([slug]);
  if (!doc || doc.isArchive) {
    return NextResponse.json({ error: "Feature flow was not found." }, { status: 404 });
  }

  return NextResponse.json({
    slug,
    title: doc.title,
    href: flowHref(doc.slug),
    charts: sequenceCharts(doc.content),
  });
}
