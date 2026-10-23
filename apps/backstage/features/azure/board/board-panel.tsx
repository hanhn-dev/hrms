"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Button, Card, Input, Segmented, Tag } from "antd";
import type { ProjectTeam, TeamIteration, TeamMember } from "@hrms/azure-devops";
import { BoardColumns } from "@/features/azure/board/board-columns";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import type { BoardModel, MemberPbiAnswer, PersonPbi, SprintSummary } from "@/features/azure/board/group-board";
import { MemberList } from "@/features/azure/board/member-list";
import { formatDate } from "@/shared/format-date";
import { HighlightMatch, SearchSelect } from "@/shared/ui";

const VIEW_OPTIONS = [
  { label: "Board", value: "board" },
  { label: "By person", value: "people" },
] as const;

export type BoardView = "board" | "people";

function sprintLabel(iteration: TeamIteration): string {
  return iteration.timeFrame == null ? iteration.name : `${iteration.name} (${iteration.timeFrame})`;
}

function MemberAnswer({
  name,
  pbis,
  query,
}: {
  name: string;
  pbis: PersonPbi[];
  query?: string;
}): React.JSX.Element {
  if (pbis.length === 0) {
    return <p className="mb-3">{name} is not on a PBI in this sprint.</p>;
  }
  const noun = pbis.length === 1 ? "PBI" : "PBIs";
  return (
    <p className="mb-3">
      {name} is on {pbis.length} {noun}:{" "}
      {pbis.map((pbi, index) => (
        <span key={pbi.id}>
          {index > 0 ? ", " : null}
          <a href={pbi.url} rel="noopener noreferrer" target="_blank">
            #{pbi.id} <HighlightMatch query={query} text={pbi.title} />
          </a>
        </span>
      ))}
      .
    </p>
  );
}

function SprintSummaryBar({ summary }: { summary: SprintSummary }): React.JSX.Element {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Tag>{summary.total} work items</Tag>
      <Tag color="blue">{summary.pbis} product backlog items</Tag>
      <Tag color="green">{summary.tasks} tasks</Tag>
      <Tag color="red">{summary.bugs} bugs</Tag>
      {summary.other > 0 ? <Tag>{summary.other} other</Tag> : null}
    </div>
  );
}

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

export function BoardPanel({
  teams,
  iterations,
  members,
  team,
  currentIterationPath,
  selected,
  missingIteration,
  assignees,
  types,
  workItemTypes,
  query,
  view,
  model,
  summary,
  showSummary,
  truncated,
}: {
  teams: ProjectTeam[];
  iterations: TeamIteration[];
  members: TeamMember[];
  team: string;
  currentIterationPath?: string;
  selected: TeamIteration | null;
  missingIteration: boolean;
  assignees: string[];
  types: string[];
  workItemTypes: string[];
  query?: string;
  view: BoardView;
  model: BoardModel;
  summary: SprintSummary;
  showSummary: boolean;
  truncated: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const memberOptions = members.map((person) => ({
    label: person.displayName,
    value: person.displayName,
  }));
  for (const assignee of assignees) {
    if (!memberOptions.some((option) => option.value === assignee)) {
      memberOptions.unshift({ label: assignee, value: assignee });
    }
  }
  const typeOptions = [...new Set([...workItemTypes, ...types])].map((type) => ({
    label: type,
    value: type,
  }));

  function updateQuery(patch: Record<string, QueryValue>): void {
    const current: Record<string, QueryValue> = {
      team: team !== DEFAULT_BOARD_TEAM ? team : null,
      iteration:
        selected != null && selected.path !== currentIterationPath ? selected.path : null,
      member: assignees,
      type: types,
      q: query ?? null,
      view: view === "people" ? "people" : null,
      summary: showSummary ? null : "hide",
    };
    const search = writeSearch({ ...current, ...patch });
    startTransition(() => {
      router.push(search ? `${pathname}?${search}` : pathname);
    });
  }

  const sprintReady = selected != null;
  const hasCards = model.columns.some((column) => column.cards.length > 0);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchSelect
          allowClear={team !== DEFAULT_BOARD_TEAM}
          className="min-w-48"
          disabled={pending}
          options={teams.map((projectTeam) => ({
            label: projectTeam.name,
            value: projectTeam.name,
          }))}
          placeholder="Team"
          value={team || undefined}
          onChange={(value: string | null) => {
            updateQuery({
              team: value && value !== DEFAULT_BOARD_TEAM ? value : null,
              iteration: null,
              member: null,
              type: null,
            });
          }}
        />
        <SearchSelect
          allowClear={selected != null && selected.path !== currentIterationPath}
          className="min-w-64"
          disabled={pending}
          options={iterations.map((iteration) => ({
            label: sprintLabel(iteration),
            value: iteration.path,
          }))}
          placeholder="Sprint"
          value={selected?.path}
          onChange={(value: string | null) => {
            updateQuery({
              iteration: value && value !== currentIterationPath ? value : null,
            });
          }}
        />
        <SearchSelect
          allowClear
          className="min-w-56"
          disabled={pending || !sprintReady}
          maxTagCount="responsive"
          mode="multiple"
          options={memberOptions}
          placeholder="Team members"
          value={assignees}
          onChange={(value: string[]) => {
            updateQuery({ member: value ?? null });
          }}
        />
        <SearchSelect
          allowClear
          className="min-w-56"
          disabled={pending || !sprintReady}
          maxTagCount="responsive"
          mode="multiple"
          options={typeOptions}
          placeholder="Work item type"
          value={types}
          onChange={(value: string[]) => {
            updateQuery({ type: value ?? null });
          }}
        />
        <Input.Search
          allowClear
          className="min-w-48 max-w-xs"
          defaultValue={query ?? ""}
          disabled={pending || !sprintReady}
          key={query ?? ""}
          placeholder="Search id, title, person"
          onSearch={(value) => {
            const trimmed = value.trim();
            updateQuery({ q: trimmed.length > 0 ? trimmed : null });
          }}
        />
        <Segmented
          disabled={pending || !sprintReady}
          options={[...VIEW_OPTIONS]}
          value={view}
          onChange={(value) => {
            updateQuery({ view: value === "people" ? "people" : null });
          }}
        />
      </div>
      {truncated ? (
        <Alert
          className="mb-4"
          showIcon
          title="Showing the 200 most recently changed work items. This sprint may have more."
          type="warning"
        />
      ) : null}
      {missingIteration ? (
        <Alert className="mb-4" showIcon title="That sprint is not on this team." type="warning" />
      ) : null}
      {!missingIteration && !sprintReady ? (
        <Alert
          showIcon
          title={`${team} has no current sprint.`}
          type="info"
        />
      ) : null}
      {sprintReady ? (
        <Card
          className="min-h-0 min-w-0 flex-1"
          styles={{
            root: {
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              minWidth: 0,
              width: "100%",
            },
            body: {
              display: "flex",
              flex: 1,
              flexDirection: "column",
              minHeight: 0,
              minWidth: 0,
              overflow: "hidden",
              padding: 0,
            },
          }}
          title={
            <span className="inline-flex flex-wrap items-baseline gap-2">
              <span>{selected.name}</span>
              <span className="text-sm font-normal text-slate-500">
                {formatDate(selected.startDate)} – {formatDate(selected.finishDate)}
              </span>
            </span>
          }
        >
          {showSummary ? (
            <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 px-6 pt-6">
              <SprintSummaryBar summary={summary} />
              <Button
                disabled={pending}
                type="link"
                onClick={() => {
                  updateQuery({ summary: "hide" });
                }}
              >
                Hide summary
              </Button>
            </div>
          ) : (
            <div className="shrink-0 px-6 pt-6">
              <Button
                disabled={pending}
                type="link"
                onClick={() => {
                  updateQuery({ summary: null });
                }}
              >
                Show summary
              </Button>
            </div>
          )}
          {model.memberAnswers.length > 0 ? (
            <div className="shrink-0 px-6 pt-3">
              {model.memberAnswers.map((answer: MemberPbiAnswer) => (
                <MemberAnswer key={answer.displayName} name={answer.displayName} pbis={answer.pbis} query={query} />
              ))}
            </div>
          ) : null}
          {!hasCards ? (
            <p className="px-6 py-6 text-slate-500">
              {query || assignees.length > 0 || types.length > 0
                ? "No work items match this search."
                : "No work items in this sprint."}
            </p>
          ) : view === "people" ? (
            <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
              <MemberList people={model.people} query={query} />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 pb-4">
              <div className="min-h-0 flex-1 overflow-auto">
                <BoardColumns columns={model.columns} query={query} />
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
