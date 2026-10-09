import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { callsDynamicSql, extractExecCalls } from "./source-text";

describe("extractExecCalls", () => {
  it("reads a static procedure call and its line", () => {
    const source = "SELECT 1;\nEXEC dbo.SP_LA_UpdateLeavePullBack @TransId = 1;\n";
    const calls = extractExecCalls(source);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.name, "SP_LA_UpdateLeavePullBack");
    assert.equal(calls[0]?.line, 2);
  });

  it("ignores a procedure call that is only in a comment", () => {
    const source = "-- EXEC dbo.USP_Commented\nSELECT 1;";
    assert.deepEqual(extractExecCalls(source), []);
  });

  it("flags sp_executesql without inventing a call from a comment", () => {
    const source = "EXEC sp_executesql @sql;\n/* EXEC dbo.USP_Hidden */";
    assert.equal(callsDynamicSql(source), true);
    assert.deepEqual(extractExecCalls(source), []);
  });
});
