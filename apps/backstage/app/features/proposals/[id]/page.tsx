import { notFound, redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/auth";
import { ProposalReview } from "@/components/features/proposal-review";
import { readFeatureRaw } from "@/lib/features";
import { canAccessProposal, getProposal } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  if (!isAuthConfigured()) {
    redirect("/features");
  }
  const session = await auth();
  if (!session?.user) {
    redirect("/features");
  }

  const { id } = await params;
  const proposal = getProposal(id);
  if (!proposal) {
    notFound();
  }
  if (!canAccessProposal(proposal, session.user)) {
    redirect("/features");
  }

  return (
    <ProposalReview
      isAdmin={session.user.isAdmin}
      isAuthor={proposal.author.oid === session.user.oid}
      proposal={proposal}
      publishedMarkdown={readFeatureRaw(proposal.slug)}
    />
  );
}
