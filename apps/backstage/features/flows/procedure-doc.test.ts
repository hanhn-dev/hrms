import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "vitest";
import { databaseSlug, isProcedureName, procedureDocHref } from "./procedure-doc";

describe("procedure docs", () => {
  it("maps an HRMS database folder to the docs slug", () => {
    assert.equal(databaseSlug("HRMS"), "hrms");
    assert.equal(databaseSlug("HRMS_TRAVELNEXPENSE"), "hrms-travelnexpense");
  });

  it("links a procedure to its write-up regardless of letter case", () => {
    const root = mkdtempSync(path.join(tmpdir(), "flow-docs-"));
    mkdirSync(path.join(root, "hrms"));
    writeFileSync(path.join(root, "hrms", "Sp_OpenEncryptionKeys.md"), "# Sp_OpenEncryptionKeys\n");
    assert.equal(
      procedureDocHref("HRMS", "sp_openencryptionkeys", root),
      "/docs/database/hrms/Sp_OpenEncryptionKeys",
    );
  });

  it("returns nothing when that procedure has no write-up", () => {
    const root = mkdtempSync(path.join(tmpdir(), "flow-docs-empty-"));
    mkdirSync(path.join(root, "hrms"));
    assert.equal(procedureDocHref("HRMS", "USP_Missing", root), null);
  });

  it("rejects a procedure name that is not an identifier", () => {
    assert.equal(isProcedureName("SP_CloseEncryptionKey"), true);
    assert.equal(isProcedureName("SP_Close; DROP"), false);
    assert.equal(isProcedureName(""), false);
  });
});
