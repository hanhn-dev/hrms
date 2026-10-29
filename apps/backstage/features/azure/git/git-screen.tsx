import { Suspense } from "react";

import { AzureNav } from "@/features/azure/azure-nav";
import { GitReposSlot } from "@/features/azure/git/git-repos-slot";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

const HELP = [
  {
    id: "history",
    type: "info" as const,
    title: "Who changed it",
    description:
      "History lists recent commits on a branch. Search the path by file name. Suggestions come from Dev, and recent paths stay in this browser. Scroll to the bottom of the table to load older commits. The PR column is the pull request that introduced the commit. Click an author to see their pull requests and commits in this repository. Click a row to open the commit beside the table. Azure DevOps does not offer line-by-line blame through its API. Use Open blame in Azure DevOps on Compare file when you need every line's last author.",
  },
  {
    id: "commits",
    type: "info" as const,
    title: "Two commits",
    description:
      "Paste two commit ids, or copy them from a commit link in History, to list the files that differ between those versions and open a side-by-side diff.",
  },
  {
    id: "file",
    type: "info" as const,
    title: "One file, two branches",
    description:
      "Search for a file by name. Suggestions come from Dev, and recent paths stay in this browser. Pick two branches to compare that file at each branch tip. Word changes are highlighted inside the line. The table under the diff lists commits that touched the file on one branch and not the other.",
  },
];

export async function GitScreen(): Promise<React.JSX.Element> {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col p-3 md:p-4">
        <div className="shrink-0">
          <PageHeader compact extra={<AzureNav active="git" />} notes={HELP} title="Git" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<SectionFallback title="Repositories" />}>
            <GitReposSlot />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
