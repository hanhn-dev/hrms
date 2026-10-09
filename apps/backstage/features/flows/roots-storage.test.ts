import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { readRoots } from "./roots-storage.ts";

describe("readRoots", () => {
  it("returns nothing for empty or invalid storage", () => {
    assert.deepEqual(readRoots(null), {});
    assert.deepEqual(readRoots(""), {});
    assert.deepEqual(readRoots("not-json"), {});
    assert.deepEqual(readRoots("[]"), {});
  });

  it("reads a value already stored as an object", () => {
    assert.deepEqual(readRoots({ "hrms-db": "D:/TDG HRMS DB", other: "D:/nope" }), {
      "hrms-db": "D:/TDG HRMS DB",
    });
  });

  it("keeps only known checkout paths", () => {
    assert.deepEqual(
      readRoots(JSON.stringify({ "hrms-db": "D:/TDG HRMS DB", other: "D:/nope", sourcecode: "  " })),
      { "hrms-db": "D:/TDG HRMS DB" },
    );
  });
});
