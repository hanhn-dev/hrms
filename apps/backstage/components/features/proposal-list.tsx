import Link from "next/link";
import type { ProposalMeta } from "@/lib/proposals";

function statusLabel(status: ProposalMeta["status"]): string {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Withdrawn";
}

export function ProposalList({
  proposals,
}: {
  proposals: ProposalMeta[];
}): React.JSX.Element {
  if (proposals.length === 0) {
    return (
      <p className="mt-8 text-sm italic text-slate-500 dark:text-slate-400">
        No proposals yet.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {proposals.map((proposal) => (
        <li key={proposal.id}>
          <Link
            className="flex items-baseline justify-between gap-4 px-4 py-3 no-underline hover:bg-slate-50 dark:hover:bg-slate-900"
            href={`/features/proposals/${proposal.id}`}
          >
            <span>
              <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                {proposal.slug}
              </span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                {proposal.author.name} · {proposal.createdAt.slice(0, 10)}
              </span>
            </span>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {statusLabel(proposal.status)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
