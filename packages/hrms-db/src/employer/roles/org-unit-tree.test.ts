import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrgUnitTree,
  collectOrgUnitIds,
  withMissingBusinessUnitOptions,
  withMissingLocationOptions,
  type EmployerBusinessUnitOption,
} from "./org-unit-tree.ts";

describe("buildOrgUnitTree", () => {
  it("nests children under parents and sorts by name", () => {
    const units: EmployerBusinessUnitOption[] = [
      { unitId: 2, unitName: "Zebra", parentUnitId: 1, isActive: true },
      { unitId: 1, unitName: "Root", parentUnitId: null, isActive: true },
      { unitId: 3, unitName: "Alpha", parentUnitId: 1, isActive: true },
    ];
    const tree = buildOrgUnitTree(units);
    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.unitId, 1);
    assert.deepEqual(
      tree[0]?.children.map((child) => child.unitName),
      ["Alpha", "Zebra"],
    );
  });

  it("treats missing parents as roots", () => {
    const tree = buildOrgUnitTree([
      { unitId: 9, unitName: "Orphan", parentUnitId: 99, isActive: true },
    ]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.unitId, 9);
  });
});

describe("collectOrgUnitIds", () => {
  it("walks the forest depth-first", () => {
    const tree = buildOrgUnitTree([
      { unitId: 1, unitName: "A", parentUnitId: null, isActive: true },
      { unitId: 2, unitName: "B", parentUnitId: 1, isActive: true },
    ]);
    assert.deepEqual(collectOrgUnitIds(tree), [1, 2]);
  });
});

describe("withMissing*Options", () => {
  it("prepends unknown selected location ids", () => {
    const merged = withMissingLocationOptions(
      [{ locationId: 19, locationName: "India", isActive: true }],
      "903,19",
    );
    assert.equal(merged[0]?.locationId, 903);
    assert.equal(merged.length, 2);
  });

  it("prepends unknown selected business unit ids", () => {
    const merged = withMissingBusinessUnitOptions(
      [{ unitId: 374, unitName: "Eng", parentUnitId: null, isActive: true }],
      "2216",
    );
    assert.equal(merged[0]?.unitId, 2216);
    assert.match(merged[0]?.unitName ?? "", /Unknown/);
  });
});
