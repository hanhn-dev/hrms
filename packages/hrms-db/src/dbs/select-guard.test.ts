import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertSelectOnly,
  wrapSelectForLimit,
} from "./select-guard.ts";

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

describe("wrapSelectForLimit", () => {
  it("wraps a select that has no ORDER BY", () => {
    assert.equal(
      wrapSelectForLimit("SELECT a FROM dbo.T", 10),
      "SELECT TOP (10) * FROM (\nSELECT a FROM dbo.T\n) AS TableCompare",
    );
  });

  it("adds OFFSET so a top-level ORDER BY can sit in a derived table", () => {
    const wrapped = wrapSelectForLimit(
      "SELECT a FROM dbo.T ORDER BY a",
      11,
    );
    assert.match(wrapped, /SELECT TOP \(11\)/);
    assert.match(wrapped, /ORDER BY a OFFSET 0 ROWS/);
    assert.doesNotMatch(wrapped, /FETCH NEXT/);
  });

  it("leaves OVER (ORDER BY) alone", () => {
    const wrapped = wrapSelectForLimit(
      "SELECT ROW_NUMBER() OVER (ORDER BY a) AS n FROM dbo.T",
      5,
    );
    assert.doesNotMatch(wrapped, /OFFSET 0 ROWS/);
    assert.match(wrapped, /OVER \(ORDER BY a\)/);
  });

  it("does not treat ORDER BY inside a string as a sort", () => {
    const wrapped = wrapSelectForLimit("SELECT N'ORDER BY' AS label FROM dbo.T", 3);
    assert.doesNotMatch(wrapped, /OFFSET/);
  });

  it("keeps an existing OFFSET", () => {
    const wrapped = wrapSelectForLimit(
      "SELECT a FROM dbo.T ORDER BY a OFFSET 2 ROWS",
      4,
    );
    assert.equal(wrapped.match(/OFFSET/g)?.length, 1);
  });

  it("caps a WITH query without wrapping it in a derived table", () => {
    const wrapped = wrapSelectForLimit(
      "WITH x AS (SELECT 1 AS n) SELECT * FROM x ORDER BY n",
      8,
    );
    assert.doesNotMatch(wrapped, /SELECT TOP/);
    assert.match(wrapped, /OFFSET 0 ROWS FETCH NEXT 8 ROWS ONLY/);
  });

  it("rejects a non-positive cap", () => {
    assert.throws(() => wrapSelectForLimit("SELECT 1", 0), /positive/i);
  });
});
