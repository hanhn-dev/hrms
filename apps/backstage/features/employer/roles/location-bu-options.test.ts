import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  allLocationIds,
  businessUnitTreeData,
  csvFromIds,
  idsFromCsv,
  locationSelectOptions,
} from "./location-bu-options.ts";

describe("location-bu-options", () => {
  it("round-trips csv and sorted unique ids", () => {
    assert.deepEqual(idsFromCsv("19, 374,19"), [19, 374, 19]);
    assert.equal(csvFromIds([374, 19, 19]), "19,374");
    assert.equal(csvFromIds([]), "");
  });

  it("labels locations with name and id", () => {
    const locations = [
      { locationId: 19, locationName: "India HQ", isActive: true },
      { locationId: 903, locationName: "Stale", isActive: false },
    ];
    const options = locationSelectOptions(locations);
    assert.equal(options[0]?.label, "India HQ (19)");
    assert.match(options[1]?.label ?? "", /inactive/);
    assert.deepEqual(allLocationIds(locations), [19, 903]);
  });

  it("builds a checkable org tree from parent links", () => {
    const tree = businessUnitTreeData([
      { unitId: 1, unitName: "Company", parentUnitId: null, isActive: true },
      { unitId: 2, unitName: "Engineering", parentUnitId: 1, isActive: true },
      { unitId: 3, unitName: "Old BU", parentUnitId: null, isActive: false },
    ]);
    assert.equal(tree.length, 2);
    const company = tree.find((node) => node.value === 1);
    assert.equal(company?.children?.length, 1);
    assert.equal(company?.children?.[0]?.value, 2);
    assert.match(String(tree.find((node) => node.value === 3)?.title), /inactive/);
  });
});
