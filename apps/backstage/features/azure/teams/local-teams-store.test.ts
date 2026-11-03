import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";
import {
  createLocalTeam,
  deleteLocalTeam,
  emptyLocalTeams,
  migrateFromTrackingLists,
  updateLocalTeam,
} from "./local-teams.ts";
import { readLocalTeams, writeLocalTeams } from "./local-teams-store.ts";

const TEAM_A = "11111111-1111-4111-8111-111111111111";
const TEAM_B = "22222222-2222-4222-8222-222222222222";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "progress-teams-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("local teams store", () => {
  it("returns an empty file when missing", () => {
    const root = tempRoot();
    const file = path.join(root, "teams.json");
    const legacy = path.join(root, "lists.json");
    assert.deepEqual(readLocalTeams(file, legacy), emptyLocalTeams());
  });

  it("round-trips a team and dedupes members", () => {
    const root = tempRoot();
    const file = path.join(root, "teams.json");
    const created = createLocalTeam(
      emptyLocalTeams(),
      {
        name: "Core",
        azureTeam: "Team Sprinter",
        members: ["Alice", "Alice", " Bob "],
        updatedBy: "ops",
      },
      TEAM_A,
      "2026-11-03T00:00:00.000Z",
    );
    writeLocalTeams(created, file);
    const loaded = readLocalTeams(file, path.join(root, "missing-lists.json"));
    assert.equal(loaded.teams.length, 1);
    assert.deepEqual(loaded.teams[0]?.members, ["Alice", "Bob"]);
    assert.equal(loaded.teams[0]?.azureTeam, "Team Sprinter");
  });

  it("rejects blank and duplicate names", () => {
    assert.throws(
      () =>
        createLocalTeam(
          emptyLocalTeams(),
          { name: "  ", azureTeam: "Team Sprinter", members: [] },
          TEAM_A,
        ),
      /team name/i,
    );
    const withOne = createLocalTeam(
      emptyLocalTeams(),
      { name: "Core", azureTeam: "Team Sprinter", members: ["Alice"] },
      TEAM_A,
    );
    assert.throws(
      () =>
        createLocalTeam(
          withOne,
          { name: "core", azureTeam: "Team Sprinter", members: ["Bob"] },
          TEAM_B,
        ),
      /already exists/i,
    );
  });

  it("updates and deletes by id", () => {
    let data = createLocalTeam(
      emptyLocalTeams(),
      { name: "Core", azureTeam: "Team Sprinter", members: ["Alice"] },
      TEAM_A,
      "2026-11-03T00:00:00.000Z",
    );
    data = updateLocalTeam(
      data,
      TEAM_A,
      { name: "Core+", azureTeam: "Team Sprinter", members: ["Alice", "Bob"] },
      "2026-11-03T01:00:00.000Z",
    );
    assert.deepEqual(data.teams[0]?.members, ["Alice", "Bob"]);
    data = deleteLocalTeam(data, TEAM_A);
    assert.deepEqual(data.teams, []);
  });

  it("migrates legacy tracking lists into teams.json", () => {
    const root = tempRoot();
    const teamsFile = path.join(root, "teams", "teams.json");
    const legacyDir = path.join(root, "lists");
    mkdirSync(legacyDir, { recursive: true });
    const legacyFile = path.join(legacyDir, "lists.json");
    writeFileSync(
      legacyFile,
      `${JSON.stringify(
        {
          version: 1,
          lists: [
            {
              id: TEAM_A,
              name: "Core",
              team: "Team Sprinter",
              members: ["Alice", "Bob"],
              updatedAt: "2026-11-03T00:00:00.000Z",
              updatedBy: null,
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    const loaded = readLocalTeams(teamsFile, legacyFile);
    assert.equal(loaded.teams.length, 1);
    assert.equal(loaded.teams[0]?.azureTeam, "Team Sprinter");
    assert.equal(existsSync(teamsFile), true);
  });
});

describe("migrateFromTrackingLists", () => {
  it("maps team to azureTeam", () => {
    const migrated = migrateFromTrackingLists({
      version: 1,
      lists: [
        {
          id: TEAM_A,
          name: "Core",
          team: "Team Sprinter",
          members: ["Alice"],
          updatedAt: "2026-11-03T00:00:00.000Z",
          updatedBy: null,
        },
      ],
    });
    assert.equal(migrated.teams[0]?.azureTeam, "Team Sprinter");
    assert.equal(migrated.teams[0]?.name, "Core");
  });
});
