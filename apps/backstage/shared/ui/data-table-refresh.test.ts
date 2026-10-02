import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { runTableRefresh } from "./data-table-refresh.ts";

describe("runTableRefresh", () => {
  it("skips the reload when a guard is set", () => {
    let pageRefreshes = 0;
    let customCalls = 0;
    const outcome = runTableRefresh({
      refreshPage: () => {
        pageRefreshes += 1;
      },
      onRefresh: () => {
        customCalls += 1;
      },
      skip: true,
    });
    assert.equal(outcome, "skipped");
    assert.equal(pageRefreshes, 0);
    assert.equal(customCalls, 0);
  });

  it("uses a custom refresh instead of reloading the page", () => {
    let pageRefreshes = 0;
    let customCalls = 0;
    const outcome = runTableRefresh({
      refreshPage: () => {
        pageRefreshes += 1;
      },
      onRefresh: () => {
        customCalls += 1;
      },
    });
    assert.equal(outcome, "custom");
    assert.equal(customCalls, 1);
    assert.equal(pageRefreshes, 0);
  });

  it("reloads the page when no custom refresh is passed", () => {
    let pageRefreshes = 0;
    const outcome = runTableRefresh({
      refreshPage: () => {
        pageRefreshes += 1;
      },
    });
    assert.equal(outcome, "page");
    assert.equal(pageRefreshes, 1);
  });
});
