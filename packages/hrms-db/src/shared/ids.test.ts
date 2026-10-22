import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOCATION_BU_IDS_MAX_LENGTH,
  employeeMatchesLocationBuScope,
  mergeAccessIdLists,
  normalizeCommaIdList,
  parseCommaIdList,
} from "./ids.ts";

describe("normalizeCommaIdList", () => {
  it("returns null for empty or whitespace", () => {
    assert.equal(normalizeCommaIdList(null), null);
    assert.equal(normalizeCommaIdList(""), null);
    assert.equal(normalizeCommaIdList("  ,  , "), null);
  });

  it("joins trimmed integer tokens", () => {
    assert.equal(normalizeCommaIdList(" 19 , 374 "), "19,374");
  });

  it("rejects non-integer tokens", () => {
    assert.throws(() => normalizeCommaIdList("19,x"), /Invalid id/);
  });

  it("allows long select-all style lists (VARCHAR(MAX) columns)", () => {
    const many = Array.from({ length: 200 }, (_, index) => String(index + 1)).join(
      ",",
    );
    assert.ok(many.length > 500);
    assert.equal(normalizeCommaIdList(many), many);
  });

  it("rejects absurdly over-length input", () => {
    const tooLong = "1".repeat(LOCATION_BU_IDS_MAX_LENGTH + 1);
    assert.throws(() => normalizeCommaIdList(tooLong), /at most/);
  });
});

describe("parseCommaIdList", () => {
  it("returns an empty array for blank input", () => {
    assert.deepEqual(parseCommaIdList(null), []);
    assert.deepEqual(parseCommaIdList(""), []);
  });

  it("parses integers and skips junk", () => {
    assert.deepEqual(parseCommaIdList("19, x, 374"), [19, 374]);
  });
});

describe("mergeAccessIdLists", () => {
  it("uses role only when user is empty", () => {
    assert.equal(mergeAccessIdLists(null, "903"), "903");
    assert.equal(mergeAccessIdLists("", "903,2216"), "903,2216");
  });

  it("uses user only when role is empty", () => {
    assert.equal(mergeAccessIdLists("19", null), "19");
  });

  it("concatenates user then role when both set", () => {
    assert.equal(mergeAccessIdLists("19", "903"), "19,903");
  });

  it("returns null when both empty", () => {
    assert.equal(mergeAccessIdLists(null, null), null);
  });
});

describe("employeeMatchesLocationBuScope", () => {
  it("matches when both filters are unrestricted", () => {
    assert.equal(
      employeeMatchesLocationBuScope({
        locationId: 19,
        businessUnitId: 374,
        locationIds: null,
        businessUnitIds: null,
      }),
      true,
    );
  });

  it("requires location and BU when both lists are set", () => {
    assert.equal(
      employeeMatchesLocationBuScope({
        locationId: 19,
        businessUnitId: 374,
        locationIds: "903",
        businessUnitIds: "2216",
      }),
      false,
    );
    assert.equal(
      employeeMatchesLocationBuScope({
        locationId: 19,
        businessUnitId: 374,
        locationIds: "19,903",
        businessUnitIds: "374,2216",
      }),
      true,
    );
  });

  it("fails when location matches but BU does not", () => {
    assert.equal(
      employeeMatchesLocationBuScope({
        locationId: 19,
        businessUnitId: 374,
        locationIds: "19",
        businessUnitIds: "2216",
      }),
      false,
    );
  });
});
