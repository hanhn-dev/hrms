import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  employeeMatchesLocationBuScope,
  mergeAccessIdLists,
  normalizeCommaIdList,
} from "@hrms/db/ids";

describe("role Location/BU helpers (via @hrms/db/ids)", () => {
  it("normalizes blank input to unrestricted null", () => {
    assert.equal(normalizeCommaIdList("  "), null);
    assert.equal(normalizeCommaIdList("19, 374"), "19,374");
  });

  it("merges user and role lists like FN_LocationBU_GetEmployeeDetails_Clone", () => {
    assert.equal(mergeAccessIdLists(null, "903"), "903");
    assert.equal(mergeAccessIdLists("19", "903"), "19,903");
  });

  it("detects the RoleId-1 style mismatch from the SP_GetCountryOfEmployment trace", () => {
    assert.equal(
      employeeMatchesLocationBuScope({
        locationId: 19,
        businessUnitId: 374,
        locationIds: "903",
        businessUnitIds: "2216",
      }),
      false,
    );
  });
});
