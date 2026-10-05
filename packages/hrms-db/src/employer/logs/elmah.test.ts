import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ELMAH_LIST_COLUMNS, extractElmahStack, shortExceptionType } from "./elmah.ts";

describe("ELMAH_LIST_COLUMNS", () => {
  it("does not select the raw error document", () => {
    assert.equal(ELMAH_LIST_COLUMNS.toLowerCase().includes("allxml"), false);
  });
});

describe("extractElmahStack", () => {
  it("returns the detail attribute and drops form and cookie values", () => {
    const xml = `<error detail="System.Exception: boom&#xA;   at Foo.Bar()" user="00002"><form><item name="Password">secret-value</item></form><cookies><item name="auth">cookie-secret</item></cookies></error>`;
    const stack = extractElmahStack(xml);
    assert.match(stack, /at Foo\.Bar\(\)/);
    assert.equal(stack.includes("secret-value"), false);
    assert.equal(stack.includes("cookie-secret"), false);
  });

  it("says when no stack was stored", () => {
    assert.equal(extractElmahStack("<error />"), "No stack trace was stored.");
  });
});

describe("shortExceptionType", () => {
  it("keeps the last segment", () => {
    assert.equal(
      shortExceptionType("System.Data.SqlClient.SqlException"),
      "SqlException",
    );
    assert.equal(shortExceptionType(null), "Exception");
  });
});
