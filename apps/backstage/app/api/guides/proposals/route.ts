import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import {
  SubmitProposalSchema,
  createProposal,
  listProposals,
} from "@/lib/proposals";

export async function GET(): Promise<NextResponse> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  return NextResponse.json({ proposals: listProposals() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SubmitProposalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid proposal" }, { status: 400 });
  }

  try {
    const proposal = createProposal(parsed.data.slug, parsed.data.markdown, {
      oid: gate.user.oid,
      name: gate.user.name,
      email: gate.user.email,
    });
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create proposal";
    const status = message.includes("already awaiting") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
