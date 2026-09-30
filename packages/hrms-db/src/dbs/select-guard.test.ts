import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSelectOnly } from "./select-guard.ts";

describe("assertSelectOnly", () => {
  it("allows simple SELECT", () => {
    assert.equal(assertSelectOnly("SELECT 1"), "SELECT 1");
  });

  it("allows WITH…SELECT", () => {
    const sql = "WITH x AS (SELECT 1 AS n) SELECT * FROM x";
    assert.equal(assertSelectOnly(sql), sql);
  });

  it("strips comments", () => {
    assert.equal(
      assertSelectOnly("/* note */ SELECT 1 -- trailing"),
      "SELECT 1",
    );
  });

  it("rejects empty", () => {
    assert.throws(() => assertSelectOnly("   "), /required/i);
  });

  it("rejects INSERT", () => {
    assert.throws(
      () => assertSelectOnly("INSERT INTO T VALUES (1)"),
      /SELECT/i,
    );
  });

  it("rejects SELECT that embeds UPDATE", () => {
    assert.throws(
      () => assertSelectOnly("SELECT 1; UPDATE T SET x = 1"),
      /single SELECT|semicolon/i,
    );
  });

  it("rejects EXEC", () => {
    assert.throws(
      () => assertSelectOnly("SELECT * FROM t WHERE 1=1 EXEC sp_help"),
      /forbidden/i,
    );
  });

  it("rejects GO batches", () => {
    assert.throws(
      () => assertSelectOnly("SELECT 1\nGO\nSELECT 2"),
      /GO/i,
    );
  });
});
