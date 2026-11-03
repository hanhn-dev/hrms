import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { azureLandingGroups } from "./azure-landing-cards.tsx";

describe("azureLandingGroups", () => {
  it("groups the tools into Plan, Review, and Publish", () => {
    assert.deepEqual(
      azureLandingGroups.map((group) => group.id),
      ["plan", "review", "publish"],
    );
    const tools = azureLandingGroups.flatMap((group) => group.tools);
    assert.equal(tools.length, 8);
    const hrefs = tools.map((tool) => tool.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });

  it("keeps a title, description, and destination on every tool", () => {
    for (const group of azureLandingGroups) {
      assert.ok(group.title.length > 0);
      assert.ok(group.summary.length > 0);
      for (const tool of group.tools) {
        assert.ok(tool.title.length > 0);
        assert.ok(tool.description.length > 0);
        assert.match(tool.href, /^\/azure\//);
      }
    }
  });
});
