import { NextResponse } from "next/server";
import { searchDocuments } from "@/lib/search";

export function GET(request: Request): NextResponse {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json(searchDocuments(query));
}
