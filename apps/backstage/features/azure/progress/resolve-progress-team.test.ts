import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";
import {
  DEFAULT_PROGRESS_TEAM_NAME,
  findDefaultProgressTeam,
  resolveSelectedProgressTeam,
} from "./resolve-progress-team.ts";

function team(partial: Partial<LocalTeamEntry> & Pick<LocalTeamEntry, "id" | "name">): LocalTeamEntry {
  return {
    azureTeam: partial.azureTeam ?? partial.name,
    members: partial.members ?? [],
    updatedAt: partial.updatedAt ?? "2026-11-06T00:00:00.000Z",
    updatedBy: partial.updatedBy ?? null,
    ...partial,
  };
}

describe("findDefaultProgressTeam", () => {
  it("prefers a local team whose name is Team Sprinter", () => {
    const sprinter = team({ id: "11111111-1111-1111-1111-111111111111", name: "Team Sprinter" });
    const other = team({ id: "22222222-2222-2222-2222-222222222222", name: "Other" });
    assert.equal(findDefaultProgressTeam([other, sprinter]), sprinter);
  });

  it("falls back to azureTeam matching Team Sprinter", () => {
    const match = team({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Sprinters",
      azureTeam: DEFAULT_PROGRESS_TEAM_NAME,
    });
    assert.equal(findDefaultProgressTeam([match]), match);
  });

  it("returns null when no team matches", () => {
    assert.equal(
      findDefaultProgressTeam([
        team({ id: "11111111-1111-1111-1111-111111111111", name: "Other" }),
      ]),
      null,
    );
  });
});

describe("resolveSelectedProgressTeam", () => {
  const sprinter = team({ id: "11111111-1111-1111-1111-111111111111", name: "Team Sprinter" });
  const other = team({ id: "22222222-2222-2222-2222-222222222222", name: "Other" });

  it("defaults to Team Sprinter when teamId is omitted", () => {
    const resolved = resolveSelectedProgressTeam([other, sprinter], null);
    assert.deepEqual(resolved, { selected: sprinter, missingTeam: false });
  });

  it("uses the requested team id when present", () => {
    const resolved = resolveSelectedProgressTeam([other, sprinter], other.id);
    assert.deepEqual(resolved, { selected: other, missingTeam: false });
  });

  it("flags a missing team id", () => {
    const resolved = resolveSelectedProgressTeam(
      [sprinter],
      "33333333-3333-3333-3333-333333333333",
    );
    assert.deepEqual(resolved, { selected: null, missingTeam: true });
  });
});
