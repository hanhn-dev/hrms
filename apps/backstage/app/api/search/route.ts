import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { searchDocuments } from "@/lib/search";

export async function GET(request: Request): Promise<NextResponse> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json(searchDocuments(query));
}
