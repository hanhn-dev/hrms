import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWaitingOn } from "./waiting-on.ts";

describe("parseWaitingOn", () => {
  it("splits approvers stored with the unit separators", () => {
    const people = parseWaitingOn("BERNARD Mahesh MAROIS\u001f00010\u001eGALLOWAY VEGA\u001f00008");
    assert.deepEqual(people, [
      { name: "BERNARD Mahesh MAROIS", employmentNumber: "00010" },
      { name: "GALLOWAY VEGA", employmentNumber: "00008" },
    ]);
  });

  it("drops empty people", () => {
    assert.deepEqual(parseWaitingOn(null), []);
    assert.deepEqual(parseWaitingOn("\u001f\u001eAda\u001f"), [
      { name: "Ada", employmentNumber: null },
    ]);
  });
});
