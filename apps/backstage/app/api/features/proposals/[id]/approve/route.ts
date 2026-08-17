import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { archiveThenWrite } from "@/lib/features";
import { getProposal, publishedHash, setProposalStatus } from "@/lib/proposals";
import { invalidateSearchIndex } from "@/lib/search";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const proposal = getProposal(id);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "pending") {
    return NextResponse.json({ error: "Proposal is not pending" }, { status: 400 });
  }

  const currentHash = publishedHash(proposal.slug);
  if (currentHash !== proposal.baseHash) {
    return NextResponse.json(
      {
        error:
          "The published guide changed after this proposal was written. Reject it and ask the contributor to resubmit.",
      },
      { status: 409 },
    );
  }

  const archivedAs = archiveThenWrite(proposal.slug, proposal.markdown);
  const next = setProposalStatus(id, "approved", {
    oid: gate.user.oid,
    name: gate.user.name,
    email: gate.user.email,
  });

  invalidateSearchIndex();
  revalidatePath("/features");
  revalidatePath(`/features/${proposal.slug}`);
  revalidatePath("/features/proposals");

  return NextResponse.json({ proposal: next, archivedAs });
}
