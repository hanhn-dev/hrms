import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";
import {
  DEFAULT_TRACKING_TEAM_NAME,
  findDefaultTrackingTeam,
  resolveSelectedTrackingTeam,
} from "./resolve-tracking-team.ts";

function team(partial: Partial<LocalTeamEntry> & Pick<LocalTeamEntry, "id" | "name">): LocalTeamEntry {
  return {
    azureTeam: partial.azureTeam ?? partial.name,
    members: partial.members ?? [],
    updatedAt: partial.updatedAt ?? "2026-11-04T00:00:00.000Z",
    updatedBy: partial.updatedBy ?? null,
    ...partial,
  };
}

describe("findDefaultTrackingTeam", () => {
  it("prefers a local team whose name is Team Sprinter", () => {
    const sprinter = team({ id: "11111111-1111-1111-1111-111111111111", name: "Team Sprinter" });
    const other = team({ id: "22222222-2222-2222-2222-222222222222", name: "Other" });
    assert.equal(findDefaultTrackingTeam([other, sprinter]), sprinter);
  });

  it("falls back to azureTeam matching Team Sprinter", () => {
    const match = team({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Sprinters",
      azureTeam: DEFAULT_TRACKING_TEAM_NAME,
    });
    assert.equal(findDefaultTrackingTeam([match]), match);
  });

  it("returns null when no team matches", () => {
    assert.equal(
      findDefaultTrackingTeam([
        team({ id: "11111111-1111-1111-1111-111111111111", name: "Other" }),
      ]),
      null,
    );
  });
});

describe("resolveSelectedTrackingTeam", () => {
  const sprinter = team({ id: "11111111-1111-1111-1111-111111111111", name: "Team Sprinter" });
  const other = team({ id: "22222222-2222-2222-2222-222222222222", name: "Other" });

  it("defaults to Team Sprinter when teamId is omitted", () => {
    const resolved = resolveSelectedTrackingTeam([other, sprinter], null);
    assert.deepEqual(resolved, { selected: sprinter, missingTeam: false });
  });

  it("uses the requested team id when present", () => {
    const resolved = resolveSelectedTrackingTeam([other, sprinter], other.id);
    assert.deepEqual(resolved, { selected: other, missingTeam: false });
  });

  it("flags a missing team id", () => {
    const resolved = resolveSelectedTrackingTeam(
      [sprinter],
      "33333333-3333-3333-3333-333333333333",
    );
    assert.deepEqual(resolved, { selected: null, missingTeam: true });
  });
});
