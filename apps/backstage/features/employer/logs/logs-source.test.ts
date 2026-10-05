import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { parseLogsQuery, resolveLogWindow } from "./logs-source.ts";

const NOW = new Date("2026-10-04T02:00:00.000Z");

describe("parseLogsQuery", () => {
  it("keeps the My Details tab", () => {
    assert.equal(parseLogsQuery({ tab: "mydetails" }).tab, "mydetails");
  });
});

describe("resolveLogWindow", () => {
  it("defaults to the last 24 hours", () => {
    const window = resolveLogWindow(parseLogsQuery({}), 330, NOW);
    assert.equal(window.usingDefaultWindow, true);
    assert.equal(window.windowLimited, false);
    assert.equal(window.to.toISOString(), NOW.toISOString());
    assert.equal(
      window.from.toISOString(),
      "2026-10-03T02:00:00.000Z",
    );
    assert.equal(window.serverFrom.toISOString(), "2026-10-03T07:30:00.000Z");
  });

  it("rejects a window longer than seven days", () => {
    const window = resolveLogWindow(
      parseLogsQuery({
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-10T00:00:00.000Z",
      }),
      0,
      NOW,
    );
    assert.equal(window.windowLimited, true);
    assert.equal(window.usingDefaultWindow, false);
    assert.equal(window.to.toISOString(), "2026-10-08T00:00:00.000Z");
  });
});
