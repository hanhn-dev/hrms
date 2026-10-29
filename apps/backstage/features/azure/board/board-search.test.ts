import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { boardSearchFilter } from "./board-search";

describe("boardSearchFilter", () => {
  it("uses a bounded Azure title search", () => {
    assert.deepEqual(
      boardSearchFilter("TDG HRMS\\Sprint 1", {
        query: " leave balance ",
        assignees: ["Ada"],
        types: ["Bug"],
      }),
      {
        iteration: "TDG HRMS\\Sprint 1",
        top: 50,
        titleContains: "leave balance",
        assignees: ["Ada"],
        types: ["Bug"],
      },
    );
  });

  it("does not replace the 200-row sprint load for an empty search", () => {
    assert.equal(boardSearchFilter("TDG HRMS\\Sprint 1", { query: " " }), null);
  });

  it("searches a numeric query by work-item id", () => {
    assert.deepEqual(boardSearchFilter("Sprint", { query: "162833" }), {
      iteration: "Sprint",
      top: 50,
      ids: [162833],
      assignees: undefined,
      types: undefined,
    });
  });
});
