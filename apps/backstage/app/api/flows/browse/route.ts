import { NextResponse } from "next/server";
import { z } from "zod";
import { browseForFolder } from "@/features/flows/browse-folder";
import { CHECKOUTS } from "@/features/flows/checkout-copy";
import { REPO_IDS } from "@/features/flows/paths";

export const runtime = "nodejs";

const bodySchema = z.object({
  repo: z.enum(REPO_IDS),
  initialPath: z.string().trim().max(500).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose one of the three checkouts." }, { status: 400 });
  }
  try {
    const selected = await browseForFolder(CHECKOUTS[parsed.data.repo].title, parsed.data.initialPath);
    if (!selected) return NextResponse.json({ cancelled: true });
    return NextResponse.json({ path: selected });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The folder dialog could not open.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
