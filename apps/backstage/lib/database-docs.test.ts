import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "vitest";
import {
  currentDatabaseDocs,
  databaseVersions,
  loadDatabaseDocs,
  resolveDatabaseDocLink,
} from "./database-docs.ts";

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "database-docs-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("loadDatabaseDocs", () => {
  it("returns nothing when the tree is missing or empty", () => {
    assert.deepEqual(loadDatabaseDocs(path.join(makeRoot(), "missing")), []);

    const empty = makeRoot();
    mkdirSync(path.join(empty, "hrms"));
    assert.deepEqual(loadDatabaseDocs(empty), []);
  });

  it("loads one page and strips frontmatter", () => {
    const root = makeRoot();
    const directory = path.join(root, "hrms");
    mkdirSync(directory);
    writeFileSync(
      path.join(directory, "SP_Example.md"),
      [
        "---",
        "object: SP_Example",
        "kind: procedure",
        "database: hrms",
        "source: HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_Example.sql",
        "---",
        "",
        "# SP_Example",
        "",
        "Reads one employee.",
        "",
      ].join("\r\n"),
      "utf8",
    );

    const docs = loadDatabaseDocs(root);
    assert.equal(docs.length, 1);
    assert.deepEqual(docs[0]?.slug, ["hrms", "SP_Example"]);
    assert.equal(docs[0]?.database, "hrms");
    assert.equal(docs[0]?.kind, "procedure");
    assert.equal(docs[0]?.title, "SP_Example");
    assert.equal(docs[0]?.content.startsWith("# SP_Example"), true);
    assert.equal(docs[0]?.content.includes("kind:"), false);
    assert.equal(docs[0]?.content.includes("Reads one employee."), true);
    assert.equal(docs[0]?.isArchive, false);
    assert.equal(docs[0]?.lastAnalyzed, undefined);
  });

  it("keeps dated snapshots out of the latest list and offers them as versions", () => {
    const root = makeRoot();
    const directory = path.join(root, "hrms");
    mkdirSync(path.join(directory, "SP_Example"), { recursive: true });
    writeFileSync(
      path.join(directory, "SP_Example.md"),
      "---\nkind: procedure\nlast-analyzed: 2026-10-06\n---\n# SP_Example\n\nLatest.\n",
      "utf8",
    );
    writeFileSync(
      path.join(directory, "SP_Example", "2026-10-01.md"),
      "---\nkind: procedure\nlast-analyzed: 2026-10-01\n---\n# SP_Example\n\nOlder.\n",
      "utf8",
    );
    const docs = loadDatabaseDocs(root);
    const latest = currentDatabaseDocs(docs);
    assert.deepEqual(
      latest.map((doc) => doc.objectName),
      ["SP_Example"],
    );
    assert.equal(latest.find((doc) => doc.objectName === "SP_Example")?.lastAnalyzed, "2026-10-06");
    assert.equal(docs.some((doc) => doc.isArchive && doc.content.includes("Older.")), true);

    const versions = databaseVersions(docs, ["hrms", "SP_Example"]);
    assert.deepEqual(
      versions.map((version) => version.date),
      ["2026-10-06", "2026-10-01"],
    );
    assert.equal(versions[0]?.current, true);
    assert.equal(versions[0]?.href, "/docs/database/hrms/SP_Example");
    assert.equal(versions[1]?.href, "/docs/database/hrms/SP_Example/2026-10-01");
  });

  it("reads kind function from frontmatter", () => {
    const root = makeRoot();
    const directory = path.join(root, "hrms");
    mkdirSync(directory);
    writeFileSync(
      path.join(directory, "FN_Example.md"),
      "---\nkind: function\n---\n# FN_Example\n",
      "utf8",
    );

    const docs = loadDatabaseDocs(root);
    assert.equal(docs[0]?.kind, "function");
    assert.equal(docs[0]?.title, "FN_Example");
  });
});

describe("resolveDatabaseDocLink", () => {
  it("keeps an in-app link and rewrites a sibling markdown link", () => {
    assert.equal(
      resolveDatabaseDocLink("/docs/database/hrms/SP_Child", ["hrms", "SP_Example"]),
      "/docs/database/hrms/SP_Child",
    );
    assert.equal(
      resolveDatabaseDocLink("SP_Child.md", ["hrms", "SP_Example"]),
      "/docs/database/hrms/SP_Child",
    );
    assert.equal(
      resolveDatabaseDocLink("SP_Child.md", ["hrms", "SP_Example", "2026-10-01"]),
      "/docs/database/hrms/SP_Child",
    );
  });
});
