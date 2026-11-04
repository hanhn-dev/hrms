import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  applyLogRangePreset,
  logRangePresetLabel,
  matchLogRangePreset,
  parseLogsQuery,
  resolveLogWindow,
} from "./logs-source.ts";

const NOW = new Date("2026-10-04T02:00:00.000Z");

describe("parseLogsQuery", () => {
  it("keeps the My Details tab", () => {
    assert.equal(parseLogsQuery({ tab: "mydetails" }).tab, "mydetails");
  });

  it("keeps the SQL errors tab", () => {
    assert.equal(parseLogsQuery({ tab: "sqlerrors" }).tab, "sqlerrors");
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

  it("keeps a window within fourteen days", () => {
    const window = resolveLogWindow(
      parseLogsQuery({
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-10T00:00:00.000Z",
      }),
      0,
      NOW,
    );
    assert.equal(window.windowLimited, false);
    assert.equal(window.usingDefaultWindow, false);
    assert.equal(window.to.toISOString(), "2026-10-10T00:00:00.000Z");
  });

  it("rejects a window longer than fourteen days", () => {
    const window = resolveLogWindow(
      parseLogsQuery({
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-20T00:00:00.000Z",
      }),
      0,
      NOW,
    );
    assert.equal(window.windowLimited, true);
    assert.equal(window.usingDefaultWindow, false);
    assert.equal(window.to.toISOString(), "2026-10-15T00:00:00.000Z");
  });

  it("keeps a 20-day span on SQL errors", () => {
    const window = resolveLogWindow(
      parseLogsQuery({
        tab: "sqlerrors",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-21T00:00:00.000Z",
      }),
      0,
      NOW,
    );
    assert.equal(window.windowLimited, false);
    assert.equal(window.to.toISOString(), "2026-09-21T00:00:00.000Z");
  });

  it("cuts a SQL errors span past 45 days", () => {
    const window = resolveLogWindow(
      parseLogsQuery({
        tab: "sqlerrors",
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-10-01T00:00:00.000Z",
      }),
      0,
      NOW,
    );
    assert.equal(window.windowLimited, true);
    assert.equal(window.to.toISOString(), "2026-09-15T00:00:00.000Z");
  });
});

describe("matchLogRangePreset", () => {
  it("returns 24h for the default window", () => {
    const from = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    assert.equal(matchLogRangePreset(from, NOW, true), "24h");
  });

  it("matches 7d and 14d spans", () => {
    const sevenFrom = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenFrom = new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000);
    assert.equal(matchLogRangePreset(sevenFrom, NOW, false), "7d");
    assert.equal(matchLogRangePreset(fourteenFrom, NOW, false), "14d");
  });

  it("returns undefined for a custom span", () => {
    const from = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    assert.equal(matchLogRangePreset(from, NOW, false), undefined);
  });
});

describe("applyLogRangePreset", () => {
  it("clears from and to for 24h", () => {
    assert.deepEqual(applyLogRangePreset("24h", NOW), { from: null, to: null });
  });

  it("sets from and to for 7d and 14d", () => {
    assert.deepEqual(applyLogRangePreset("7d", NOW), {
      from: "2026-09-27T02:00:00.000Z",
      to: NOW.toISOString(),
    });
    assert.deepEqual(applyLogRangePreset("14d", NOW), {
      from: "2026-09-20T02:00:00.000Z",
      to: NOW.toISOString(),
    });
  });
});

describe("logRangePresetLabel", () => {
  it("returns the status line for each preset", () => {
    assert.equal(logRangePresetLabel("24h"), "Showing the last 24 hours.");
    assert.equal(logRangePresetLabel("7d"), "Showing the last 7 days.");
    assert.equal(logRangePresetLabel("14d"), "Showing the last 14 days.");
  });
});
