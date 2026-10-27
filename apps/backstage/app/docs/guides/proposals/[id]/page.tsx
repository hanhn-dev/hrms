import { notFound, redirect } from "next/navigation";
import { ProposalReview } from "@/components/guides/proposal-review";
import { readFeatureRaw } from "@/lib/guides";
import { canAccessProposal, getProposal } from "@/lib/proposals";
import { currentGateUser } from "@/shared/auth";

export const dynamic = "force-dynamic";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const user = await currentGateUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const proposal = getProposal(id);
  if (!proposal) {
    notFound();
  }
  if (!canAccessProposal(proposal, user)) {
    redirect("/docs/guides");
  }

  return (
    <ProposalReview
      isAdmin={user.isAdmin}
      isAuthor={proposal.author.oid === user.oid}
      proposal={proposal}
      publishedMarkdown={readFeatureRaw(proposal.slug)}
    />
  );
}
