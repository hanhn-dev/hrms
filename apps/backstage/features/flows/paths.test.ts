import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "vitest";
import { cursorFileUrl, editorFileUrl, findRepoRoot, readRepoFile, resolveInsideRepo } from "./paths";

describe("request flow paths", () => {
  it("walks up to the folder that contains the repository marker", () => {
    const root = mkdtempSync(path.join(tmpdir(), "flow-db-"));
    const nested = path.join(root, "HRMS-DATABASE", "HRMS", "STOREPROCEDURE");
    mkdirSync(nested, { recursive: true });
    const found = findRepoRoot(nested, "hrms-db");
    assert.equal(found, root);
  });

  it("rejects a folder that is not the SDK package", () => {
    const root = mkdtempSync(path.join(tmpdir(), "flow-sdk-"));
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "other" }));
    assert.equal(findRepoRoot(root, "hrms-sdk"), null);
  });

  it("builds a cursor URL without encoding the drive colon", () => {
    const url = cursorFileUrl("D:\\TDG HRMS DB\\HRMS-DATABASE\\file.sql", 208, 1);
    assert.equal(
      url,
      "cursor://file/D:/TDG%20HRMS%20DB/HRMS-DATABASE/file.sql:208:1",
    );
  });

  it("builds a VS Code URL for the same file", () => {
    assert.equal(
      editorFileUrl("D:\\TDG HRMS DB\\HRMS-DATABASE\\file.sql", 1, 1, "vscode"),
      "vscode://file/D:/TDG%20HRMS%20DB/HRMS-DATABASE/file.sql:1:1",
    );
  });

  it("refuses a relative path that escapes the repository root", () => {
    const root = mkdtempSync(path.join(tmpdir(), "flow-escape-"));
    writeFileSync(path.join(root, "inside.sql"), "SELECT 1;");
    assert.equal(resolveInsideRepo(root, "inside.sql"), path.join(root, "inside.sql"));
    assert.equal(resolveInsideRepo(root, "../inside.sql"), null);
  });

  it("reads a procedure script that stays inside the repository", () => {
    const root = mkdtempSync(path.join(tmpdir(), "flow-script-"));
    writeFileSync(path.join(root, "procedure.sql"), "CREATE PROCEDURE dbo.SP_Example AS BEGIN SELECT 1; END");
    assert.match(readRepoFile(root, "procedure.sql") ?? "", /SP_Example/);
    assert.equal(readRepoFile(root, "../procedure.sql"), null);
  });

  it("reads a UTF-16 procedure script as plain text", () => {
    const root = mkdtempSync(path.join(tmpdir(), "flow-utf16-"));
    writeFileSync(path.join(root, "procedure.sql"), Buffer.from("\uFEFFCREATE PROCEDURE dbo.SP_Example", "utf16le"));
    assert.equal(readRepoFile(root, "procedure.sql"), "CREATE PROCEDURE dbo.SP_Example");
  });
});
