import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { canAccessProposal, getProposal, setProposalStatus } from "@/lib/proposals";

export async function POST(
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

  try {
    const next = setProposalStatus(id, "withdrawn", {
      oid: gate.user.oid,
      name: gate.user.name,
      email: gate.user.email,
    });
    return NextResponse.json({ proposal: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not withdraw";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
