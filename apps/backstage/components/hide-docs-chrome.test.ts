import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { hideDocsChrome } from "./hide-docs-chrome";

describe("hideDocsChrome", () => {
  it("hides chrome on the operator console, Db Studio, Azure DevOps, and login routes", () => {
    assert.equal(hideDocsChrome("/employers"), true);
    assert.equal(hideDocsChrome("/employers/1"), true);
    assert.equal(hideDocsChrome("/dbs"), true);
    assert.equal(hideDocsChrome("/dbs/anything"), true);
    assert.equal(hideDocsChrome("/azure"), true);
    assert.equal(hideDocsChrome("/azure/sprints"), true);
    assert.equal(hideDocsChrome("/azure/pull-requests"), true);
    assert.equal(hideDocsChrome("/login"), true);
  });

  it("keeps chrome visible on docs, wiki, and other site routes", () => {
    assert.equal(hideDocsChrome("/"), false);
    assert.equal(hideDocsChrome("/docs"), false);
    assert.equal(hideDocsChrome("/wiki"), false);
    assert.equal(hideDocsChrome("/flows"), false);
    assert.equal(hideDocsChrome("/azureish"), false);
  });
});
