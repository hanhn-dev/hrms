import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RELATED_MODULE_LIMIT,
  shapeRelatedModules,
  type RelatedModule,
} from "./object-relations.ts";

function moduleRow(
  name: string,
  depth: number,
  schema = "dbo",
  kind: RelatedModule["kind"] = "storedProcedure",
): RelatedModule {
  return { schema, name, kind, depth };
}

describe("shapeRelatedModules", () => {
  const source = { schema: "dbo", name: "SP_Root" };

  it("drops the source object", () => {
    const list = shapeRelatedModules(
      [moduleRow("SP_Root", 1), moduleRow("SP_Child", 1)],
      source,
    );
    assert.deepEqual(
      list.items.map((item) => item.name),
      ["SP_Child"],
    );
    assert.equal(list.total, 1);
    assert.equal(list.truncated, false);
  });

  it("keeps the shallowest depth when one module is reached more than once", () => {
    const list = shapeRelatedModules(
      [
        moduleRow("SP_Child", 3),
        moduleRow("sp_child", 1, "DBO"),
        moduleRow("SP_Child", 2),
      ],
      source,
    );
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0]?.depth, 1);
    assert.equal(list.items[0]?.name, "sp_child");
  });

  it("sorts by depth, then schema, then name", () => {
    const list = shapeRelatedModules(
      [
        moduleRow("SP_B", 2),
        moduleRow("SP_C", 1),
        moduleRow("SP_A", 1, "abc"),
        moduleRow("SP_A", 1),
      ],
      source,
    );
    assert.deepEqual(
      list.items.map((item) => `${item.depth}:${item.schema}.${item.name}`),
      ["1:abc.SP_A", "1:dbo.SP_A", "1:dbo.SP_C", "2:dbo.SP_B"],
    );
  });

  it("caps the opened list and reports how many were left out", () => {
    const rows = Array.from({ length: RELATED_MODULE_LIMIT + 1 }, (_, index) =>
      moduleRow(`SP_${String(index).padStart(2, "0")}`, 1),
    );
    const list = shapeRelatedModules(rows, source);
    assert.equal(list.items.length, RELATED_MODULE_LIMIT);
    assert.equal(list.total, RELATED_MODULE_LIMIT + 1);
    assert.equal(list.truncated, true);
    assert.equal(list.items[0]?.name, "SP_00");
    assert.equal(list.items.at(-1)?.name, "SP_39");
  });
});
