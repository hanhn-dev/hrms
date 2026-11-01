import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  isDatabaseRepository,
  preferredDatabaseEnvironment,
  preferredFileBranches,
} from "./file-branch-defaults.ts";

const master = { name: "master" };
const qa = { name: "QA" };
const staging = { name: "Staging" };
const dev = { name: "Dev" };
const feature = { name: "123464_150465_pbi" };

describe("preferredFileBranches", () => {
  it("opens TDG HRMS DB on QA and Staging", () => {
    assert.deepEqual(preferredFileBranches("TDG HRMS DB", [master, dev, qa, staging], "master"), {
      left: "QA",
      right: "Staging",
    });
    assert.deepEqual(preferredFileBranches("tdg hrms db", [{ name: "qa" }, { name: "staging" }], "master"), {
      left: "qa",
      right: "staging",
    });
  });

  it("keeps QA on the left when Staging is missing", () => {
    assert.deepEqual(preferredFileBranches("TDG HRMS DB", [qa, dev, master], "master"), {
      left: "QA",
      right: "Dev",
    });
  });

  it("keeps Staging on the right when QA is missing", () => {
    assert.deepEqual(preferredFileBranches("TDG HRMS DB", [master, staging, dev], "master"), {
      left: "master",
      right: "Staging",
    });
    assert.deepEqual(preferredFileBranches("TDG HRMS DB", [staging, dev], "Staging"), {
      left: "Dev",
      right: "Staging",
    });
  });

  it("opens TDG HRMS on the default branch and Staging", () => {
    assert.deepEqual(preferredFileBranches("TDG HRMS", [feature, dev, staging], "Dev"), {
      left: "Dev",
      right: "Staging",
    });
    assert.deepEqual(preferredFileBranches("tdg hrms", [dev, { name: "staging" }, feature], "Dev"), {
      left: "Dev",
      right: "staging",
    });
  });

  it("keeps Staging on the right when it is the TDG HRMS default", () => {
    assert.deepEqual(preferredFileBranches("TDG HRMS", [staging, dev, feature], "Staging"), {
      left: "Dev",
      right: "Staging",
    });
  });

  it("uses the repository default when Staging is missing or the repository is neither", () => {
    assert.deepEqual(preferredFileBranches("TDG HRMS", [master, qa, dev], "master"), {
      left: "master",
      right: "QA",
    });
    assert.deepEqual(preferredFileBranches("Other", [master, qa, staging], "master"), {
      left: "master",
      right: "QA",
    });
    assert.deepEqual(preferredFileBranches("TDG HRMS DB", [master, dev], null), {
      left: "master",
      right: "Dev",
    });
    assert.deepEqual(preferredFileBranches("TDG HRMS DB", [], "master"), { left: "", right: "" });
  });
});

describe("preferredDatabaseEnvironment", () => {
  it("prefers QA and otherwise the first configured environment", () => {
    assert.equal(preferredDatabaseEnvironment(["DEV", "UAT", "QA"]), "QA");
    assert.equal(preferredDatabaseEnvironment(["DEV", "uat"]), "DEV");
    assert.equal(preferredDatabaseEnvironment([]), "");
  });
});

describe("isDatabaseRepository", () => {
  it("matches the database repository name", () => {
    assert.equal(isDatabaseRepository("TDG HRMS DB"), true);
    assert.equal(isDatabaseRepository("TDG HRMS"), false);
  });
});
