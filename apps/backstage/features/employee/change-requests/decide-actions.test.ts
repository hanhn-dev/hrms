import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { changeRequestDecideActions } from "./decide-actions.ts";

describe("changeRequestDecideActions", () => {
  it("offers approve and reject while the request is pending", () => {
    assert.deepEqual(changeRequestDecideActions("pending"), ["Approved", "Rejected"]);
  });

  it("offers nothing once the request is approved or rejected", () => {
    assert.deepEqual(changeRequestDecideActions("approved"), []);
    assert.deepEqual(changeRequestDecideActions("rejected"), []);
  });
});
