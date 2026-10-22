import { Suspense } from "react";
import type { TeamIterationTimeframe } from "@hrms/azure-devops";
import { SprintsScreen } from "@/features/azure/sprints";
import { requireRootAdminPage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

const TIME_FRAMES = new Set<TeamIterationTimeframe>(["past", "current", "future"]);

function parseTimeFrame(value: string | undefined): TeamIterationTimeframe | undefined {
  if (value == null || !TIME_FRAMES.has(value as TeamIterationTimeframe)) {
    return undefined;
  }
  return value as TeamIterationTimeframe;
}

export default function AzureSprintsPage({
  searchParams,
}: {
  searchParams: Promise<{
    iteration?: string;
    team?: string;
    timeFrame?: string;
    from?: string;
    to?: string;
    path?: string;
    q?: string;
  }>;
}): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Sprints" />}>
      <AzureSprintsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AzureSprintsPageBody({
  searchParams,
}: {
  searchParams: Promise<{
    iteration?: string;
    team?: string;
    timeFrame?: string;
    from?: string;
    to?: string;
    path?: string;
    q?: string;
  }>;
}): Promise<React.JSX.Element> {
  await requireRootAdminPage();
  const params = await searchParams;
  return (
    <SprintsScreen
      from={params.from}
      iterationPath={params.iteration}
      pathPrefix={params.path}
      q={params.q}
      team={params.team}
      timeFrame={parseTimeFrame(params.timeFrame)}
      to={params.to}
    />
  );
}
