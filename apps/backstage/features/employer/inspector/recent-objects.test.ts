import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  RECENT_OBJECT_LIMIT,
  forgetRecentObject,
  matchRecentObjects,
  mergeObjectOptions,
  readRecentObjects,
  recordRecentObject,
  type RecentObject,
} from "./recent-objects.ts";

function object(
  name: string,
  viewedAt: string,
  kind: RecentObject["kind"] = "storedProcedure",
  schema = "dbo",
): RecentObject {
  return { kind, schema, name, viewedAt };
}

describe("recordRecentObject", () => {
  it("moves a repeat open to the front and keeps other kinds", () => {
    const current = [
      object("SP_Older", "2026-10-01T00:00:00.000Z"),
      object("TEmployee", "2026-09-01T00:00:00.000Z", "table"),
    ];
    const next = recordRecentObject(
      current,
      { kind: "storedProcedure", schema: "DBO", name: "sp_older" },
      "2026-10-16T00:00:00.000Z",
    );

    assert.deepEqual(
      next.map((row) => `${row.kind}:${row.name}`),
      ["storedProcedure:sp_older", "table:TEmployee"],
    );
  });

  it("keeps the newest 30 of one kind", () => {
    let current: RecentObject[] = [];
    for (let index = 0; index < RECENT_OBJECT_LIMIT + 2; index += 1) {
      current = recordRecentObject(
        current,
        { kind: "function", schema: "dbo", name: `fn_${index}` },
        `2026-10-16T00:00:${String(index).padStart(2, "0")}.000Z`,
      );
    }
    current = recordRecentObject(
      current,
      { kind: "view", schema: "dbo", name: "vw_Keep" },
      "2026-10-16T01:00:00.000Z",
    );

    const functions = current.filter((row) => row.kind === "function");
    assert.equal(functions.length, RECENT_OBJECT_LIMIT);
    assert.equal(functions[0]?.name, "fn_31");
    assert.equal(functions.some((row) => row.name === "fn_0"), false);
    assert.equal(current.some((row) => row.name === "vw_Keep"), true);
  });

  it("leaves the list unchanged when the name is blank", () => {
    const current = [object("SP_Get", "2026-10-01T00:00:00.000Z")];
    assert.deepEqual(
      recordRecentObject(current, { kind: "storedProcedure", schema: "dbo", name: "  " }, "2026-10-02T00:00:00.000Z"),
      current,
    );
  });
});

describe("matchRecentObjects", () => {
  const rows = [
    object("SP_GetWaitStats", "2026-10-03T00:00:00.000Z"),
    object("SP_CheckTimeSheetStatus", "2026-10-02T00:00:00.000Z"),
    object("fn_Status", "2026-10-01T00:00:00.000Z", "function"),
  ];

  it("returns the kind list when the query is shorter than two characters", () => {
    assert.deepEqual(
      matchRecentObjects(rows, "storedProcedure", "").map((row) => row.name),
      ["SP_GetWaitStats", "SP_CheckTimeSheetStatus"],
    );
    assert.deepEqual(
      matchRecentObjects(rows, "storedProcedure", "s").map((row) => row.name),
      ["SP_GetWaitStats", "SP_CheckTimeSheetStatus"],
    );
  });

  it("keeps names that contain every search word", () => {
    assert.deepEqual(
      matchRecentObjects(rows, "storedProcedure", "time status").map((row) => row.name),
      ["SP_CheckTimeSheetStatus"],
    );
    assert.deepEqual(matchRecentObjects(rows, "storedProcedure", "a b"), []);
  });
});

describe("mergeObjectOptions", () => {
  it("lists recent names first and skips catalog duplicates", () => {
    assert.deepEqual(
      mergeObjectOptions(
        [{ schema: "dbo", name: "SP_GetWaitStats" }],
        [
          { schema: "DBO", name: "sp_getwaitstats" },
          { schema: "mon", name: "usp_GetWaitStats" },
        ],
      ),
      [
        { schema: "dbo", name: "SP_GetWaitStats", source: "recent" },
        { schema: "mon", name: "usp_GetWaitStats", source: "catalog" },
      ],
    );
  });
});

describe("readRecentObjects", () => {
  it("drops malformed rows and caps each kind", () => {
    const stored = [
      { kind: "table", schema: "dbo", name: "TNew", viewedAt: "2026-10-02T00:00:00.000Z" },
      { kind: "nope", schema: "dbo", name: "Bad", viewedAt: "2026-10-03T00:00:00.000Z" },
      { kind: "table", schema: "", name: "Missing", viewedAt: "2026-10-03T00:00:00.000Z" },
      { kind: "table", schema: "dbo", name: "TOld", viewedAt: "2026-10-01T00:00:00.000Z" },
      ...Array.from({ length: RECENT_OBJECT_LIMIT }, (_, index) => ({
        kind: "view",
        schema: "dbo",
        name: `vw_${index}`,
        viewedAt: `2026-10-16T00:00:${String(index).padStart(2, "0")}.000Z`,
      })),
      {
        kind: "view",
        schema: "dbo",
        name: "vw_extra",
        viewedAt: "2026-10-15T00:00:00.000Z",
      },
    ];

    const rows = readRecentObjects(stored);
    assert.deepEqual(
      rows.filter((row) => row.kind === "table").map((row) => row.name),
      ["TNew", "TOld"],
    );
    assert.equal(rows.filter((row) => row.kind === "view").length, RECENT_OBJECT_LIMIT);
    assert.equal(rows.some((row) => row.name === "vw_extra"), false);
    assert.deepEqual(readRecentObjects({ nope: true }), []);
    assert.deepEqual(readRecentObjects("[]"), []);
  });
});

describe("forgetRecentObject", () => {
  it("removes one kind or every kind with the same name", () => {
    const current = [
      object("SP_Gone", "2026-10-02T00:00:00.000Z"),
      object("SP_Gone", "2026-10-01T00:00:00.000Z", "table"),
    ];
    assert.equal(
      forgetRecentObject(current, { kind: "storedProcedure", schema: "dbo", name: "sp_gone" }).length,
      1,
    );
    assert.deepEqual(
      forgetRecentObject(current, { schema: "dbo", name: "SP_Gone" }),
      [],
    );
  });
});
