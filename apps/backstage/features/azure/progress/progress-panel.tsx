"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Card, Collapse } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import type { TeamIteration, WorkItemSummary } from "@hrms/azure-devops";
import { SPRINT_WORK_ITEM_CAP } from "@/features/azure/board/defaults";
import {
  filterMembers,
  filterVelocitySeries,
  type PersonProgress,
  type VelocitySeries,
} from "@/features/azure/progress/aggregate-progress";
import { ProgressBoard } from "@/features/azure/progress/progress-board";
import { ProgressSummary } from "@/features/azure/progress/progress-summary";
import { VelocityPanel } from "@/features/azure/progress/velocity-panel";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";
import { formatDate } from "@/shared/format-date";
import { PageHelpTrigger, SearchSelect, type PageHelpNote } from "@/shared/ui";

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

function buildCapWarningNotes(
  truncated: boolean,
  velocityTruncatedPaths: readonly string[],
): PageHelpNote[] {
  const notes: PageHelpNote[] = [];
  if (truncated) {
    notes.push({
      id: "sprint-cap",
      type: "warning",
      title: `This sprint returned the ${SPRINT_WORK_ITEM_CAP}-item cap.`,
      description: "Counts may be incomplete.",
    });
  }
  if (velocityTruncatedPaths.length > 0) {
    notes.push({
      id: "velocity-cap",
      type: "warning",
      title: `Velocity used the ${SPRINT_WORK_ITEM_CAP}-item cap for one or more sprints.`,
      description:
        velocityTruncatedPaths.length === 1
          ? `Affected sprint path: ${velocityTruncatedPaths[0]}`
          : `${velocityTruncatedPaths.length} recent sprints hit the cap.`,
    });
  }
  return notes;
}

export function ProgressPanel({
  localTeams,
  selectedTeam,
  iterations,
  currentIterationPath,
  selected,
  missingIteration,
  missingTeam,
  rows,
  allWorkItems,
  truncated,
  velocity,
  velocityTruncatedPaths,
}: {
  localTeams: LocalTeamEntry[];
  selectedTeam: LocalTeamEntry | null;
  iterations: TeamIteration[];
  currentIterationPath?: string;
  selected: TeamIteration | null;
  missingIteration: boolean;
  missingTeam: boolean;
  rows: PersonProgress[];
  allWorkItems: WorkItemSummary[];
  truncated: boolean;
  velocity: VelocitySeries;
  velocityTruncatedPaths: string[];
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [memberFilter, setMemberFilter] = useState<string[]>([]);

  useEffect(() => {
    setMemberFilter([]);
  }, [selectedTeam?.id]);

  function updateQuery(patch: Record<string, QueryValue>): void {
    const current: Record<string, QueryValue> = {
      teamId: selectedTeam?.id ?? null,
      sprint:
        selected != null && selected.path !== currentIterationPath ? selected.path : null,
    };
    const search = writeSearch({ ...current, ...patch });
    startTransition(() => {
      router.push(search ? `${pathname}?${search}` : pathname);
    });
  }

  const dateRange =
    selected?.startDate != null && selected.finishDate != null
      ? `${formatDate(selected.startDate)} – ${formatDate(selected.finishDate)}`
      : null;

  const visibleRows = filterMembers(rows, memberFilter);
  const visibleVelocity = filterVelocitySeries(velocity, memberFilter);
  const capWarnings = buildCapWarningNotes(truncated, velocityTruncatedPaths);

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
            , then return here to track progress.
          </span>
        }
        type="info"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchSelect
          allowClear
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
            updateQuery({
              teamId: value,
              sprint: null,
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
        <PageHelpTrigger
          ariaLabel="Sprint data warnings"
          className="!h-auto !w-auto !p-0 text-amber-500"
          icon={<WarningOutlined />}
          notes={capWarnings}
          title="Sprint data warnings"
        />
        <Link className="text-sm underline" href="/azure/teams">
          Manage teams
        </Link>
      </div>

      {missingTeam ? (
        <Alert showIcon title="That local team was not found." type="warning" />
      ) : null}

      {selectedTeam == null ? (
        <p className="m-0 text-sm text-slate-500">Select a local team to load members and progress.</p>
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

      {selectedTeam == null ? (
        <Card size="small" title="People board">
          <p className="m-0 text-slate-500">Pick a local team first.</p>
        </Card>
      ) : selected == null ? (
        <Card size="small" title="People board">
          <p className="m-0 text-slate-500">Pick a sprint to see member progress.</p>
        </Card>
      ) : (
        <ProgressBoard
          allWorkItems={allWorkItems}
          columnRows={rows}
          rows={visibleRows}
          title={`People board — ${selected.name}${dateRange ? ` (${dateRange})` : ""}`}
        />
      )}

      {selectedTeam != null && selected != null ? (
        <Collapse
          items={[
            {
              key: "summary",
              label: "Compare counts (Active / Done / Progress)",
              children: <ProgressSummary rows={visibleRows} />,
            },
            {
              key: "velocity",
              label: "Velocity across recent sprints",
              children: <VelocityPanel series={visibleVelocity} />,
            },
          ]}
        />
      ) : (
        <Card size="small" title="Velocity (recent sprints)">
          <p className="m-0 text-slate-500">
            Pick a local team and sprint to see comparison and velocity.
          </p>
        </Card>
      )}
    </div>
  );
}
