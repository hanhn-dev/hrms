import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  emptyBranchDefaults,
  findRepositoryBranchDefaults,
  removeRepositoryBranchDefaults,
  resolveRepositoryBranches,
  saveRepositoryBranchDefaults,
  type BranchDefaultEntry,
} from "./branch-defaults.ts";

const master = { name: "master" };
const qa = { name: "QA" };
const staging = { name: "Staging" };
const dev = { name: "Dev" };
const feature = { name: "123464_150465_pbi" };

const savedDb: BranchDefaultEntry = {
  repositoryName: "TDG HRMS DB",
  defaultBranch: "Dev",
  leftBranch: "master",
  rightBranch: "QA",
};

describe("resolveRepositoryBranches", () => {
  it("opens TDG HRMS DB on QA and Staging when nothing is saved", () => {
    assert.deepEqual(
      resolveRepositoryBranches({
        repositoryName: "TDG HRMS DB",
        branches: [master, dev, qa, staging],
        azureDefaultBranch: "master",
        configured: null,
      }),
      { history: "QA", left: "QA", right: "Staging" },
    );
  });

  it("keeps TDG HRMS history on the Azure default and Staging on the right", () => {
    assert.deepEqual(
      resolveRepositoryBranches({
        repositoryName: "TDG HRMS",
        branches: [feature, dev, staging],
        azureDefaultBranch: "Dev",
        configured: null,
      }),
      { history: "Dev", left: "Dev", right: "Staging" },
    );
    assert.deepEqual(
      resolveRepositoryBranches({
        repositoryName: "TDG HRMS",
        branches: [staging, dev, feature],
        azureDefaultBranch: "Staging",
        configured: null,
      }),
      { history: "Staging", left: "Dev", right: "Staging" },
    );
  });

  it("uses the Azure default for other repositories", () => {
    assert.deepEqual(
      resolveRepositoryBranches({
        repositoryName: "Other",
        branches: [master, qa, staging],
        azureDefaultBranch: "master",
        configured: null,
      }),
      { history: "master", left: "master", right: "QA" },
    );
  });

  it("lets a saved row override one field and keeps the built-in for the rest", () => {
    assert.deepEqual(
      resolveRepositoryBranches({
        repositoryName: "tdg hrms db",
        branches: [master, dev, qa, staging],
        azureDefaultBranch: "master",
        configured: { ...savedDb, leftBranch: "Dev", rightBranch: "Staging" },
      }),
      { history: "Dev", left: "Dev", right: "Staging" },
    );
  });

  it("falls back when a saved branch is missing", () => {
    assert.deepEqual(
      resolveRepositoryBranches({
        repositoryName: "TDG HRMS DB",
        branches: [master, dev, staging],
        azureDefaultBranch: "master",
        configured: { ...savedDb, defaultBranch: "QA", leftBranch: "QA", rightBranch: "Staging" },
      }),
      { history: "master", left: "master", right: "Staging" },
    );
  });

  it("returns empty names when the repository has no branches", () => {
    assert.deepEqual(
      resolveRepositoryBranches({
        repositoryName: "TDG HRMS DB",
        branches: [],
        azureDefaultBranch: "master",
        configured: savedDb,
      }),
      { history: "", left: "", right: "" },
    );
  });
});

describe("repository branch default rows", () => {
  it("saves one row per repository name and removes it", () => {
    const saved = saveRepositoryBranchDefaults(emptyBranchDefaults(), savedDb);
    assert.equal(findRepositoryBranchDefaults(saved, "tdg hrms db")?.defaultBranch, "Dev");
    const replaced = saveRepositoryBranchDefaults(saved, { ...savedDb, defaultBranch: "QA" });
    assert.equal(replaced.repositories.length, 1);
    assert.equal(findRepositoryBranchDefaults(replaced, "TDG HRMS DB")?.defaultBranch, "QA");
    assert.equal(findRepositoryBranchDefaults(removeRepositoryBranchDefaults(replaced, "TDG HRMS DB"), "TDG HRMS DB"), null);
  });

  it("rejects a blank branch name", () => {
    assert.throws(
      () => saveRepositoryBranchDefaults(emptyBranchDefaults(), { ...savedDb, leftBranch: "  " }),
      /leftBranch|Too small|at least/i,
    );
  });
});
