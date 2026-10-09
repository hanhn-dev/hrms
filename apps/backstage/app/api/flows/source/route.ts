import { format } from "sql-formatter";
import { NextResponse } from "next/server";
import { z } from "zod";
import { findRepoRoot, readRepoFile, REPO_IDS } from "@/features/flows/paths";

const bodySchema = z.object({
  roots: z.object({
    "hrms-db": z.string().optional(),
    sourcecode: z.string().optional(),
    "hrms-sdk": z.string().optional(),
  }),
  source: z.object({
    repo: z.enum(REPO_IDS),
    path: z.string(),
    line: z.number().int().positive(),
    column: z.number().int().positive(),
  }),
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ script: null }, { status: 400 });
  const start = parsed.data.roots[parsed.data.source.repo];
  const root = start ? findRepoRoot(start, parsed.data.source.repo) : null;
  const text = root ? readRepoFile(root, parsed.data.source.path) : null;
  return NextResponse.json({ script: text ? readableScript(text) : null });
}

function readableScript(script: string): string {
  try {
    return format(script, { language: "transactsql" });
  } catch {
    return script;
  }
}
