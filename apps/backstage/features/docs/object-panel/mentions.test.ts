import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { objectFromDatabaseHref, objectMention, databaseSourcePath, resolveDatabaseDocHref } from "./mentions.ts";

describe("objectMention", () => {
  it("reads a schema-qualified table, including brackets", () => {
    assert.deepEqual(objectMention("dbo.TEmployee"), { schema: "dbo", name: "TEmployee" });
    assert.deepEqual(objectMention("[dbo].[TEmployee]"), { schema: "dbo", name: "TEmployee" });
  });

  it("opens the table when a code span names a column", () => {
    assert.deepEqual(objectMention("TEmployeeDetail_Fields.FieldID"), {
      schema: "dbo",
      name: "TEmployeeDetail_Fields",
    });
  });

  it("opens a procedure or function named on its own", () => {
    assert.deepEqual(objectMention("SP_CloseEncryptionKey"), {
      schema: "dbo",
      name: "SP_CloseEncryptionKey",
    });
    assert.deepEqual(objectMention("Fn_DecryptData"), { schema: "dbo", name: "Fn_DecryptData" });
  });

  it("leaves temps, variables, system objects, built-ins, and lists as plain text", () => {
    assert.equal(objectMention("#IDs"), null);
    assert.equal(objectMention("@EmployeeIDs"), null);
    assert.equal(objectMention("master.dbo.spt_values"), null);
    assert.equal(objectMention("sys.objects"), null);
    assert.equal(objectMention("sp_executesql"), null);
    assert.equal(objectMention("STRING_AGG"), null);
    assert.equal(objectMention("a.Value"), null);
    assert.equal(objectMention("TEP.ContractEndDate"), null);
    assert.deepEqual(objectMention("TCountry.NICENAME"), { schema: "dbo", name: "TCountry" });
    assert.equal(
      objectMention("#ConvertCustFieldValuesID, #CustomFieldValues"),
      null,
    );
  });
});

describe("databaseSourcePath", () => {
  it("reads a checkout-relative SQL path and ignores object names", () => {
    assert.equal(
      databaseSourcePath(
        "HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_MyDetails_GetEmployeeDetailsForGivenFields.sql",
      ),
      "HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_MyDetails_GetEmployeeDetailsForGivenFields.sql",
    );
    assert.equal(databaseSourcePath("dbo.TEmployee"), null);
    assert.equal(databaseSourcePath("HRMS-DATABASE/../secret.sql"), null);
  });
});
describe("resolveDatabaseDocHref", () => {
  it("keeps an in-app link and rewrites a sibling markdown link", () => {
    assert.equal(
      resolveDatabaseDocHref("/docs/database/hrms/SP_Child", ["hrms", "SP_Example"]),
      "/docs/database/hrms/SP_Child",
    );
    assert.equal(
      resolveDatabaseDocHref("SP_Child.md", ["hrms", "SP_Example"]),
      "/docs/database/hrms/SP_Child",
    );
    assert.equal(
      resolveDatabaseDocHref("SP_Child.md", ["hrms", "SP_Example", "2026-10-01"]),
      "/docs/database/hrms/SP_Child",
    );
  });
});

describe("objectFromDatabaseHref", () => {
  it("reads an object page in the same database, including an archive date", () => {
    assert.deepEqual(
      objectFromDatabaseHref("/docs/database/hrms/Sp_OpenEncryptionKeys", "hrms"),
      { schema: "dbo", name: "Sp_OpenEncryptionKeys" },
    );
    assert.deepEqual(
      objectFromDatabaseHref("/docs/database/hrms/Sp_OpenEncryptionKeys/2026-10-09", "hrms"),
      { schema: "dbo", name: "Sp_OpenEncryptionKeys" },
    );
  });

  it("ignores another database and a non-document link", () => {
    assert.equal(
      objectFromDatabaseHref("/docs/database/hrms-training/SP_Example", "hrms"),
      null,
    );
    assert.equal(objectFromDatabaseHref("https://example.com", "hrms"), null);
  });
});
