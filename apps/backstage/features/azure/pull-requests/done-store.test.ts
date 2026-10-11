import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";
import { getDonePullRequestIds, setPullRequestDone } from "./done-store.ts";

const roots: string[] = [];

function makeDbPath(): string {
  const root = mkdtempSync(path.join(tmpdir(), "pull-requests-done-"));
  roots.push(root);
  return path.join(root, "pull-requests.sqlite");
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("done-store", () => {
  it("returns nothing for a fresh store", () => {
    const dbPath = makeDbPath();
    assert.deepEqual(getDonePullRequestIds([501, 502], dbPath), []);
  });

  it("marks a pull request done and reports it back", () => {
    const dbPath = makeDbPath();
    setPullRequestDone(501, true, "Alice", dbPath);
    assert.deepEqual(getDonePullRequestIds([501, 502], dbPath), [501]);
  });

  it("unmarks a pull request done", () => {
    const dbPath = makeDbPath();
    setPullRequestDone(501, true, "Alice", dbPath);
    setPullRequestDone(501, false, null, dbPath);
    assert.deepEqual(getDonePullRequestIds([501], dbPath), []);
  });

  it("re-marking an already-done pull request updates marked_by instead of erroring", () => {
    const dbPath = makeDbPath();
    setPullRequestDone(501, true, "Alice", dbPath);
    setPullRequestDone(501, true, "Bob", dbPath);
    assert.deepEqual(getDonePullRequestIds([501], dbPath), [501]);
  });

  it("filters the lookup to only the requested ids", () => {
    const dbPath = makeDbPath();
    setPullRequestDone(501, true, "Alice", dbPath);
    setPullRequestDone(502, true, "Alice", dbPath);
    assert.deepEqual(getDonePullRequestIds([502, 503], dbPath), [502]);
  });

  it("returns an empty array for an empty id list without touching the database", () => {
    const dbPath = makeDbPath();
    assert.deepEqual(getDonePullRequestIds([], dbPath), []);
  });
});
