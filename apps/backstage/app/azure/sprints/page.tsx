import type { TeamIterationTimeframe } from "@hrms/azure-devops";
import { SprintsScreen } from "@/features/azure/sprints";

const TIME_FRAMES = new Set<TeamIterationTimeframe>(["past", "current", "future"]);

function parseTimeFrame(value: string | undefined): TeamIterationTimeframe | undefined {
  if (value == null || !TIME_FRAMES.has(value as TeamIterationTimeframe)) {
    return undefined;
  }
  return value as TeamIterationTimeframe;
}

export default async function AzureSprintsPage({
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
