import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { appendBy } from "./activity-page";

describe("appendBy", () => {
  it("appends a page without duplicating activity", () => {
    assert.deepEqual(
      appendBy(
        [{ id: 1, value: "old" }],
        [{ id: 1, value: "new" }, { id: 2, value: "next" }],
        (item) => item.id,
      ),
      [{ id: 1, value: "new" }, { id: 2, value: "next" }],
    );
  });
});
