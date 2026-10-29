import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accessibleEmployerIds } from "./accessible-employers.ts";

describe("accessibleEmployerIds", () => {
  it("returns each id from a global access list", () => {
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: "Y",
        employerIds: " 10, 20 ,30 ",
        ownEmployerId: 10,
      }),
      [10, 20, 30],
    );
  });

  it("uses the own employer when global access has a blank list", () => {
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: "Y",
        employerIds: "   ",
        ownEmployerId: 10,
      }),
      [10],
    );
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: "Y",
        employerIds: null,
        ownEmployerId: 10,
      }),
      [10],
    );
  });

  it("uses the own employer when access is not global", () => {
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: "N",
        employerIds: "10,20",
        ownEmployerId: 10,
      }),
      [10],
    );
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: null,
        employerIds: "10,20",
        ownEmployerId: 7,
      }),
      [7],
    );
  });

  it("drops blank, junk, and non-positive tokens", () => {
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: "Y",
        employerIds: "10, , abc, -1, 0, 20",
        ownEmployerId: 99,
      }),
      [10, 20],
    );
  });

  it("drops duplicate ids", () => {
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: "Y",
        employerIds: "10, 10, 020, 20",
        ownEmployerId: 10,
      }),
      [10, 20],
    );
  });

  it("returns nothing when the own employer is not a positive id", () => {
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: "N",
        employerIds: null,
        ownEmployerId: 0,
      }),
      [],
    );
    assert.deepEqual(
      accessibleEmployerIds({
        isGlobalAccess: null,
        employerIds: "",
        ownEmployerId: -3,
      }),
      [],
    );
  });
});
