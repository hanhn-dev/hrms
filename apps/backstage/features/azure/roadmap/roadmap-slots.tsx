import { RoadmapAzureHydrator } from "@/features/azure/roadmap/roadmap-panel";
import {
  listRoadmapTeams,
  loadRoadmapSprintLanes,
} from "@/features/azure/roadmap/queries";

export async function RoadmapAzureSlot({
  selectedTeams,
}: {
  selectedTeams: string[];
}): Promise<React.JSX.Element> {
  const [teams, sprintLoad] = await Promise.all([
    listRoadmapTeams(),
    loadRoadmapSprintLanes(selectedTeams),
  ]);
  return (
    <RoadmapAzureHydrator
      sprintError={sprintLoad.error}
      sprints={sprintLoad.sprints}
      teams={teams}
    />
  );
}
