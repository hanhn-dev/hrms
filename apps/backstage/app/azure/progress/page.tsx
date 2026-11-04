import { Suspense } from "react";
import { ProgressScreen } from "@/features/azure/progress";
import { parseTeamId } from "@/features/azure/progress/member-params";
import {
  parseProgressPrDate,
  parseProgressPrMode,
  parseProgressPrPreset,
} from "@/features/azure/progress/progress-slots";
import { requireFeaturePage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

type ProgressSearchParams = {
  teamId?: string;
  /** Legacy bookmark from tracking lists — treated as teamId. */
  list?: string;
  sprint?: string;
  prMode?: string;
  prPreset?: string;
  prFrom?: string;
  prTo?: string;
};

export default function AzureProgressPage({
  searchParams,
}: {
  searchParams: Promise<ProgressSearchParams>;
}): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Team progress" />}>
      <AzureProgressPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AzureProgressPageBody({
  searchParams,
}: {
  searchParams: Promise<ProgressSearchParams>;
}): Promise<React.JSX.Element> {
  await requireFeaturePage("azure");
  const params = await searchParams;
  return (
    <ProgressScreen
      prFrom={parseProgressPrDate(params.prFrom)}
      prMode={parseProgressPrMode(params.prMode)}
      prPreset={parseProgressPrPreset(params.prPreset)}
      prTo={parseProgressPrDate(params.prTo)}
      sprint={params.sprint}
      teamId={parseTeamId(params.teamId) ?? parseTeamId(params.list)}
    />
  );
}
