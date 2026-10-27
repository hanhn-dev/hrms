import { Suspense } from "react";
import { PullRequestsScreen } from "@/features/azure/pull-requests";
import { requireFeaturePage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

export default function AzurePullRequestsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Pull requests" />}>
      <AzurePullRequestsPageBody />
    </Suspense>
  );
}

async function AzurePullRequestsPageBody(): Promise<React.JSX.Element> {
  await requireFeaturePage("azure");
  return <PullRequestsScreen />;
}
