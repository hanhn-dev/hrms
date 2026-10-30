import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { pageSections } from "./page-sections.ts";

describe("pageSections", () => {
  it("lists h2 and h3 titles and skips a fenced diagram", () => {
    const markdown = [
      "# FN_Example",
      "",
      "## What it does",
      "",
      "## Call sequence",
      "",
      "```mermaid",
      "## Hidden",
      "```",
      "",
      "### A branch",
      "",
      "## Flow",
    ].join("\n");

    assert.deepEqual(pageSections(markdown), [
      { id: "what-it-does", title: "What it does", depth: 2 },
      { id: "call-sequence", title: "Call sequence", depth: 2 },
      { id: "a-branch", title: "A branch", depth: 3 },
      { id: "flow", title: "Flow", depth: 2 },
    ]);
  });

  it("returns nothing when the page has no sections", () => {
    assert.deepEqual(pageSections("# Only a title\n"), []);
  });
});
