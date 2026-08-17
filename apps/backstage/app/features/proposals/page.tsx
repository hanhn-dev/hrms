import { redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/auth";
import { ProposalList } from "@/components/features/proposal-list";
import { listProposals } from "@/lib/proposals";

export const dynamic = "force-dynamic";

export default async function ProposalsPage(): Promise<React.JSX.Element> {
  if (!isAuthConfigured()) {
    redirect("/features");
  }
  const session = await auth();
  if (!session?.user.isAdmin) {
    redirect("/features");
  }

  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Feature proposals
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Approve publishes to the live guide (and archives yesterday’s copy when
          the date changed). Reject leaves the live page unchanged.
        </p>
        <ProposalList proposals={listProposals()} />
      </div>
    </div>
  );
}
