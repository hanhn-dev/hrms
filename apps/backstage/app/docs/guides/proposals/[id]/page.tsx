import { notFound, redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/auth";
import { ProposalReview } from "@/components/guides/proposal-review";
import { readFeatureRaw } from "@/lib/guides";
import { canAccessProposal, getProposal } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  if (!isAuthConfigured()) {
    redirect("/docs/guides");
  }
  const session = await auth();
  if (!session?.user) {
    redirect("/docs/guides");
  }

  const { id } = await params;
  const proposal = getProposal(id);
  if (!proposal) {
    notFound();
  }
  if (!canAccessProposal(proposal, session.user)) {
    redirect("/docs/guides");
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
