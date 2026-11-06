import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";
import { emptyBranchDefaults, saveRepositoryBranchDefaults } from "./branch-defaults.ts";
import { readBranchDefaults, writeBranchDefaults } from "./branch-defaults-store.ts";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "git-branch-defaults-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("branch defaults store", () => {
  it("returns an empty file when missing", () => {
    const file = path.join(tempRoot(), "defaults.json");
    assert.deepEqual(readBranchDefaults(file), emptyBranchDefaults());
  });

  it("round-trips a repository row", () => {
    const file = path.join(tempRoot(), "nested", "defaults.json");
    const saved = saveRepositoryBranchDefaults(emptyBranchDefaults(), {
      repositoryName: "TDG HRMS DB",
      defaultBranch: "QA",
      leftBranch: "QA",
      rightBranch: "Staging",
    });
    writeBranchDefaults(saved, file);
    const loaded = readBranchDefaults(file);
    assert.equal(loaded.repositories.length, 1);
    assert.equal(loaded.repositories[0]?.defaultBranch, "QA");
    assert.equal(loaded.repositories[0]?.rightBranch, "Staging");
  });

  it("rejects invalid JSON and an invalid file", () => {
    const root = tempRoot();
    const broken = path.join(root, "broken.json");
    writeFileSync(broken, "{", "utf8");
    assert.throws(() => readBranchDefaults(broken), /not valid JSON/);

    const invalid = path.join(root, "invalid.json");
    writeFileSync(invalid, `${JSON.stringify({ version: 1, repositories: [{ repositoryName: "TDG HRMS DB" }] })}\n`, "utf8");
    assert.throws(() => readBranchDefaults(invalid), /defaultBranch|expected|invalid/i);
  });
});
