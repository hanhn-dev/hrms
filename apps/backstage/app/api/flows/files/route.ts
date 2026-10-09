import { NextResponse } from "next/server";
import { z } from "zod";
import { cursorUrlFor, findRepoRoot, REPO_IDS } from "@/features/flows/paths";

const bodySchema = z.object({
  roots: z.object({
    "hrms-db": z.string().optional(),
    sourcecode: z.string().optional(),
    "hrms-sdk": z.string().optional(),
  }),
  files: z
    .array(
      z.object({
        id: z.string(),
        source: z.object({
          repo: z.enum(REPO_IDS),
          path: z.string(),
          line: z.number().int().positive(),
          column: z.number().int().positive(),
        }),
      }),
    )
    .max(80),
  editor: z.enum(["cursor", "vscode"]).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ hrefs: {} }, { status: 400 });
  const hrefs: Record<string, string | null> = {};
  for (const file of parsed.data.files) {
    const start = parsed.data.roots[file.source.repo];
    const root = start ? findRepoRoot(start, file.source.repo) : null;
    hrefs[file.id] = root ? cursorUrlFor(root, file.source, parsed.data.editor ?? "cursor") : null;
  }
  return NextResponse.json({ hrefs });
}
