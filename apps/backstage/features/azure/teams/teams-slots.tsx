import { TeamsPanel } from "@/features/azure/teams/teams-panel";
import {
  listAzureProjectMembers,
  listAzureProjectTeams,
  listLocalTeams,
} from "@/features/azure/teams/queries";

export async function TeamsSlot(): Promise<React.JSX.Element> {
  const [teams, azureTeams, projectMembers] = await Promise.all([
    listLocalTeams(),
    listAzureProjectTeams(),
    listAzureProjectMembers(),
  ]);
  return (
    <TeamsPanel
      azureTeams={azureTeams}
      projectMembers={projectMembers}
      teams={teams}
    />
  );
}
