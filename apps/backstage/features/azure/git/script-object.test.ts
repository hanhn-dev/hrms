import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  databaseScriptPair,
  databaseScriptStatus,
  readScriptObject,
  scriptBodiesMatch,
} from "./script-object.ts";

const procedure = `SET ANSI_NULLS ON
GO
-- CREATE OR ALTER PROCEDURE dbo.OldName
CREATE OR ALTER  Procedure [dbo].[SP_Mydetails_Enhanced_UpdEducationDet]
(
@EducationId Int
)`;

describe("readScriptObject", () => {
  it("reads the first procedure, view, or function header", () => {
    assert.deepEqual(readScriptObject(procedure, "/HRMS-DATABASE/HRMS/DML/note.sql"), {
      schema: "dbo",
      name: "SP_Mydetails_Enhanced_UpdEducationDet",
    });
    assert.deepEqual(
      readScriptObject("CREATE   VIEW [dbo].[vw_CertificationReports]\nAS\nSELECT 1", "/x.sql"),
      { schema: "dbo", name: "vw_CertificationReports" },
    );
    assert.deepEqual(
      readScriptObject("CREATE OR ALTER FUNCTION dbo.FN_SEP_ResignationPullbackState (@Id INT)\nRETURNS TABLE", "/x.sql"),
      { schema: "dbo", name: "FN_SEP_ResignationPullbackState" },
    );
  });

  it("ignores a header that is only in a comment", () => {
    const commented = "/* CREATE OR ALTER PROCEDURE dbo.Hidden */\nSELECT 1";
    assert.equal(readScriptObject(commented, "/HRMS-DATABASE/HRMS/DML/note.sql"), null);
  });

  it("uses the file name for a module path with no header", () => {
    assert.deepEqual(readScriptObject("ALTER TABLE dbo.TEmployee ADD Col int", "/HRMS-DATABASE/HRMS/STOREPROCEDURE/162833/SP_Foo.sql"), {
      schema: "dbo",
      name: "SP_Foo",
    });
    assert.deepEqual(
      readScriptObject("-- notes", "/HRMS-DATABASE/HRMS/FUNCTIONS/[Fn_GetEmployeeRecoveryFromClearance].sql"),
      { schema: "dbo", name: "Fn_GetEmployeeRecoveryFromClearance" },
    );
    assert.equal(readScriptObject("UPDATE dbo.TEmployee SET Name = Name", "/HRMS-DATABASE/HRMS/DML/Update.sql"), null);
  });
});

describe("scriptBodiesMatch", () => {
  it("treats create or alter, comments, and spacing as the same body", () => {
    const live = "CREATE Procedure [dbo].[SP_Mydetails_Enhanced_UpdEducationDet]\n(\n@EducationId Int\n)";
    assert.equal(scriptBodiesMatch(procedure, live), true);
    assert.equal(
      scriptBodiesMatch("ALTER PROCEDURE dbo.SP_Foo\nAS\nSELECT 1", "CREATE PROC dbo.SP_Foo AS SELECT 1"),
      true,
    );
    assert.equal(scriptBodiesMatch("CREATE PROCEDURE dbo.SP_Foo AS SELECT 1", "CREATE PROCEDURE dbo.SP_Foo AS SELECT 2"), false);
  });
});

describe("databaseScriptStatus", () => {
  it("names the branch and environment in the status", () => {
    assert.deepEqual(
      databaseScriptStatus("Staging", "QA", "CREATE PROCEDURE dbo.SP_Foo AS SELECT 1", "CREATE PROCEDURE dbo.SP_Foo AS SELECT 1"),
      { match: true, message: "The Staging script matches the QA database." },
    );
    assert.equal(
      databaseScriptStatus("Staging", "UAT", "CREATE PROCEDURE dbo.SP_Foo AS SELECT 1", "CREATE PROCEDURE dbo.SP_Foo AS SELECT 2").message,
      "The Staging script differs from the UAT database.",
    );
  });
});

describe("databaseScriptPair", () => {
  it("keeps the branch script on the left and the database script on the right", () => {
    const pair = databaseScriptPair("left", "right", true);
    assert.equal(pair.base.content, "left");
    assert.equal(pair.base.truncated, true);
    assert.equal(pair.target.content, "right");
    assert.equal(pair.target.missing, false);
  });
});
