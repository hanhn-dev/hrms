import { Suspense } from "react";
import { RoadmapScreen } from "@/features/azure/roadmap";
import { resolveRoadmapTeams } from "@/features/azure/roadmap/sprints";
import { requireFeaturePage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

type RoadmapSearchParams = {
  teams?: string | string[];
};

export default function AzureRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<RoadmapSearchParams>;
}): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Roadmap" />}>
      <AzureRoadmapPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AzureRoadmapPageBody({
  searchParams,
}: {
  searchParams: Promise<RoadmapSearchParams>;
}): Promise<React.JSX.Element> {
  await requireFeaturePage("azure");
  const params = await searchParams;
  return <RoadmapScreen selectedTeams={resolveRoadmapTeams(params.teams)} />;
}
