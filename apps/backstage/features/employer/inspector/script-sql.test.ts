import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scriptObjectRefs, tokenizeSql, type SqlToken } from "./script-sql.ts";

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
