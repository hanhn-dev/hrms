import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { TeamIteration } from "@hrms/azure-devops";
import {
  activeSprints,
  resolveRoadmapTeams,
  roadmapSprintItems,
  roadmapTeamsQuery,
  sprintItemDates,
  withSprintSchedule,
} from "./sprints.ts";

function iteration(overrides: Partial<TeamIteration> & Pick<TeamIteration, "id" | "name">): TeamIteration {
  return {
    path: `TDG HRMS\\${overrides.name}`,
    timeFrame: "past",
    startDate: null,
    finishDate: null,
    ...overrides,
  };
}

describe("activeSprints", () => {
  it("keeps only the current sprint and drops past, future, and undated sprints", () => {
    const sprints = activeSprints([
      {
        team: "Team Sprinter",
        iterations: [
          iteration({
            id: "current",
            name: "Sprint 61",
            timeFrame: "current",
            startDate: "2026-10-21T00:00:00.000Z",
            finishDate: "2026-11-03T00:00:00.000Z",
          }),
          iteration({
            id: "future",
            name: "Sprint 62",
            timeFrame: "future",
            startDate: "2026-11-04T00:00:00.000Z",
            finishDate: "2026-11-17T00:00:00.000Z",
          }),
          iteration({
            id: "past",
            name: "Sprint 60",
            timeFrame: "past",
            startDate: "2026-10-07T00:00:00.000Z",
            finishDate: "2026-10-20T00:00:00.000Z",
          }),
          iteration({
            id: "open",
            name: "No dates",
            timeFrame: "current",
          }),
        ],
      },
    ]);

    assert.deepEqual(
      sprints.map((sprint) => sprint.id),
      ["current"],
    );
  });
});

describe("roadmapSprintItems", () => {
  it("keeps parent work items and hides tasks, bugs, test cases, and nested children", () => {
    assert.deepEqual(
      roadmapSprintItems([
        { id: 30, title: "Task", type: "Task", state: "New", parentId: 9 },
        { id: 12, title: "Bug", type: "Bug", state: "Active", parentId: null },
        { id: 15, title: "Test", type: "Test Case", state: "Design", parentId: 9 },
        { id: 9, title: "PBI", type: "Product Backlog Item", state: "New", parentId: null },
        { id: 3, title: "Feature", type: "Feature", state: "New", parentId: null },
        {
          id: 8,
          title: "Child PBI",
          type: "Product Backlog Item",
          state: "New",
          parentId: 3,
        },
      ]).map((item) => item.id),
      [3, 9],
    );
  });

  it("returns nothing when the list is empty", () => {
    assert.deepEqual(roadmapSprintItems([]), []);
  });
});

describe("sprintItemDates", () => {
  const sprint = { startsOn: "2026-10-21", endsOn: "2026-11-03" };

  it("maps reported and planned release dates", () => {
    assert.deepEqual(sprintItemDates("2026-05-12", "2026-06-19", sprint), {
      startsOn: "2026-05-12",
      endsOn: "2026-06-19",
    });
  });

  it("uses the sprint end when the planned release date is empty and the sprint start when reported is empty", () => {
    assert.deepEqual(sprintItemDates("2026-10-02", null, sprint), {
      startsOn: "2026-10-02",
      endsOn: "2026-11-03",
    });
    assert.deepEqual(sprintItemDates("", "2026-11-01", sprint), {
      startsOn: "2026-10-21",
      endsOn: "2026-11-01",
    });
    assert.deepEqual(sprintItemDates(null, null, sprint), {
      startsOn: "2026-10-21",
      endsOn: "2026-11-03",
    });
  });

  it("collapses a planned date that is before the reported date", () => {
    assert.deepEqual(sprintItemDates("2026-11-02", "2026-10-01", sprint), {
      startsOn: "2026-11-02",
      endsOn: "2026-11-02",
    });
  });

  it("keeps a Backstage date and ignores Azure until the item has no saved dates", () => {
    const item = {
      id: "33333333-3333-4333-8333-333333333333",
      workItemId: 142316,
      title: "Admin Configuration",
      rank: 1,
      startsOn: "2026-10-22",
      endsOn: "2026-10-28",
    };
    const azure = { reportedOn: "2026-05-12", plannedReleaseOn: "2026-06-19" };
    assert.equal(withSprintSchedule(item, sprint, azure), item);
    const undated = { ...item, startsOn: undefined, endsOn: undefined };
    assert.deepEqual(withSprintSchedule(undated, sprint, azure), {
      ...undated,
      startsOn: "2026-05-12",
      endsOn: "2026-06-19",
    });
    assert.equal(withSprintSchedule(undated, sprint, undefined), undated);
  });
});

describe("resolveRoadmapTeams", () => {
  it("opens on Team Sprinter when the query is missing", () => {
    assert.deepEqual(resolveRoadmapTeams(undefined), ["Team Sprinter"]);
  });

  it("treats an empty value as no teams and drops blanks and duplicates", () => {
    assert.deepEqual(resolveRoadmapTeams(""), []);
    assert.deepEqual(resolveRoadmapTeams(["", "  "]), []);
    assert.deepEqual(resolveRoadmapTeams([" Team Sprinter ", "Team Sprinter", "Platform"]), [
      "Team Sprinter",
      "Platform",
    ]);
  });
});

describe("roadmapTeamsQuery", () => {
  it("omits the query when only Team Sprinter is selected", () => {
    assert.equal(roadmapTeamsQuery(["Team Sprinter"]), null);
  });

  it("writes an empty teams param when every team is cleared", () => {
    assert.equal(roadmapTeamsQuery([]), "teams=");
  });

  it("repeats teams in selection order", () => {
    const params = new URLSearchParams(roadmapTeamsQuery(["Team Sprinter", "Platform"]) ?? "");
    assert.deepEqual(params.getAll("teams"), ["Team Sprinter", "Platform"]);
  });
});
