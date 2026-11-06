"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert } from "antd";
import type { TeamIteration } from "@hrms/azure-devops";
import { toDateOnly } from "@/features/azure/pull-requests/aggregate-pull-requests";
import { findDefaultTrackingTeam } from "@/features/azure/pull-requests/resolve-tracking-team";
import { TrackingMemberFilterContext } from "@/features/azure/pull-requests/tracking-member-filter-context";
import { TrackingPrPeriodControls } from "@/features/azure/pull-requests/tracking-period";
import {
  DEFAULT_TRACKING_PR_PRESET,
  type TrackingPrMode,
  type TrackingPrPreset,
} from "@/features/azure/pull-requests/tracking-range";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";
import { SearchSelect } from "@/shared/ui";

type QueryValue = string | readonly string[] | null;

function writeSearch(values: Record<string, QueryValue>): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value == null) {
      continue;
    }
    const entries = typeof value === "string" ? [value] : value;
    for (const entry of entries) {
      if (entry !== "") {
        next.append(key, entry);
      }
    }
  }
  return next.toString();
}

function sprintLabel(iteration: TeamIteration): string {
  return iteration.timeFrame == null ? iteration.name : `${iteration.name} (${iteration.timeFrame})`;
}

export function PullRequestsTrackingPanel({
  localTeams,
  selectedTeam,
  iterations,
  currentIterationPath,
  selected,
  missingIteration,
  missingTeam,
  prMode,
  prPreset,
  prFrom,
  prTo,
  results,
}: {
  localTeams: LocalTeamEntry[];
  selectedTeam: LocalTeamEntry | null;
  iterations: TeamIteration[];
  currentIterationPath?: string;
  selected: TeamIteration | null;
  missingIteration: boolean;
  missingTeam: boolean;
  prMode: TrackingPrMode;
  prPreset: TrackingPrPreset;
  prFrom: string | null;
  prTo: string | null;
  results: ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [memberFilter, setMemberFilter] = useState<string[]>([]);

  useEffect(() => {
    setMemberFilter([]);
  }, [selectedTeam?.id]);

  function serializePrMode(mode: TrackingPrMode): string | null {
    if (mode === "preset") {
      return null;
    }
    return mode;
  }

  function serializePrPreset(mode: TrackingPrMode, preset: TrackingPrPreset): string | null {
    if (mode !== "preset" || preset === DEFAULT_TRACKING_PR_PRESET) {
      return null;
    }
    return preset;
  }

  const defaultTeam = findDefaultTrackingTeam(localTeams);
  const isDefaultTeam =
    selectedTeam != null && defaultTeam != null && selectedTeam.id === defaultTeam.id;

  function updateQuery(patch: Record<string, QueryValue>): void {
    const current: Record<string, QueryValue> = {
      tab: "tracking",
      teamId: selectedTeam != null && !isDefaultTeam ? selectedTeam.id : null,
      sprint:
        selected != null && selected.path !== currentIterationPath ? selected.path : null,
      prMode: serializePrMode(prMode),
      prPreset: serializePrPreset(prMode, prPreset),
      prFrom: prMode === "custom" ? prFrom : null,
      prTo: prMode === "custom" ? prTo : null,
    };
    const search = writeSearch({ ...current, ...patch });
    startTransition(() => {
      router.push(search ? `${pathname}?${search}` : pathname);
    });
  }

  if (localTeams.length === 0) {
    return (
      <Alert
        showIcon
        title="No local teams yet"
        description={
          <span>
            Create a team and add members on{" "}
            <Link className="underline" href="/azure/teams">
              Teams
            </Link>
            , then return here to track pull requests.
          </span>
        }
        type="info"
      />
    );
  }

  return (
    <TrackingMemberFilterContext.Provider value={memberFilter}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchSelect
            allowClear={selectedTeam != null && !isDefaultTeam}
            className="min-w-56"
            disabled={pending}
            options={localTeams.map((team) => ({
              label: team.name,
              value: team.id,
            }))}
            placeholder="Local team"
            value={selectedTeam?.id}
            onChange={(value: string | null) => {
              setMemberFilter([]);
              const nextId =
                value == null || (defaultTeam != null && value === defaultTeam.id)
                  ? null
                  : value;
              updateQuery({
                teamId: nextId,
                sprint: null,
                prMode: null,
                prPreset: null,
                prFrom: null,
                prTo: null,
              });
            }}
          />
          <SearchSelect
            allowClear={selected != null && selected.path !== currentIterationPath}
            className="min-w-64"
            disabled={pending || selectedTeam == null}
            options={iterations.map((iteration) => ({
              label: sprintLabel(iteration),
              value: iteration.path,
            }))}
            placeholder="Sprint"
            value={selected?.path}
            onChange={(value: string | null) => {
              updateQuery({
                sprint: value && value !== currentIterationPath ? value : null,
              });
            }}
          />
          <Link className="text-sm underline" href="/azure/teams">
            Manage teams
          </Link>
        </div>

        {missingTeam ? (
          <Alert showIcon title="That local team was not found." type="warning" />
        ) : null}

        {selectedTeam == null ? (
          <p className="m-0 text-sm text-slate-500">
            Select a local team to load members and pull request counts.
          </p>
        ) : selectedTeam.members.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">
            This team has no members.{" "}
            <Link className="underline" href="/azure/teams">
              Edit team
            </Link>
          </p>
        ) : (
          <SearchSelect
            allowClear
            className="min-w-56 max-w-xl"
            disabled={pending}
            maxTagCount="responsive"
            mode="multiple"
            options={selectedTeam.members.map((member) => ({
              label: member,
              value: member,
            }))}
            placeholder="Team members"
            value={memberFilter}
            onChange={(value: string[]) => {
              setMemberFilter(value ?? []);
            }}
          />
        )}

        {missingIteration ? (
          <Alert showIcon title="That sprint was not found for this team." type="warning" />
        ) : null}

        {selectedTeam == null ? null : (
          <div>
            <TrackingPrPeriodControls
              customFrom={prFrom}
              customTo={prTo}
              disabled={pending}
              mode={prMode}
              preset={prPreset}
              sprintFinish={toDateOnly(selected?.finishDate)}
              sprintStart={toDateOnly(selected?.startDate)}
              onCustomRangeChange={(from, to) => {
                updateQuery({
                  prMode: "custom",
                  prPreset: null,
                  prFrom: from,
                  prTo: to,
                });
              }}
              onModeChange={(mode) => {
                updateQuery({
                  prMode: serializePrMode(mode),
                  prPreset: serializePrPreset(mode, prPreset),
                  prFrom: mode === "custom" ? prFrom : null,
                  prTo: mode === "custom" ? prTo : null,
                });
              }}
              onPresetChange={(nextPreset) => {
                updateQuery({
                  prMode: null,
                  prPreset: serializePrPreset("preset", nextPreset),
                  prFrom: null,
                  prTo: null,
                });
              }}
            />
            {results}
          </div>
        )}
      </div>
    </TrackingMemberFilterContext.Provider>
  );
}
