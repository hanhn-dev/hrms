import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import { RoadmapPanel } from "@/features/azure/roadmap/roadmap-panel";
import { loadSavedRoadmap } from "@/features/azure/roadmap/queries";
import { RoadmapAzureSlot } from "@/features/azure/roadmap/roadmap-slots";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

const HELP = [
  {
    id: "local",
    type: "info" as const,
    title: "Saved in Backstage",
    description:
      "The active sprint fills its lane. Parent work items span that sprint until you drag them. Drag a bar sideways or its ends to set dates, and drag it up or down to change priority. Sprint order and dates are saved in Backstage only. Child items, and past and future sprints, stay hidden. Click a bar to open its details.",
  },
];

export async function RoadmapScreen({
  selectedTeams,
}: {
  selectedTeams: string[];
}): Promise<React.JSX.Element> {
  const roadmap = await loadSavedRoadmap();
  return (
    <div className="h-screen overflow-y-auto">
      <div className="w-full min-w-0 p-4 md:p-6">
        <PageHeader extra={<AzureNav active="roadmap" />} notes={HELP} title="Roadmap" />
        <RoadmapPanel
          initialRoadmap={roadmap}
          selectedTeams={selectedTeams}
          sprintError={null}
          sprints={[]}
          teams={[]}
        >
          <Suspense fallback={<SectionFallback title="Current sprint items" />}>
            <RoadmapAzureSlot selectedTeams={selectedTeams} />
          </Suspense>
        </RoadmapPanel>
      </div>
    </div>
  );
}
