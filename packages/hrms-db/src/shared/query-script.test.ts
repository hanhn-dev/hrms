import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "../generated/prisma/client.ts";
import {
  captureQueryScript,
  joinQueryScripts,
  noteQueryScriptFromCall,
  renderQueryCall,
} from "./query-script.ts";

describe("renderQueryCall", () => {
  it("inlines null, a number, and a quoted string", () => {
    const name = "O'Brien";
    const sql = Prisma.sql`SELECT ${1} AS n, ${null} AS z, ${name} AS name`;
    assert.equal(
      renderQueryCall(sql, []),
      "SELECT 1 AS n, NULL AS z, N'O''Brien' AS name",
    );
  });

  it("inlines a date as an ISO string", () => {
    const at = new Date("2026-10-02T04:46:00.000Z");
    const sql = Prisma.sql`SELECT ${at} AS at`;
    assert.equal(
      renderQueryCall(sql, []),
      "SELECT N'2026-10-02T04:46:00.000Z' AS at",
    );
  });

  it("inlines join, empty, and raw fragments", () => {
    const ids = [1, 2];
    const sql = Prisma.sql`SELECT ${Prisma.join(ids)} ${Prisma.empty} ${Prisma.raw("FROM dbo.T")}`;
    assert.equal(renderQueryCall(sql, []), "SELECT 1,2  FROM dbo.T");
  });

  it("inlines a nested fragment on a tagged-template call", () => {
    const filter = Prisma.sql`AND Name = ${"A"}`;
    assert.equal(
      renderQueryCall(["SELECT 1 WHERE 1 = 1 ", ""], [filter]),
      "SELECT 1 WHERE 1 = 1 AND Name = N'A'",
    );
  });

  it("keeps an unsafe string and inlines question-mark placeholders", () => {
    assert.equal(renderQueryCall("SELECT 1", []), "SELECT 1");
    assert.equal(
      renderQueryCall("SELECT ? AS name", ["Ann"]),
      "SELECT N'Ann' AS name",
    );
  });
});

describe("captureQueryScript", () => {
  it("returns the callback result and the statements it recorded", async () => {
    const loaded = await captureQueryScript(async () => {
      noteQueryScriptFromCall(Prisma.sql`SELECT ${1}`, []);
      noteQueryScriptFromCall("SELECT 2", []);
      return 7;
    });
    assert.equal(loaded.result, 7);
    assert.equal(
      loaded.script,
      "-- query 1\nSELECT 1\n\n-- query 2\nSELECT 2",
    );
  });

  it("records nothing when the callback does not query", async () => {
    const loaded = await captureQueryScript(async () => "ok");
    assert.equal(loaded.result, "ok");
    assert.equal(loaded.script, "");
  });
});

describe("joinQueryScripts", () => {
  it("returns one statement unchanged", () => {
    assert.equal(joinQueryScripts(["  SELECT 1  "]), "SELECT 1");
  });

  it("numbers multiple statements in order", () => {
    assert.equal(
      joinQueryScripts(["SELECT 1", "SELECT 2"]),
      "-- query 1\nSELECT 1\n\n-- query 2\nSELECT 2",
    );
  });

  it("drops empty statements", () => {
    assert.equal(joinQueryScripts(["", "   "]), "");
  });
});
