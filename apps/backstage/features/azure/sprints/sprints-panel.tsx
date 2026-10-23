"use client";

import type { ProjectTeam, TeamIteration, TeamIterationTimeframe } from "@hrms/azure-devops";
import {
  filterIterations,
  iterationPathPrefixes,
} from "@/features/azure/sprints/filter-iterations";
import { IterationList } from "@/features/azure/sprints/iteration-list";
import { SprintsFilters } from "@/features/azure/sprints/sprints-filters";

export function SprintsPanel({
  iterations,
  teams,
  defaultTeam,
  selectedIterationPath,
  team,
  timeFrame,
  from,
  to,
  pathPrefix,
  q,
}: {
  iterations: TeamIteration[];
  teams: ProjectTeam[];
  defaultTeam: string;
  selectedIterationPath?: string;
  team?: string;
  timeFrame?: TeamIterationTimeframe;
  from?: string;
  to?: string;
  pathPrefix?: string;
  q?: string;
}): React.JSX.Element {
  const pathOptions = iterationPathPrefixes(iterations);
  const filtered = filterIterations(iterations, {
    timeFrame,
    from,
    to,
    path: pathPrefix,
    q,
  });

  return (
    <>
      <SprintsFilters
        defaultTeam={defaultTeam}
        pathOptions={pathOptions}
        teams={teams}
        values={{
          team: team ?? defaultTeam,
          timeFrame,
          from,
          to,
          pathPrefix,
          q,
          iteration: selectedIterationPath,
        }}
      />
      <IterationList
        filterQuery={{
          team: team && team !== defaultTeam ? team : undefined,
          timeFrame,
          from,
          to,
          path: pathPrefix,
          q,
        }}
        iterations={filtered}
        selectedIterationPath={selectedIterationPath}
        teamName={team ?? defaultTeam}
      />
    </>
  );
}
