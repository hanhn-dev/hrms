import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { scriptObjectRefs, tokenizeSql, type SqlToken } from "./script-sql.ts";
import { bindSql } from "./script-symbols.ts";
import { formatSql } from "./script-format.ts";

function objects(sql: string): string[] {
  return tokenizeSql(sql).flatMap((token) =>
    token.type === "object" ? [`${token.schema}.${token.name}`] : [],
  );
}

function keywords(sql: string): string[] {
  return tokenizeSql(sql).flatMap((token) =>
    token.type === "keyword" ? [token.value.toLowerCase()] : [],
  );
}

function restored(tokens: SqlToken[]): string {
  return tokens.map((token) => token.value).join("");
}

describe("tokenizeSql", () => {
  it("keeps every character in order", () => {
    const sql = "SELECT * FROM dbo.TEmployee WHERE Name = N'Ann''s'";
    assert.equal(restored(tokenizeSql(sql)), sql);
  });

  it("highlights clause keywords and leaves strings and comments alone", () => {
    assert.deepEqual(keywords("SELECT a FROM t WHERE b = 1"), ["select", "from", "where"]);
    assert.deepEqual(keywords("SELECT 'SELECT' -- SELECT\nFROM t"), ["select", "from"]);
  });

  it("chips catalog objects and skips variables, aliases, and columns", () => {
    assert.deepEqual(objects("FROM dbo.TEmployee e"), ["dbo.TEmployee"]);
    assert.deepEqual(objects("FROM TEmployee"), ["dbo.TEmployee"]);
    assert.deepEqual(objects("FROM TEmployee, TEmployer WHERE TEmployee.Id = TEmployer.Id"), [
      "dbo.TEmployee",
      "dbo.TEmployer",
    ]);
    assert.deepEqual(objects("EXEC SP_GetEmployee @EmployeeId"), ["dbo.SP_GetEmployee"]);
    assert.deepEqual(objects("SET @x = dbo.FN_Build()"), ["dbo.FN_Build"]);
    assert.deepEqual(objects("SELECT e.EmployeeId FROM TEmployee AS e"), ["dbo.TEmployee"]);
  });

  it("lists each referenced object once", () => {
    assert.deepEqual(
      scriptObjectRefs("FROM dbo.TEmployee JOIN TEmployee ON TEmployee.Id = dbo.FN_Build()"),
      [
        { schema: "dbo", name: "TEmployee" },
        { schema: "dbo", name: "FN_Build" },
      ],
    );
  });
});

function names(sql: string, type: "alias" | "variable" | "number" | "ident"): string[] {
  return tokenizeSql(sql).flatMap((token) => {
    if (token.type !== type) {
      return [];
    }
    return [token.type === "number" ? token.value : token.name];
  });
}

describe("sql names", () => {
  it("keeps numbers, variables, and national strings intact", () => {
    const sql = "DECLARE @x INT = 1.5\nSELECT @@ROWCOUNT, @x, N'Ann''s', Employee2";
    assert.equal(restored(tokenizeSql(sql)), sql);
    assert.deepEqual(names(sql, "number"), ["1.5"]);
    assert.deepEqual(names(sql, "variable"), ["@x", "@@ROWCOUNT", "@x"]);
  });

  it("marks table aliases and not column labels or lock hints", () => {
    assert.deepEqual(names("FROM dbo.TEmployee e WITH (NOLOCK)", "alias"), ["e"]);
    assert.deepEqual(names("SELECT col AS Label FROM dbo.TEmployee AS e", "alias"), ["e"]);
    assert.deepEqual(names("SELECT e.EmployeeId FROM dbo.TEmployee e", "ident"), ["e"]);
  });

  it("highlights SQL Server built-ins and leaves user procedures alone", () => {
    const sql =
      "SELECT String_agg(concat(cast(Field AS varchar(500))), ',') EXEC sp_helptext N'name' EXEC dbo.sp_executesql @sql EXEC SP_GetEmployee @EmployeeId";
    const builtins = tokenizeSql(sql).flatMap((token) =>
      token.type === "builtin" ? [token.value] : [],
    );
    assert.deepEqual(builtins, [
      "String_agg",
      "concat",
      "cast",
      "sp_helptext",
      "dbo.sp_executesql",
    ]);
    assert.deepEqual(objects(sql), ["dbo.SP_GetEmployee"]);
    assert.equal(restored(tokenizeSql(sql)), sql);
  });

  it("binds parameters, locals, and alias uses", () => {
    const sql = `CREATE PROCEDURE dbo.SP_Demo
  @EmployeeId INT,
  @Name VARCHAR(100) = N'Ann''s' OUTPUT
AS
BEGIN
  DECLARE @x INT, @y VARCHAR(20)
  SELECT @x = @EmployeeId, @@ROWCOUNT
END`;
    const model = bindSql(tokenizeSql(sql));
    const employee = model.symbols.find((symbol) => symbol.name === "@EmployeeId");
    const name = model.symbols.find((symbol) => symbol.name === "@Name");
    const local = model.symbols.find((symbol) => symbol.name === "@x");
    const other = model.symbols.find((symbol) => symbol.name === "@y");
    assert.equal(employee?.kind, "parameter");
    assert.equal(employee?.typeText, "INT");
    assert.equal(employee?.hint, "Input @EmployeeId INT");
    assert.equal(employee?.uses.length, 1);
    assert.equal(name?.typeText, "VARCHAR(100)");
    assert.equal(local?.kind, "local");
    assert.equal(local?.typeText, "INT");
    assert.equal(local?.hint, "Local @x INT, line 6");
    assert.equal(other?.typeText, "VARCHAR(20)");
    assert.equal(
      model.symbols.some((symbol) => symbol.name === "@@ROWCOUNT"),
      false,
    );
    assert.equal(
      model.tokens.some((token) => token.token.type === "variable" && token.kind === "system"),
      true,
    );
  });

  it("resolves alias uses in the same statement and inside a subquery", () => {
    const sql = `SELECT h.Id
FROM dbo.TEmployee h
JOIN (
  SELECT h.Id AS innerId
  FROM dbo.THistory h
) x ON x.innerId = h.Id`;
    const model = bindSql(tokenizeSql(sql));
    const outer = model.symbols.find((symbol) => symbol.target === "dbo.TEmployee");
    const inner = model.symbols.find((symbol) => symbol.target === "dbo.THistory");
    const sub = model.symbols.find((symbol) => symbol.name === "x");
    assert.equal(outer?.uses.length, 2);
    assert.equal(inner?.uses.length, 1);
    assert.equal(sub?.target, "(subquery)");
    assert.equal(sub?.uses.length, 1);
    assert.equal(
      model.symbols.some((symbol) => symbol.name === "innerId"),
      false,
    );
  });

  it("folds begin and case blocks and skips begin tran", () => {
    const sql = [
      "BEGIN",
      "  BEGIN TRAN",
      "    UPDATE dbo.TEmployee SET Name = 1",
      "  COMMIT",
      "  SELECT CASE",
      "    WHEN 1 = 1 THEN 2",
      "    ELSE 3",
      "  END",
      "END",
    ].join("\n");
    const folds = bindSql(tokenizeSql(sql)).folds;
    const tranLine = sql.split("\n").findIndex((line) => line.includes("BEGIN TRAN"));
    assert.equal(
      folds.some((fold) => fold.startLine === tranLine),
      false,
    );
    assert.equal(
      folds.some((fold) => fold.kind === "begin" && fold.startLine === 0 && fold.endLine === 8),
      true,
    );
    assert.equal(
      folds.some((fold) => fold.kind === "case"),
      true,
    );
  });

  it("folds a parenthesized block that spans lines", () => {
    const sql = "SELECT *\nFROM (\n  SELECT 1 AS n\n) x";
    const folds = bindSql(tokenizeSql(sql)).folds.filter((fold) => fold.kind === "paren");
    assert.equal(folds.length > 0, true);
    assert.equal(
      folds.some((fold) => fold.endLine > fold.startLine),
      true,
    );
  });

  it("folds begin try", () => {
    const sql = "BEGIN TRY\n  SELECT 1\nEND TRY";
    const folds = bindSql(tokenizeSql(sql)).folds;
    assert.equal(
      folds.some((fold) => fold.kind === "begin" && fold.startLine === 0),
      true,
    );
  });
});

describe("formatSql", () => {
  it("returns empty input unchanged", () => {
    assert.deepEqual(formatSql(""), { sql: "", warning: null });
    assert.deepEqual(formatSql("   "), { sql: "   ", warning: null });
  });

  it("breaks a long statement and keeps literals and hints", () => {
    const sql =
      "SELECT EmployeeId, EmployerId, AccountNo, BankName, BranchName FROM dbo.TEmployee e WITH (NOLOCK) WHERE Name = N'Ann''s'";
    const formatted = formatSql(sql);
    assert.equal(formatted.warning, null);
    assert.match(formatted.sql, /\n/);
    assert.match(formatted.sql, /N'Ann''s'/);
    assert.match(formatted.sql, /NOLOCK/);
    assert.match(formatted.sql, /SELECT/);
  });
});
