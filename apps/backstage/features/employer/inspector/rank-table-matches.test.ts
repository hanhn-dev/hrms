import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankTableMatches, type TableNameRef } from "./rank-table-matches.ts";

function table(name: string, schema = "dbo"): TableNameRef {
  return { schema, name };
}

describe("rankTableMatches", () => {
  it("puts an exact name ahead of longer substring hits", () => {
    const ranked = rankTableMatches(
      [
        table("Demoza_TEmployeeInfoData"),
        table("GenXInfo_SSIS_Temp_TEmployee"),
        table("TEmployee"),
      ],
      "TEmployee",
      50,
    );

    assert.deepEqual(
      ranked.map((row) => row.name),
      [
        "TEmployee",
        "GenXInfo_SSIS_Temp_TEmployee",
        "Demoza_TEmployeeInfoData",
      ],
    );
  });

  it("puts a name prefix ahead of a longer segment hit", () => {
    const ranked = rankTableMatches(
      [
        table("Demoza_TEmployeeInfoData"),
        table("TEmployeeInfo"),
        table("Foo_TEmployee"),
      ],
      "temployee",
      50,
    );

    assert.deepEqual(
      ranked.map((row) => row.name),
      ["TEmployeeInfo", "Foo_TEmployee", "Demoza_TEmployeeInfoData"],
    );
  });

  it("keeps the closest matches when the cap would drop them alphabetically", () => {
    const earlier = Array.from({ length: 60 }, (_, index) =>
      table(`A_TEmployee_${String(index).padStart(2, "0")}`),
    );
    const ranked = rankTableMatches(
      [...earlier, table("TEmployee")],
      "TEmployee",
      50,
    );

    assert.equal(ranked.length, 50);
    assert.equal(ranked[0]?.name, "TEmployee");
    assert.equal(
      ranked.some((row) => row.name === "A_TEmployee_59"),
      false,
    );
  });

  it("matches a schema-only query after name hits", () => {
    const ranked = rankTableMatches(
      [table("Other", "TEmployee"), table("TEmployeeArchive")],
      "TEmployee",
      50,
    );

    assert.deepEqual(
      ranked.map((row) => row.name),
      ["TEmployeeArchive", "Other"],
    );
  });
});
