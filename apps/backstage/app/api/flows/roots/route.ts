import { NextResponse } from "next/server";
import { z } from "zod";
import { findRepoRoot, REPO_IDS, type RepoId } from "@/features/flows/paths";

const bodySchema = z.object({
  repo: z.enum(REPO_IDS),
  startPath: z.string().trim().min(1).max(500),
});

const ENV_ROOTS: Record<RepoId, string | undefined> = {
  "hrms-db": process.env.REQUEST_FLOW_HRMS_DB,
  sourcecode: process.env.REQUEST_FLOW_SOURCECODE,
  "hrms-sdk": process.env.REQUEST_FLOW_HRMS_SDK,
};

export function GET(): NextResponse {
  const roots: Partial<Record<RepoId, string>> = {};
  for (const repo of REPO_IDS) {
    const start = ENV_ROOTS[repo];
    if (!start) continue;
    const root = findRepoRoot(start, repo);
    if (root) roots[repo] = root;
  }
  return NextResponse.json({ roots });
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose one of the three checkouts." }, { status: 400 });
  }
  const root = findRepoRoot(parsed.data.startPath, parsed.data.repo);
  if (!root) {
    return NextResponse.json(
      { error: "That folder does not contain the expected repository marker." },
      { status: 400 },
    );
  }
  return NextResponse.json({ root });
}
