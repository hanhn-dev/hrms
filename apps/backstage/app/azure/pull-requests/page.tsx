import { Suspense } from "react";
import { PullRequestsScreen } from "@/features/azure/pull-requests";
import { parsePullRequestsTab } from "@/features/azure/pull-requests/pull-requests-tab";
import { toDateOnly } from "@/features/azure/pull-requests/aggregate-pull-requests";
import {
  parseTrackingPrMode,
  parseTrackingPrPreset,
} from "@/features/azure/pull-requests/tracking-range";
import { parseTeamId } from "@/features/azure/progress/member-params";
import { requireFeaturePage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

type PullRequestsSearchParams = {
  tab?: string;
  teamId?: string;
  sprint?: string;
  prMode?: string;
  prPreset?: string;
  prFrom?: string;
  prTo?: string;
};

export default function AzurePullRequestsPage({
  searchParams,
}: {
  searchParams: Promise<PullRequestsSearchParams>;
}): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Pull requests" />}>
      <AzurePullRequestsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AzurePullRequestsPageBody({
  searchParams,
}: {
  searchParams: Promise<PullRequestsSearchParams>;
}): Promise<React.JSX.Element> {
  await requireFeaturePage("azure");
  const params = await searchParams;
  return (
    <PullRequestsScreen
      prFrom={toDateOnly(params.prFrom)}
      prMode={parseTrackingPrMode(params.prMode)}
      prPreset={parseTrackingPrPreset(params.prPreset)}
      prTo={toDateOnly(params.prTo)}
      sprint={params.sprint}
      tab={parsePullRequestsTab(params.tab)}
      teamId={parseTeamId(params.teamId)}
    />
  );
}
