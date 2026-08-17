import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { canAccessProposal, getProposal } from "@/lib/proposals";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const proposal = getProposal(id);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (!canAccessProposal(proposal, gate.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ proposal });
}
