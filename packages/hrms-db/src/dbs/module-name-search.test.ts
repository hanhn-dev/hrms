import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collapsedModuleNameQuery,
  moduleNameSearchTokens,
} from "./module-name-search.ts";

describe("moduleNameSearchTokens", () => {
  it("keeps a single identifier as one token", () => {
    assert.deepEqual(moduleNameSearchTokens("BankDetails"), ["BankDetails"]);
  });

  it("splits a phrase into words", () => {
    assert.deepEqual(moduleNameSearchTokens("Bank Details"), ["Bank", "Details"]);
    assert.deepEqual(moduleNameSearchTokens("My Details Bank Details"), [
      "My",
      "Details",
      "Bank",
    ]);
  });

  it("drops tokens shorter than 2 characters and duplicate words", () => {
    assert.deepEqual(moduleNameSearchTokens("X Bank"), ["Bank"]);
    assert.deepEqual(moduleNameSearchTokens("a b"), []);
    assert.deepEqual(moduleNameSearchTokens("Details details DETAILS"), ["Details"]);
    assert.deepEqual(moduleNameSearchTokens("  Bank   Details "), ["Bank", "Details"]);
  });
});

describe("collapsedModuleNameQuery", () => {
  it("removes spaces so a phrase can rank beside a compact name", () => {
    assert.equal(collapsedModuleNameQuery("Bank Details"), "BankDetails");
    assert.equal(
      collapsedModuleNameQuery("My Details Bank Details"),
      "MyDetailsBankDetails",
    );
    assert.equal(collapsedModuleNameQuery("  Bank   Details "), "BankDetails");
  });
});
