import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { GitFilePair, GitFileSide } from "@hrms/azure-devops";
import { fileCompareView } from "./file-compare-view.ts";

describe("fileCompareView", () => {
  it("explains a file that is missing on the right", () => {
    const view = fileCompareView(pair({ content: "left\n" }, { missing: true }), "Dev", "QA");
    assert.deepEqual(view, {
      kind: "one-sided",
      message: "This file is on Dev and is not on QA.",
      content: "left\n",
      truncated: false,
      present: "left",
    });
  });

  it("explains a file that is missing on the left", () => {
    const view = fileCompareView(pair({ missing: true }, { content: "right\n", truncated: true }), "Dev", "QA");
    assert.equal(view.kind, "one-sided");
    if (view.kind !== "one-sided") {
      return;
    }
    assert.equal(view.message, "This file is on QA and is not on Dev.");
    assert.equal(view.present, "right");
    assert.equal(view.content, "right\n");
    assert.equal(view.truncated, true);
  });

  it("explains a path that is missing on both branches", () => {
    const view = fileCompareView(pair({ missing: true }, { missing: true }), "Dev", "QA");
    assert.deepEqual(view, { kind: "notice", message: "This path is not on either branch." });
  });

  it("diffs when both sides have the file", () => {
    const view = fileCompareView(pair({ content: "a\n" }, { content: "b\n" }), "Dev", "QA");
    assert.deepEqual(view, { kind: "diff" });
  });
});

function pair(base: Partial<GitFileSide>, target: Partial<GitFileSide>): GitFilePair {
  return {
    base: side(base),
    target: side(target),
    lineDiffBlocks: [],
  };
}

function side(overrides: Partial<GitFileSide>): GitFileSide {
  return {
    content: null,
    missing: false,
    isBinary: false,
    truncated: false,
    omission: null,
    ...overrides,
  };
}
