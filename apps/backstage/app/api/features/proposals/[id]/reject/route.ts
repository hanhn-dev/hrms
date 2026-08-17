import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { RejectProposalSchema, getProposal, setProposalStatus } from "@/lib/proposals";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const proposal = getProposal(id);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = RejectProposalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "A reject reason is required" }, { status: 400 });
  }

  try {
    const next = setProposalStatus(
      id,
      "rejected",
      {
        oid: gate.user.oid,
        name: gate.user.name,
        email: gate.user.email,
      },
      parsed.data.reason,
    );
    return NextResponse.json({ proposal: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not reject";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
